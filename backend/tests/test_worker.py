import pytest
from unittest.mock import patch, MagicMock
from backend.worker.tasks import analyze_task
from backend.core.git_utils import OversizedRepositoryError, GitUtilsError
import git

@patch("backend.worker.tasks.update_db_status")
@patch("backend.worker.tasks.clone_repo_safely")
@patch("backend.worker.tasks.mine_repository")
@patch("backend.worker.tasks.extract_dependencies")
@patch("backend.worker.tasks.calculate_risk_scores")
@patch("backend.worker.tasks.shutil.rmtree")
@patch("backend.worker.tasks.get_latest_commit_sha")
def test_analyze_task_success(mock_sha, mock_rmtree, mock_calc, mock_extract, mock_mine, mock_clone, mock_update):
    mock_mine.return_value = {"file1": {"churn": 10}}
    mock_extract.return_value = ["dep1"]
    mock_calc.return_value = ({"file1": {"risk": 100, "dependencies": ["dep1"]}}, "C", "Noticeable debt")
    mock_sha.return_value = "newsha123"
    
    analyze_task("owner/repo", "https://github.com/owner/repo")
    
    # Check status updates
    assert mock_update.call_count == 2
    mock_update.assert_any_call("owner/repo", "processing")
    mock_update.assert_any_call("owner/repo", "done", graph_data=[{"path": "file1", "risk": 100, "dependencies": ["dep1"]}], last_commit_sha="newsha123", repo_health_grade="C", repo_health_summary="Noticeable debt")
    
    # Check cleanup happens
    mock_rmtree.assert_called_once()

@patch("backend.worker.tasks.update_db_status")
@patch("backend.worker.tasks.clone_repo_safely")
@patch("backend.worker.tasks.shutil.rmtree")
def test_analyze_task_git_error(mock_rmtree, mock_clone, mock_update):
    mock_clone.side_effect = git.exc.GitCommandError("clone", 1, b"", b"timeout")
    
    analyze_task("owner/repo", "url")
    
    # Should be failed
    # Get the actual message to avoid fragile string matching on the Gitpython exception
    assert mock_update.call_args[0][0] == "owner/repo"
    assert mock_update.call_args[0][1] == "failed"
    assert "Git operation failed" in mock_update.call_args[0][2]
    
    # Check cleanup STILL happens
    mock_rmtree.assert_called_once()

@patch("backend.worker.tasks.update_db_status")
@patch("backend.worker.tasks.clone_repo_safely")
@patch("backend.worker.tasks.shutil.rmtree")
def test_analyze_task_unexpected_error(mock_rmtree, mock_clone, mock_update):
    mock_clone.side_effect = Exception("Out of memory")
    
    analyze_task("owner/repo", "url")
    
    mock_update.assert_any_call("owner/repo", "failed", "Internal analysis error: Out of memory")
    
    mock_rmtree.assert_called_once()
