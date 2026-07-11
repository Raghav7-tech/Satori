import re
import git
from typing import Dict, Any, Tuple
from pydriller import Repository

BUG_FIX_REGEX = re.compile(
    r"(?i)\b(fix|fixes|fixed|bug|bugfix|patch)\b|"
    r"(#\d+)|"
    r"(closes?\s+#\d+)|"
    r"(resolves?|resolved)\s+#\d+"
)

def calculate_bus_factor(authors_churn: Dict[str, int], total_churn: int) -> int:
    """Calculate the bus factor for a file."""
    if total_churn == 0 or not authors_churn:
        return 1
    critical_authors = sum(1 for a_churn in authors_churn.values() if a_churn >= 0.15 * total_churn)
    return max(1, critical_authors)

def mine_repository(repo_path: str) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, Dict[str, Any]]]:
    """
    Mine the local repository at repo_path.
    Returns a tuple of (file_stats, daily_stats).
    """
    file_stats = {}
    file_author_churn = {}
    daily_stats = {}

    for commit in Repository(repo_path).traverse_commits():
        is_bug_fix = bool(BUG_FIX_REGEX.search(commit.msg))
        
        msg_words = re.findall(r'\b\w+\b', commit.msg.lower())
        commit_day = commit.committer_date.strftime('%Y-%m-%d')
        
        if commit_day not in daily_stats:
            daily_stats[commit_day] = {
                "commit_count": 0,
                "churn_score": 0,
                "bug_count": 0,
            }
            
        daily_stats[commit_day]["commit_count"] += 1
        if is_bug_fix:
            daily_stats[commit_day]["bug_count"] += 1
        
        try:
            modified_files = commit.modified_files
        except git.exc.GitCommandError:
            # Specific exception raised when git diff-tree hits the shallow boundary
            continue
            
        for modified_file in modified_files:
            churn = modified_file.added_lines + modified_file.deleted_lines
            daily_stats[commit_day]["churn_score"] += churn
            
            # We only track metrics for files that still exist
            if not modified_file.new_path:
                continue
                
            path = modified_file.new_path.replace("\\", "/")
            
            # Exclude non-code document files (keep config/CI as they pose risk)
            if path.endswith((".md", ".rst", ".txt", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "Pipfile.lock", "composer.lock")):
                continue # normalize paths
            
            if path not in file_stats:
                file_stats[path] = {
                    "churn_score": 0,
                    "bug_count": 0,
                    "commit_count": 0,
                    "last_modified_at": commit.committer_date.isoformat(),
                    "total_words": 0,
                    "unique_words_set": set(),
                    "active_days_set": set(),
                }
                file_author_churn[path] = {}
                
            file_stats[path]["last_modified_at"] = commit.committer_date.isoformat()
            file_stats[path]["commit_count"] += 1
            
            churn = modified_file.added_lines + modified_file.deleted_lines
            file_stats[path]["churn_score"] += churn
            
            if is_bug_fix:
                file_stats[path]["bug_count"] += 1
                
            author_name = commit.author.name
            if author_name not in file_author_churn[path]:
                file_author_churn[path][author_name] = 0
            file_author_churn[path][author_name] += churn
            
            file_stats[path]["total_words"] += len(msg_words)
            file_stats[path]["unique_words_set"].update(msg_words)
            file_stats[path]["active_days_set"].add(commit_day)
            
    # Calculate bus_factor and contributor_count
    for path, stats in file_stats.items():
        authors = file_author_churn.get(path, {})
        stats["contributor_count"] = len(authors)
        
        total_churn = stats["churn_score"]
        stats["bus_factor"] = calculate_bus_factor(authors, total_churn)
        
        # Resolve sets to integers for JSON serialization / downstream use
        stats["unique_words"] = len(stats["unique_words_set"])
        stats["active_days"] = len(stats["active_days_set"])
        
        # Clean up sets
        del stats["unique_words_set"]
        del stats["active_days_set"]
            
    return file_stats, daily_stats

import os
from datetime import datetime, timezone

def calculate_project_maturity(repo_path: str, latest_commit_date: datetime) -> int:
    score = 0
    
    # 1. README (20 pts)
    if os.path.exists(os.path.join(repo_path, "README.md")) or os.path.exists(os.path.join(repo_path, "README.txt")) or os.path.exists(os.path.join(repo_path, "README.rst")):
        score += 20
        
    # 2. CI/CD (25 pts)
    if os.path.exists(os.path.join(repo_path, ".github/workflows")) or os.path.exists(os.path.join(repo_path, ".circleci")) or os.path.exists(os.path.join(repo_path, ".travis.yml")) or os.path.exists(os.path.join(repo_path, ".gitlab-ci.yml")):
        score += 25
        
    # 3. Tests (25 pts)
    has_tests = False
    if os.path.exists(os.path.join(repo_path, "tests")) or os.path.exists(os.path.join(repo_path, "spec")):
        has_tests = True
    else:
        for root, dirs, files in os.walk(repo_path):
            if 'test' in root.lower() or any('test' in f.lower() or 'spec' in f.lower() for f in files):
                has_tests = True
                break
            if root != repo_path and len(root[len(repo_path):].split(os.sep)) > 2:
                # Don't walk too deep to save time
                dirs.clear()
    
    if has_tests:
        score += 25
        
    # 4. Recency (30 pts)
    if latest_commit_date:
        now = datetime.now(timezone.utc)
        # Ensure latest_commit_date has timezone info
        if latest_commit_date.tzinfo is None:
            latest_commit_date = latest_commit_date.replace(tzinfo=timezone.utc)
            
        months_ago = (now - latest_commit_date).days / 30.0
        if months_ago < 1:
            score += 30
        elif months_ago < 3:
            score += 20
        elif months_ago < 6:
            score += 10
        elif months_ago < 12:
            score += 5
            
    return score
