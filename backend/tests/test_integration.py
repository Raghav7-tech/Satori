import os
import tempfile
import shutil
import pytest
from core.git_utils import clone_repo_safely
from core.miner import mine_repository
from core.parser import extract_dependencies
from core.scorer import calculate_risk_scores

def test_full_pipeline_integration():
    url = "https://github.com/pallets/click"
    
    # Use a temporary directory for cloning
    temp_dir = tempfile.mkdtemp()
    
    try:
        # 1. Clone
        clone_repo_safely(url, temp_dir)
        assert os.path.exists(os.path.join(temp_dir, ".git"))
        
        # 2. Mine
        stats = mine_repository(temp_dir)
        assert len(stats) > 0
        
        # 3. Parse dependencies for one of the files we know exists
        # e.g., 'src/click/core.py' usually exists in click
        sample_file = os.path.join(temp_dir, "src", "click", "core.py")
        if os.path.exists(sample_file):
            deps = extract_dependencies(sample_file, temp_dir)
            assert isinstance(deps, list)
            
        # 4. Score
        scored_stats, grade, summary = calculate_risk_scores(stats)
        # Check that risk scores are normalized
        max_score = max([s.get("risk_score", 0) for s in scored_stats.values()])
        assert max_score <= 100
        
    finally:
        # Cleanup
        # Note: sometimes windows locks .git files, but best effort
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass
