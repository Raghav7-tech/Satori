import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from backend.api.main import app
from backend.core.git_utils import OversizedRepositoryError

# Disable rate limiting for tests
app.state.limiter.enabled = False

client = TestClient(app)

# Helper mock for MongoDB
class MockCollection:
    def __init__(self, data):
        self.data = data
        
    async def find_one(self, query):
        _id = query.get("_id")
        return self.data.get(_id)
        
    async def update_one(self, query, update, upsert=False):
        pass

@pytest.fixture
def mock_db():
    data = {
        "owner/repo_done": {"status": "done", "last_commit_sha": "abc1234"},
        "owner/repo_pending": {"status": "pending"},
        "owner/repo_failed": {"status": "failed", "error_message": "Invalid URL"}
    }
    with patch("backend.api.routes.get_repos_collection", return_value=MockCollection(data)):
        yield

@patch("backend.api.routes.get_latest_commit_sha")
@patch("backend.api.routes.check_repo_size_limits")
@patch("backend.api.routes.task_queue.enqueue")
def test_analyze_repo_new(mock_enqueue, mock_check, mock_sha, mock_db):
    mock_sha.return_value = "newsha123"
    
    response = client.post("/repos/analyze", json={"url": "https://github.com/owner/repo_new"})
    assert response.status_code == 200
    assert response.json()["status"] == "pending"
    assert response.json()["job_id"] == "owner/repo_new"
    
    mock_check.assert_called_once_with("owner", "repo_new")
    mock_enqueue.assert_called_once()

@patch("backend.api.routes.get_latest_commit_sha")
@patch("backend.api.routes.check_repo_size_limits")
@patch("backend.api.routes.task_queue.enqueue")
def test_analyze_repo_reanalysis_bypass(mock_enqueue, mock_check, mock_sha, mock_db):
    mock_sha.return_value = "abc1234"  # matches repo_done
    
    # First call: Enqueue it (mocking that it's a new repo not yet in DB)
    with patch("backend.api.routes.get_repos_collection") as mock_get_col:
        mock_get_col.return_value = MockCollection({}) # Empty DB
        resp1 = client.post("/repos/analyze", json={"url": "https://github.com/owner/repo_done"})
        assert resp1.status_code == 200
        assert mock_enqueue.call_count == 1
        
    # Second call: Request same repo, now it exists in DB with same SHA
    resp2 = client.post("/repos/analyze", json={"url": "https://github.com/owner/repo_done"})
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "done"
    
    # Assert enqueue was NOT called again
    assert mock_enqueue.call_count == 1

@patch("backend.api.routes.check_repo_size_limits")
def test_analyze_repo_timeout(mock_check, mock_db):
    from backend.core.git_utils import GitUtilsError
    mock_check.side_effect = GitUtilsError("GitHub API timeout while checking repository size.")
    
    response = client.post("/repos/analyze", json={"url": "https://github.com/owner/repo_timeout"})
    assert response.status_code == 503
    assert "timeout" in response.json()["detail"]

@patch("backend.api.routes.get_latest_commit_sha")
def test_analyze_repo_sha_timeout(mock_sha, mock_db):
    from backend.core.git_utils import GitUtilsError
    # We must ensure the repo exists in DB so it actually triggers the SHA check
    with patch("backend.api.routes.get_repos_collection") as mock_get_col:
        mock_get_col.return_value = MockCollection({"owner/repo_timeout": {"status": "done"}})
        mock_sha.side_effect = GitUtilsError("GitHub API timeout while fetching latest SHA.")
        
        response = client.post("/repos/analyze", json={"url": "https://github.com/owner/repo_timeout"})
        assert response.status_code == 503
        assert "timeout" in response.json()["detail"]

@patch("backend.api.routes.get_latest_commit_sha")
@patch("backend.api.routes.check_repo_size_limits")
def test_analyze_repo_oversized(mock_check, mock_sha, mock_db):
    mock_check.side_effect = OversizedRepositoryError("Repo too big")
    
    response = client.post("/repos/analyze", json={"url": "https://github.com/owner/repo_huge"})
    assert response.status_code == 400
    assert "Repo too big" in response.json()["detail"]

def test_analyze_repo_invalid_url():
    response = client.post("/repos/analyze", json={"url": "https://google.com"})
    assert response.status_code == 422 # Pydantic validation error

def test_get_graph_done(mock_db):
    response = client.get("/repos/owner/repo_done/graph")
    assert response.status_code == 200
    
def test_get_graph_pending(mock_db):
    response = client.get("/repos/owner/repo_pending/graph")
    assert response.status_code == 202
    assert response.json()["detail"]["status"] == "pending"
    
def test_get_graph_failed(mock_db):
    response = client.get("/repos/owner/repo_failed/graph")
    assert response.status_code == 422
    assert response.json()["detail"] == "Invalid URL"
    
def test_get_graph_not_found(mock_db):
    response = client.get("/repos/owner/repo_notexist/graph")
    assert response.status_code == 404
