"""
CryptoTrace AI — Investigation Priority Score
Separate from risk. Helps investigators decide which cases need attention first.
"""
from datetime import datetime, timezone
from typing import Optional


def calculate_priority(
    risk_score: float = 0,
    victim_count: int = 0,
    reported_amount: float = 0,
    vasp_detected: bool = False,
    funds_still_moving: bool = False,
    last_activity: Optional[datetime] = None,
    connected_cases: int = 0,
) -> dict:
    """
    Calculate investigation priority.

    Returns:
        {
            "score": 0-100,
            "level": "low" | "medium" | "high" | "critical",
            "reasons": ["reason1", "reason2"],
        }
    """
    score = 0
    reasons = []

    # Recency
    if last_activity:
        try:
            delta = (datetime.now(timezone.utc) - last_activity).total_seconds()
            if delta < 3600:  # Last hour
                score += 25
                reasons.append("Activity detected within the last hour")
            elif delta < 86400:  # Last day
                score += 15
                reasons.append("Activity detected within the last 24 hours")
            elif delta < 604800:  # Last week
                score += 8
                reasons.append("Activity detected within the last week")
        except (TypeError, AttributeError):
            pass

    # Funds still moving
    if funds_still_moving:
        score += 20
        reasons.append("Funds are potentially still in transit")

    # VASP detected
    if vasp_detected:
        score += 15
        reasons.append("Potential custodial endpoint has been identified")

    # Victim count
    if victim_count >= 5:
        score += 15
        reasons.append(f"Multiple victims ({victim_count}) connected to this case")
    elif victim_count >= 2:
        score += 10
        reasons.append(f"{victim_count} victims connected to this case")

    # Amount
    if reported_amount >= 1000000:  # 10 Lakh+
        score += 10
        reasons.append("High reported value")
    elif reported_amount >= 100000:  # 1 Lakh+
        score += 5
        reasons.append("Significant reported value")

    # Risk score
    if risk_score >= 80:
        score += 10
        reasons.append("High risk score based on blockchain indicators")
    elif risk_score >= 60:
        score += 5
        reasons.append("Elevated risk score")

    # Connected cases
    if connected_cases >= 2:
        score += 5
        reasons.append(f"Connected to {connected_cases} other investigations")

    score = min(100, score)

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
        "reasons": reasons,
    }
