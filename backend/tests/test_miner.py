from core.miner import BUG_FIX_REGEX, calculate_bus_factor

def test_bug_fix_regex():
    assert BUG_FIX_REGEX.search("fix something")
    assert BUG_FIX_REGEX.search("this is a bugfix")
    assert BUG_FIX_REGEX.search("patch applied")
    assert BUG_FIX_REGEX.search("closes #123")
    assert BUG_FIX_REGEX.search("fixes #45")
    assert BUG_FIX_REGEX.search("resolve #999")
    
    assert not BUG_FIX_REGEX.search("refactor something")
    assert not BUG_FIX_REGEX.search("add new feature")
    # "#123" by itself should match    # Isolated issue references match correctly
    assert BUG_FIX_REGEX.search("see issue #123")

def test_calculate_bus_factor():
    # Empty or zero churn
    assert calculate_bus_factor({}, 0) == 1
    assert calculate_bus_factor({"author1": 0}, 0) == 1
    
    # Single author
    assert calculate_bus_factor({"author1": 100}, 100) == 1
    
    # Two authors, both critical (>= 15%)
    assert calculate_bus_factor({"author1": 80, "author2": 20}, 100) == 2
    
    # Three authors, only one critical
    # A=86%, B=7%, C=7%
    assert calculate_bus_factor({"author1": 86, "author2": 7, "author3": 7}, 100) == 1
    
    # Lots of authors, all below 15% except one
    dist = {"author1": 30}
    for i in range(10): dist[f"other{i}"] = 7
    assert calculate_bus_factor(dist, 100) == 1
