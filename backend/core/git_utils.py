import os
import re
import urllib.parse
from typing import Tuple
import requests
import git

class GitUtilsError(Exception):
    pass

class OversizedRepositoryError(GitUtilsError):
    pass

class InvalidUrlError(GitUtilsError):
    pass

def parse_github_url(url: str) -> Tuple[str, str]:
    """Parse a github URL and return (owner, repo)."""
    parsed = urllib.parse.urlparse(url)
    if parsed.netloc not in ("github.com", "www.github.com"):
        raise InvalidUrlError("Not a valid GitHub URL")
    
    parts = [p for p in parsed.path.split("/") if p]
    if len(parts) > 2 and parts[-1] == "": 
        parts = parts[:-1]
    if len(parts) != 2:
        raise InvalidUrlError("Invalid GitHub repository path")
    
    owner = parts[0]
    repo = parts[1]
    if repo.endswith(".git"):
        repo = repo[:-4]
        
    if not re.match(r"^[a-zA-Z0-9_.-]+$", owner) or not re.match(r"^[a-zA-Z0-9_.-]+$", repo):
         raise InvalidUrlError("Invalid characters in owner or repo")
         
    return owner, repo

def get_latest_commit_sha(owner: str, repo: str) -> str | None:
    """Fetch the latest commit SHA for a repository's default branch. Uses 3s timeout."""
    url = f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=1"
    headers = {"Accept": "application/vnd.github.v3+json"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    try:
        resp = requests.get(url, headers=headers, timeout=3)
        resp.raise_for_status()
        commits = resp.json()
        if commits and isinstance(commits, list):
            return commits[0].get("sha")
        return None
    except requests.exceptions.Timeout:
        raise GitUtilsError("GitHub API timeout while fetching latest SHA.")
    except requests.RequestException as e:
        raise GitUtilsError(f"Failed to fetch commit SHA: {e}")

def check_repo_size_limits(owner: str, repo: str):
    """Check via GitHub API if repo exceeds 5000 commits."""
    url = f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=1"
    headers = {"Accept": "application/vnd.github.v3+json"}
    
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        resp = requests.get(url, headers=headers, timeout=3)
    except requests.exceptions.Timeout:
        raise GitUtilsError("GitHub API timeout while checking repository size.")
    except requests.RequestException as e:
        raise GitUtilsError(f"Network error checking repo limits: {e}")
        
    if resp.status_code == 404:
        raise GitUtilsError("Repository not found or is private")
    if resp.status_code != 200:
        return # Proceed on API limit (best effort)

    link_header = resp.headers.get("Link")
    if link_header:
        match = re.search(r'page=(\d+)>; rel="last"', link_header)
        if match:
            commit_count = int(match.group(1))
            if commit_count > 5000:
                raise OversizedRepositoryError(f"Repository exceeds 5000 commits (has {commit_count}).")
    else:
        # If no Link header is present, the results fit on a single page (<= 1 commit since per_page=1).
        # We can safely proceed without raising an error.
        pass

def clone_repo_safely(url: str, temp_dir: str):
    """Clone a repo safely into temp_dir using GitPython with strict limits."""
    owner, repo = parse_github_url(url)
    check_repo_size_limits(owner, repo)
    
    try:
        # Use git wrapper without kill_after_timeout due to Windows limitations
        g = git.cmd.Git()
        g.clone(url, temp_dir, shallow_since="12 months ago")
    except git.exc.GitCommandError as e:
        # Fallback to full clone if shallow-since fails (e.g. no commits in 12 months)
        import shutil
        # Wipe the directory contents that the failed clone might have left behind
        for item in os.listdir(temp_dir):
            item_path = os.path.join(temp_dir, item)
            if os.path.isfile(item_path):
                os.remove(item_path)
            elif os.path.isdir(item_path):
                shutil.rmtree(item_path)
        try:
            g = git.cmd.Git()
            g.clone(url, temp_dir)
        except git.exc.GitCommandError as e2:
            raise GitUtilsError(f"Clone failed on fallback: {e2}")
