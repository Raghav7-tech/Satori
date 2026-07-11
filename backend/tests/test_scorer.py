from backend.core.scorer import calculate_risk_scores

def test_calculate_risk_scores_empty():
    res, grade, summary = calculate_risk_scores({})
    assert res == {}
    assert grade == "A"

def test_calculate_risk_scores_basic():
    stats = {
        "file1.py": {"churn_score": 100, "bug_count": 0, "commit_count": 10, "bus_factor": 1},
        "file2.py": {"churn_score": 100, "bug_count": 5, "commit_count": 10, "bus_factor": 1},
        "file3.py": {"churn_score": 50, "bug_count": 2, "commit_count": 10, "bus_factor": 2},
    }
    
    res, grade, summary = calculate_risk_scores(stats)
    
    assert res["file1.py"]["risk_score"] == 17 
    assert res["file2.py"]["risk_score"] == 100
    assert res["file3.py"]["risk_score"] == 21 

def test_calculate_risk_scores_zero_bus_factor():
    stats = {
        "file1.py": {"churn_score": 10, "bug_count": 10, "commit_count": 10, "bus_factor": 0},
    }
    res, grade, summary = calculate_risk_scores(stats)
    assert res["file1.py"]["raw_risk"] == 505.0
    assert res["file1.py"]["risk_score"] == 100

def test_calculate_risk_scores_fewer_than_5_files():
    stats = {
        "file1.py": {"churn_score": 100, "bug_count": 10, "commit_count": 1, "bus_factor": 1},
    }
    res, grade, summary = calculate_risk_scores(stats)
    assert grade == "F"
    assert res["file1.py"]["risk_score"] == 100

def test_calculate_risk_scores_grade_bands():
    def create_mock_stats(target_scores):
        stats = {}
        for i, t in enumerate(target_scores):
            stats[f"f{i}"] = {"churn_score": t * 2, "bug_count": 0, "commit_count": 1, "bus_factor": 1}
        return stats

    stats_a = create_mock_stats([100, 0, 0, 0, 0]) 
    _, grade_a, _ = calculate_risk_scores(stats_a)
    assert grade_a == "A"

    stats_b = create_mock_stats([100, 100, 0, 0, 0]) 
    _, grade_b, _ = calculate_risk_scores(stats_b)
    assert grade_b == "B"

    stats_c = create_mock_stats([100, 100, 100, 0, 0]) 
    _, grade_c, _ = calculate_risk_scores(stats_c)
    assert grade_c == "C"

    stats_d = create_mock_stats([100, 100, 100, 100, 0]) 
    _, grade_d, _ = calculate_risk_scores(stats_d)
    assert grade_d == "D"

    stats_f = create_mock_stats([100, 100, 100, 100, 100]) 
    _, grade_f, _ = calculate_risk_scores(stats_f)
    assert grade_f == "F"

