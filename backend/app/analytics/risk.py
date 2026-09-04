"""
CryptoTrace AI — Explainable Risk Score Engine
Produces a 0-100 risk score with full factor breakdown.
IMPORTANT: Risk score is NOT proof of criminal activity.
"""
from typing import List, Dict, Any


def calculate_risk_score(
    patterns: List[dict],
    victim_count: int = 0,
    vasp_detected: bool = False,
    vasp_confidence: float = 0.0,
    hops_count: int = 0,
    total_value: float = 0.0,
) -> dict:
    """
    Calculate an explainable risk score from 0 to 100.

    Returns:
        {
            "score": 0-100,
            "level": "low" | "medium" | "high" | "critical",
            "factors": [
                {"factor": "description", "points": N, "evidence": "..."}
            ],
            "disclaimer": "..."
        }
    """
    factors = []
    raw_score = 0

    # Factor 1: Multiple victim connections (+20 max)
    if victim_count >= 4:
        points = 20
        factors.append({
            "factor": f"Connected to {victim_count} reported victims",
            "points": points,
            "evidence": f"{victim_count} victim reports linked to addresses in this trace",
        })
        raw_score += points
    elif victim_count >= 2:
        points = 12
        factors.append({
            "factor": f"Connected to {victim_count} reported victims",
            "points": points,
            "evidence": f"{victim_count} victim reports linked",
        })
        raw_score += points
    elif victim_count == 1:
        points = 5
        factors.append({
            "factor": "Connected to 1 reported victim",
            "points": points,
            "evidence": "1 victim report linked",
        })
        raw_score += points

    # Factor 2: Detected patterns
    pattern_scores = {
        "rapid_forwarding": 15,
        "fan_out": 15,
        "fan_in": 10,
        "layering": 10,
        "structuring": 10,
        "splitting": 8,
        "consolidation": 8,
        "time_clustering": 5,
        "round_amounts": 5,
        "peeling_chain": 10,
        "cross_chain": 5,
    }

    seen_types = set()
    for pattern in patterns:
        ptype = pattern.get("pattern_type", "")
        if ptype in seen_types:
            continue
        seen_types.add(ptype)
        points = pattern_scores.get(ptype, pattern.get("risk_points", 5))
        factors.append({
            "factor": pattern.get("description", f"Pattern: {ptype}"),
            "points": points,
            "evidence": str(pattern.get("evidence", {})),
        })
        raw_score += points

    # Factor 3: VASP endpoint detected
    if vasp_detected:
        points = 10
        factors.append({
            "factor": "Potential custodial/VASP endpoint detected",
            "points": points,
            "evidence": f"VASP attribution confidence: {vasp_confidence:.0%}",
        })
        raw_score += points

    # Factor 4: Multiple hops (layering indicator)
    if hops_count >= 5:
        points = 5
        factors.append({
            "factor": f"Funds traversed {hops_count} hops",
            "points": points,
            "evidence": "Multiple intermediary addresses",
        })
        raw_score += points

    # Factor 5: High value
    if total_value > 10:  # More than 10 BTC/ETH equivalent
        points = 5
        factors.append({
            "factor": f"High value movement ({total_value:.4f})",
            "points": points,
            "evidence": "Significant fund volume",
        })
        raw_score += points

    # Normalize to 0-100
    score = min(100, raw_score)

    # Determine level
    if score >= 80:
        level = "critical"
    elif score >= 60:
        level = "high"
    elif score >= 30:
        level = "medium"
    else:
        level = "low"

    return {
        "score": score,
        "level": level,
        "factors": sorted(factors, key=lambda f: f["points"], reverse=True),
        "disclaimer": (
            "This risk score is based on observed blockchain indicators and is an "
            "investigative aid. It does not establish criminal liability, ownership, "
            "identity, or legal guilt. All findings should be independently verified "
            "by authorized investigators."
        ),
    }
