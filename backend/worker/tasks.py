import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

import shutil
import tempfile
import logging
from pymongo import MongoClient
import git

from backend.core.git_utils import clone_repo_safely, OversizedRepositoryError, InvalidUrlError, GitUtilsError, parse_github_url, get_latest_commit_sha
from backend.core.miner import mine_repository
from backend.core.parser import extract_dependencies
from backend.core.scorer import calculate_risk_scores, calculate_daily_activity

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_sync_db():
    # We use sync PyMongo in the worker since RQ is synchronous
    mongo_uri = os.environ.get("MONGODB_URI", os.environ.get("MONGO_URI", "mongodb://localhost:27017"))
    db_name = os.environ.get("MONGO_DB_NAME", "satori_db")
    client = MongoClient(mongo_uri)
    return client[db_name]

def update_db_status(repo_id: str, status: str, error_message: str = None, graph_data: dict = None, last_commit_sha: str = None, repo_health_grade: str = None, repo_health_summary: str = None, daily_activity: list = None, project_maturity_score: int = None, is_zombie_repo: bool = None):
    db = get_sync_db()
    update_doc = {"status": status}
    if error_message:
        update_doc["error_message"] = error_message
    if graph_data:
        update_doc["files"] = graph_data
    if last_commit_sha:
        update_doc["last_commit_sha"] = last_commit_sha
    if repo_health_grade:
        update_doc["repo_health_grade"] = repo_health_grade
    if repo_health_summary:
        update_doc["repo_health_summary"] = repo_health_summary
    if daily_activity:
        update_doc["daily_activity"] = daily_activity
    if project_maturity_score is not None:
        update_doc["project_maturity_score"] = project_maturity_score
    if is_zombie_repo is not None:
        update_doc["is_zombie_repo"] = is_zombie_repo
        
    db.repos.update_one({"_id": repo_id}, {"$set": update_doc})

def analyze_task(repo_id: str, url: str):
    logger.info(f"Starting analysis for {repo_id}")
    update_db_status(repo_id, "processing")
    
    temp_dir = tempfile.mkdtemp()
    try:
        # Phase 1 Core Engine Pipeline
        clone_repo_safely(url, temp_dir)
        file_stats_dict, daily_stats = mine_repository(temp_dir)
        
        for file_path, file_stats in file_stats_dict.items():
            full_path = os.path.join(temp_dir, file_path)
            file_stats["dependencies"] = extract_dependencies(full_path, temp_dir)
            
            # Vibe Score features
            code_lines = 0
            comment_lines = 0
            if os.path.exists(full_path) and full_path.endswith('.py'):
                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                        lines = f.readlines()
                    in_multiline = False
                    for line in lines:
                        stripped = line.strip()
                        if not stripped: continue
                        if stripped.startswith('"""') or stripped.startswith("'''"):
                            if stripped.count('"""') == 2 or stripped.count("'''") == 2:
                                comment_lines += 1
                            else:
                                in_multiline = not in_multiline
                                comment_lines += 1
                        elif in_multiline:
                            comment_lines += 1
                        elif stripped.startswith("#"):
                            comment_lines += 1
                        else:
                            code_lines += 1
                except Exception:
                    pass
            file_stats["code_lines"] = code_lines
            file_stats["comment_lines"] = comment_lines
            
        final_stats, repo_health_grade, repo_health_summary = calculate_risk_scores(file_stats_dict)
        daily_activity = calculate_daily_activity(daily_stats)
        
        # Project Maturity and Zombie Repo checks
        from datetime import datetime, timezone
        from backend.core.miner import calculate_project_maturity
        
        latest_commit_date = None
        if daily_stats:
            latest_date_str = max(daily_stats.keys())
            try:
                latest_commit_date = datetime.strptime(latest_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except ValueError:
                pass
                
        maturity_score = calculate_project_maturity(temp_dir, latest_commit_date)
        
        avg_bus_factor = 1.0
        if file_stats_dict:
            total_bus_factor = sum(stats.get("bus_factor", 1) for stats in file_stats_dict.values())
            avg_bus_factor = total_bus_factor / len(file_stats_dict)
            
        # Zombie Repo Threshold: maturity < 30 AND avg bus factor > 0.8
        # Wait, if bus factor is 1 for all files, avg_bus_factor = 1.0. 
        # The prompt says: "average bus factor > 0.8 (meaning >80% of files have a bus factor of 1)" - Wait, if 80% have bus factor 1 and 20% have bus factor 2, the average is 0.8*1 + 0.2*2 = 1.2. 
        # A bus factor of 1 means bad. If we want "average bus factor > 0.8", maybe the user meant "proportion of files with bus_factor == 1 is > 0.8"? Yes, that makes more sense! Let's calculate the proportion.
        bus_factor_1_count = sum(1 for stats in file_stats_dict.values() if stats.get("bus_factor", 1) == 1)
        bus_factor_1_ratio = bus_factor_1_count / len(file_stats_dict) if file_stats_dict else 1.0
        
        is_zombie_repo = bool(maturity_score < 30 and bus_factor_1_ratio > 0.8)
        
        # Convert output to list format for frontend
        files_array = [{"path": k, **v} for k, v in final_stats.items()]
        
        # Sort by risk to find top 20 riskiest files
        files_array.sort(key=lambda x: x.get("risk_score", 0), reverse=True)
        
        # Read contents for top 20 files (cap at 1000 lines or 50,000 characters)
        for f in files_array[:20]:
            file_path = os.path.join(temp_dir, f["path"])
            content = ""
            try:
                if os.path.exists(file_path):
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as file_obj:
                        lines = []
                        char_count = 0
                        for _ in range(1000):
                            line = file_obj.readline()
                            if not line:
                                break
                            lines.append(line)
                            char_count += len(line)
                            if char_count > 50000:
                                break
                        
                        content = "".join(lines)
                        
                        # If there's more file left or we hit the char limit, append truncation marker
                        if file_obj.readline() or char_count > 50000:
                            content += "\n// ... [TRUNCATED - EXCEEDS 1000 LINES OR 50K CHARS]"
            except Exception:
                pass
            f["content"] = content
            
        # Get the latest SHA to store for future re-analysis bypasses
        owner, repo = parse_github_url(url)
        latest_sha = get_latest_commit_sha(owner, repo)
        
        update_db_status(repo_id, "done", graph_data=files_array, last_commit_sha=latest_sha, repo_health_grade=repo_health_grade, repo_health_summary=repo_health_summary, daily_activity=daily_activity, project_maturity_score=maturity_score, is_zombie_repo=is_zombie_repo)
        logger.info(f"Analysis complete for {repo_id}")
        
    except OversizedRepositoryError as e:
        logger.warning(f"Oversized repo {repo_id}: {e}")
        update_db_status(repo_id, "failed", str(e))
    except InvalidUrlError as e:
        logger.warning(f"Invalid URL {repo_id}: {e}")
        update_db_status(repo_id, "failed", f"Invalid URL: {e}")
    except git.exc.GitCommandError as e:
        logger.error(f"Git clone error for {repo_id}: {e}")
        update_db_status(repo_id, "failed", f"Git operation failed: {e}")
    except GitUtilsError as e:
        logger.error(f"Git utils error for {repo_id}: {e}")
        update_db_status(repo_id, "failed", f"Git error: {e}")
    except Exception as e:
        logger.exception(f"Unexpected error during analysis for {repo_id}")
        update_db_status(repo_id, "failed", f"Internal analysis error: {str(e)}")
    finally:
        logger.info(f"Cleaning up temp dir for {repo_id}")
        shutil.rmtree(temp_dir, ignore_errors=True)
