from typing import Dict, Any, Tuple, List# Weighting constants for the additive risk formula
# Churn establishes a baseline, but bug fixes act as heavy multipliers for risk.
CHURN_WEIGHT = 0.5
BUG_WEIGHT = 50.0

def calculate_repo_health(average_risk: float) -> Tuple[str, str]:
    if average_risk <= 20:
        return "A", "Very healthy repository with low technical debt."
    elif average_risk <= 40:
        return "B", "Standard repository with manageable technical debt."
    elif average_risk <= 60:
        return "C", "Noticeable technical debt detected in core modules."
    elif average_risk <= 80:
        return "D", "High technical debt detected. Architectural drag is likely."
    else:
        return "F", "Critical technical debt detected. Refactoring urgently recommended."

def calculate_risk_scores(file_stats: Dict[str, Dict[str, Any]]) -> Tuple[Dict[str, Dict[str, Any]], str, str]:
    """
    Calculate risk score for each file using a weighted additive formula:
    raw_risk = ((churn * 0.5) + (bug_count * 10.0)) / bus_factor
    Then normalizes all scores to a 0-100 scale.
    """
    if not file_stats:
        return {}, "A", "No files analyzed."

    max_raw_risk = 0.0
    for path, stats in file_stats.items():
        churn = stats.get("churn_score", 0)
        bug_count = stats.get("bug_count", 0)
        commit_count = max(0, stats.get("commit_count", 1))
        bus_factor = max(1, stats.get("bus_factor", 1))
        
        # Weighted additive risk: churn is baseline, bugs are heavily weighted
        raw_risk = ((churn * CHURN_WEIGHT) + (bug_count * BUG_WEIGHT)) / bus_factor
        stats["raw_risk"] = raw_risk
        
        if raw_risk > max_raw_risk:
            max_raw_risk = raw_risk

    total_risk = 0
    # Normalize to 0-100 and calculate vibe score
    for path, stats in file_stats.items():
        if max_raw_risk > 0:
            stats["risk_score"] = round((stats["raw_risk"] / max_raw_risk) * 100)
        else:
            stats["risk_score"] = 0
        total_risk += stats["risk_score"]
        
        # Vibe Score (AI-Assistance Likelihood)
        code_lines = stats.get("code_lines", 0)
        comment_lines = stats.get("comment_lines", 0)
        c_d = min(comment_lines / max(code_lines, 1), 1.0)
        
        unique_words = stats.get("unique_words", 0)
        total_words = stats.get("total_words", 0)
        c_e = unique_words / max(total_words, 1)
        
        commit_count = stats.get("commit_count", 0)
        active_days = stats.get("active_days", 0)
        velocity = commit_count / max(active_days, 1)
        c_v = min(velocity / 5.0, 1.0)
        
        stats["vibe_score"] = round((c_d * 0.4 + c_e * 0.3 + c_v * 0.3) * 100)
        
    # Calculate 90th percentile of churn for recommendations
    all_churns = sorted([stats.get("churn_score", 0) for stats in file_stats.values()])
    churn_90th = 0
    if all_churns:
        idx = int(len(all_churns) * 0.90)
        idx = min(idx, len(all_churns) - 1)
        churn_90th = all_churns[idx]

    # Generate Smart Recommendations
    for path, stats in file_stats.items():
        recs = []
        churn = stats.get("churn_score", 0)
        bus_factor = stats.get("bus_factor", 1)
        bug_count = stats.get("bug_count", 0)
        code_lines = stats.get("code_lines", 0)
        comment_lines = stats.get("comment_lines", 0)
        risk_score = stats.get("risk_score", 0)
        deps_count = len(stats.get("dependencies", []))
        
        if churn > churn_90th and bus_factor == 1:
            recs.append("Consider finding a second contributor familiar with this file.")
        
        c_ratio = comment_lines / max(code_lines, 1)
        if bug_count > 5 and c_ratio < 0.1:
            recs.append("Consider adding test coverage and documentation before further changes.")
            
        if deps_count > 10 and risk_score > 80:
            recs.append("File is highly coupled and risky. Consider splitting into smaller modules.")
            
        stats["recommendations"] = recs
        
    # Calculate Top-5-Average for Repo Health Grade
    all_scores = [stats["risk_score"] for stats in file_stats.values()]
    all_scores.sort(reverse=True)
    top_5_scores = all_scores[:5]
    avg_risk = sum(top_5_scores) / max(len(top_5_scores), 1)
    
    grade, summary = calculate_repo_health(avg_risk)
            
    return file_stats, grade, summary

def calculate_daily_activity(daily_stats: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not daily_stats:
        return []
        
    dates = sorted(daily_stats.keys())
    
    raw_risks = []
    for date_str, stats in daily_stats.items():
        churn = stats.get("churn_score", 0)
        bug_count = stats.get("bug_count", 0)
        raw_risk = (churn * CHURN_WEIGHT) + (bug_count * BUG_WEIGHT)
        stats["raw_risk"] = raw_risk
        raw_risks.append(raw_risk)
        
    if raw_risks:
        raw_risks.sort()
        idx = int(len(raw_risks) * 0.95)
        idx = min(idx, len(raw_risks) - 1)
        max_normal_risk = raw_risks[idx]
        if max_normal_risk <= 0:
            max_normal_risk = max(raw_risks) if max(raw_risks) > 0 else 1.0
    else:
        max_normal_risk = 1.0
        
    daily_activity = []
    for date_str in dates:
        stats = daily_stats[date_str]
        risk_score = round((stats["raw_risk"] / max_normal_risk) * 100)
        
        if risk_score < 20:
            risk_level = "low"
        elif risk_score < 60:
            risk_level = "mid"
        else:
            risk_level = "high"
            
        daily_activity.append({
            "date": date_str,
            "commit_count": stats["commit_count"],
            "risk_level": risk_level,
            "raw_risk": stats["raw_risk"],
            "risk_score": risk_score
        })
        
    # Slice to last 365 days, ending on latest commit date
    return daily_activity[-365:]
