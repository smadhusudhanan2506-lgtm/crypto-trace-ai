"""
CryptoTrace AI — Explainable Scoring Engine
Calculates weighted pattern consistency scores for all supported scam categories
and ranks primary and alternative patterns without black-box opacity.
"""
from typing import Dict, Any, List, Tuple
from app.scam_detection.pattern_rules import (
    SCAM_CATEGORIES,
    SCAM_PATTERN_WEIGHTS,
)


def score_patterns(
    features: Dict[str, Any],
    case_correlations_count: int = 0
) -> Dict[str, Any]:
    """
    Computes explainable pattern scores (0-100) for all supported categories.
    Returns:
      primary_pattern: Dict
      alternative_patterns: List[Dict]
      all_scores: Dict[str, int]
    """
    scores: Dict[str, int] = {}
    signals_map: Dict[str, List[str]] = {}

    total_nodes = features.get("total_nodes", 0)
    total_edges = features.get("total_edges", 0)

    # Edge case: Empty or single-node trivial graph
    if total_nodes <= 1 or total_edges == 0:
        return _insufficient_evidence_result(features, "Insufficient graph telemetry (single or zero transaction edges).")

    # ─────────────────────────────────────────────────────────────────────────
    # 1. INVESTMENT / PONZI-TYPE
    # ─────────────────────────────────────────────────────────────────────────
    ponzi_score = 0
    ponzi_signals = []
    w_ponzi = SCAM_PATTERN_WEIGHTS["investment_ponzi"]

    if features.get("has_fan_in") or features.get("unique_senders", 0) >= 3:
        ponzi_score += w_ponzi["many_sources_fan_in"]
        ponzi_signals.append(f"{features.get('unique_senders', 0)} independent source wallets send funds inward (Fan-In)")

    if features.get("max_in_degree", 0) >= 2 or features.get("repeated_destinations", 0) >= 1:
        ponzi_score += w_ponzi["common_collection_wallet"]
        ponzi_signals.append("Central collection address identified receiving multi-source inflows")

    if features.get("has_consolidation"):
        ponzi_score += w_ponzi["fund_consolidation"]
        ponzi_signals.append("Fund consolidation detected: incoming funds aggregated before downstream transfer")

    if features.get("max_hop_depth", 0) >= 2 or features.get("total_edges", 0) >= 3:
        ponzi_score += w_ponzi["onward_forwarding_layering"]
        ponzi_signals.append(f"Collected assets forwarded across {features.get('max_hop_depth', 0)} subsequent hops")

    if features.get("transaction_amount_similarity", 0) >= 0.25:
        ponzi_score += w_ponzi["amount_similarity_clustering"]
        ponzi_signals.append("Clustered deposit amounts observed across independent source transactions")

    if case_correlations_count > 0:
        ponzi_score += w_ponzi["cross_case_correlation"]
        ponzi_signals.append(f"Destination address correlates with {case_correlations_count} previously reported victim complaint(s)")

    scores["investment_ponzi"] = min(100, ponzi_score)
    signals_map["investment_ponzi"] = ponzi_signals

    # ─────────────────────────────────────────────────────────────────────────
    # 2. PHISHING / WALLET DRAIN
    # ─────────────────────────────────────────────────────────────────────────
    drain_score = 0
    drain_signals = []
    w_drain = SCAM_PATTERN_WEIGHTS["phishing_drainer"]

    if features.get("has_rapid_forwarding"):
        drain_score += w_drain["rapid_forwarding_speed"]
        drain_signals.append(f"Sub-minute rapid forwarding detected (avg latency {features.get('time_between_transactions_avg', 0)}s)")

    if features.get("has_fan_out") or features.get("wallet_splitting_events", 0) >= 1:
        drain_score += w_drain["wallet_splitting_fan_out"]
        drain_signals.append("Multi-wallet fan-out dispersal across intermediary burner addresses")

    if features.get("amount_concentration", 0) >= 0.70 or features.get("largest_destination_pct", 0) >= 70:
        drain_score += w_drain["high_asset_concentration_drain"]
        drain_signals.append("Bulk drain of available balance (> 70% concentration) in singular transfer burst")

    if features.get("token_swap_detected") or features.get("distinct_tokens_count", 0) >= 1:
        drain_score += w_drain["token_swap_or_contract_call"]
        drain_signals.append("Automated DEX token swap or smart contract router execution")

    if case_correlations_count > 0:
        drain_score += w_drain["cross_case_correlation"]
        drain_signals.append(f"Recipient linked to {case_correlations_count} cross-case cyber cell report(s)")

    scores["phishing_drainer"] = min(100, drain_score)
    signals_map["phishing_drainer"] = drain_signals

    # ─────────────────────────────────────────────────────────────────────────
    # 3. FAKE EXCHANGE / PLATFORM
    # ─────────────────────────────────────────────────────────────────────────
    fake_ex_score = 0
    fake_ex_signals = []
    w_fake = SCAM_PATTERN_WEIGHTS["fake_exchange"]

    if features.get("unique_senders", 0) >= 2:
        fake_ex_score += w_fake["multiple_victim_inflows"]
        fake_ex_signals.append(f"{features.get('unique_senders', 0)} unrelated victim deposit streams")

    if features.get("repeated_destinations", 0) >= 1 and not features.get("vasp_exchange_detected"):
        fake_ex_score += w_fake["deposit_like_infrastructure"]
        fake_ex_signals.append("Synthetic deposit-like address functioning without recognized VASP licensing")

    if features.get("total_amount_received", 0) >= 1.0 or features.get("large_transfers_count", 0) >= 2:
        fake_ex_score += w_fake["high_value_collection_hub"]
        fake_ex_signals.append("High-volume aggregation hub accumulating multi-source victim assets")

    if features.get("time_between_transactions_avg", 0) >= 300 and features.get("max_hop_depth", 0) >= 2:
        fake_ex_score += w_fake["delayed_structured_forwarding"]
        fake_ex_signals.append("Delayed structured forwarding consistent with scheduled platform sweeps")

    if case_correlations_count > 0:
        fake_ex_score += w_fake["cross_case_correlation"]
        fake_ex_signals.append(f"Linked to {case_correlations_count} prior reported fake investment platform incident(s)")

    scores["fake_exchange"] = min(100, fake_ex_score)
    signals_map["fake_exchange"] = fake_ex_signals

    # ─────────────────────────────────────────────────────────────────────────
    # 4. GIVEAWAY SCAM
    # ─────────────────────────────────────────────────────────────────────────
    giveaway_score = 0
    giveaway_signals = []
    w_giveaway = SCAM_PATTERN_WEIGHTS["giveaway"]

    if features.get("unique_senders", 0) >= 3:
        giveaway_score += w_giveaway["many_unrelated_sources"]
        giveaway_signals.append(f"{features.get('unique_senders', 0)} sources sending unidirectional transfers to common target")

        if features.get("unique_receivers", 0) <= 2:
            giveaway_score += w_giveaway["single_destination_sink"]
            giveaway_signals.append("Strict single-destination absorption sink with zero disbursement")

        if features.get("transaction_amount_similarity", 0) >= 0.35:
            giveaway_score += w_giveaway["similar_round_amounts"]
            giveaway_signals.append("Repetitive round amount deposits matching public promotion tiers")

        if features.get("outgoing_tx_count", 0) <= 1:
            giveaway_score += w_giveaway["no_outflow_returns"]
            giveaway_signals.append("Zero counterparty return transfers observed (one-way trap)")

    scores["giveaway"] = min(100, giveaway_score)
    signals_map["giveaway"] = giveaway_signals

    # ─────────────────────────────────────────────────────────────────────────
    # 5. ROMANCE SCAM (REPEATED PAYMENTS)
    # ─────────────────────────────────────────────────────────────────────────
    romance_score = 0
    romance_signals = []
    w_romance = SCAM_PATTERN_WEIGHTS["romance_payment"]

    if features.get("unique_senders", 0) == 1 and features.get("total_edges", 0) >= 2:
        romance_score += w_romance["single_dominant_source"]
        romance_signals.append("Single victim wallet sending repeated sequential installments")

    if features.get("repeated_destinations", 0) >= 1:
        romance_score += w_romance["repeated_transfers_over_time"]
        romance_signals.append("Multi-stage payments directed to identical beneficiary entity")

    if features.get("large_transfers_count", 0) >= 1 and features.get("small_repeated_txs_count", 0) >= 1:
        romance_score += w_romance["progressive_escalating_amounts"]
        romance_signals.append("Progressive transfer value escalation over transaction history")

    if features.get("max_hop_depth", 0) >= 2:
        romance_score += w_romance["intermediary_layering_hops"]
        romance_signals.append("Subsequent hop movement distancing funds from originating victim")

    scores["romance_payment"] = min(100, romance_score)
    signals_map["romance_payment"] = romance_signals

    # ─────────────────────────────────────────────────────────────────────────
    # 6. JOB / TASK SCAM
    # ─────────────────────────────────────────────────────────────────────────
    job_score = 0
    job_signals = []
    w_job = SCAM_PATTERN_WEIGHTS["job_task"]

    if features.get("unique_senders", 0) >= 2:
        job_score += w_job["multiple_source_deposits"]
        job_signals.append(f"{features.get('unique_senders', 0)} multi-source victim deposits")

    if features.get("small_repeated_txs_count", 0) >= 2:
        job_score += w_job["small_repeated_amounts"]
        job_signals.append(f"{features.get('small_repeated_txs_count', 0)} small structured task-like deposit tiers")

    if features.get("max_in_degree", 0) >= 2:
        job_score += w_job["common_collection_nexus"]
        job_signals.append("Common collection address ingesting participant task payments")

    if features.get("has_consolidation") or features.get("has_rapid_forwarding"):
        job_score += w_job["rapid_downstream_consolidation"]
        job_signals.append("Rapid downstream sweep into master aggregation account")

    if case_correlations_count > 0:
        job_score += w_job["cross_case_correlation"]
        job_signals.append(f"Matches {case_correlations_count} Telegram/WhatsApp task scam report(s)")

    scores["job_task"] = min(100, job_score)
    signals_map["job_task"] = job_signals

    # ─────────────────────────────────────────────────────────────────────────
    # 7. RUG PULL / TOKEN-BASED SCAM
    # ─────────────────────────────────────────────────────────────────────────
    rug_score = 0
    rug_signals = []
    w_rug = SCAM_PATTERN_WEIGHTS["rug_pull"]

    if features.get("dex_detected") or features.get("token_swap_detected"):
        rug_score += w_rug["dex_or_liquidity_interaction"]
        rug_signals.append("Direct interaction with decentralized liquidity pool / DEX router")

    if features.get("largest_destination_pct", 0) >= 80 and features.get("total_amount_received", 0) > 0.5:
        rug_score += w_rug["sudden_large_single_withdrawal"]
        rug_signals.append("Lump-sum single withdrawal siphoning > 80% of accumulated balance")

    if features.get("distinct_tokens_count", 0) >= 1:
        rug_score += w_rug["token_swapping_activity"]
        rug_signals.append("Custom token asset extraction and immediate swap into native/stablecoin")

    if not features.get("vasp_exchange_detected") and features.get("total_edges", 0) >= 2:
        rug_score += w_rug["unhosted_wallet_exit"]
        rug_signals.append("Withdrawal routed directly into private unhosted developer wallet")

    scores["rug_pull"] = min(100, rug_score)
    signals_map["rug_pull"] = rug_signals

    # ─────────────────────────────────────────────────────────────────────────
    # 8. EXTORTION / BLACKMAIL PAYMENT
    # ─────────────────────────────────────────────────────────────────────────
    extortion_score = 0
    extortion_signals = []
    w_ext = SCAM_PATTERN_WEIGHTS["extortion_blackmail"]

    if features.get("total_edges", 0) >= 2:
        if features.get("unique_senders", 0) == 1 and features.get("unique_receivers", 0) >= 1 and (features.get("has_rapid_forwarding") or features.get("mixer_detected") or features.get("max_hop_depth", 0) >= 2):
            extortion_score += w_ext["direct_single_victim_transfer"]
            extortion_signals.append("Direct transfer from victim wallet into suspect address followed by rapid onward movement")

        if features.get("has_rapid_forwarding") or features.get("mixer_detected"):
            extortion_score += w_ext["immediate_forwarding_or_peel"]
            extortion_signals.append("Immediate onward transfer or privacy mixer routing upon fund arrival")

        if features.get("amount_concentration", 0) >= 0.90:
            extortion_score += w_ext["round_or_exact_demanded_sum"]
            extortion_signals.append("Exact lump-sum payment matching single demanded ransom amount")

        if features.get("has_rapid_forwarding") and features.get("time_between_transactions_avg", 0) < 300:
            extortion_score += w_ext["high_velocity_movement"]
            extortion_signals.append("High velocity automated forwarding post-receipt")

    scores["extortion_blackmail"] = min(100, extortion_score)
    signals_map["extortion_blackmail"] = extortion_signals

    # ─────────────────────────────────────────────────────────────────────────
    # 9. CROSS-CHAIN MOVEMENT INDICATOR
    # ─────────────────────────────────────────────────────────────────────────
    cross_score = 0
    cross_signals = []
    if features.get("is_cross_chain") or features.get("bridge_detected"):
        cross_score = 85
        cross_signals.append(f"Cross-chain bridge interaction identified ({features.get('source_chain', '')} ➔ {features.get('dest_chain', '')})")
        if features.get("chain_switches_count", 0) >= 2:
            cross_score = 95
            cross_signals.append(f"{features.get('chain_switches_count', 0)} multi-chain ledger hops executed")
    scores["cross_chain_movement"] = cross_score
    signals_map["cross_chain_movement"] = cross_signals

    # ─────────────────────────────────────────────────────────────────────────
    # RANKING & PRIMARY SELECTION
    # ─────────────────────────────────────────────────────────────────────────
    # Categories to evaluate for primary pattern (excluding cross_chain which is an indicator)
    candidate_cats = [
        "investment_ponzi", "phishing_drainer", "fake_exchange",
        "giveaway", "romance_payment", "job_task", "rug_pull", "extortion_blackmail"
    ]

    ranked_candidates = sorted(
        [(cat_id, scores[cat_id]) for cat_id in candidate_cats],
        key=lambda x: x[1],
        reverse=True
    )

    top_cat_id, top_score = ranked_candidates[0]

    # Check minimum threshold (default 30)
    min_threshold = SCAM_CATEGORIES[top_cat_id]["threshold"]
    if top_score < min_threshold:
        return _insufficient_evidence_result(features, "Pattern signals fell below analytical confidence threshold.")

    confidence_label = "High pattern consistency" if top_score >= 75 else \
                       "Moderate pattern consistency" if top_score >= 50 else \
                       "Low pattern consistency"

    evidence_strength = "High" if top_score >= 70 else "Medium" if top_score >= 45 else "Low"

    primary_dict = {
        "id": top_cat_id,
        "name": SCAM_CATEGORIES[top_cat_id]["name"],
        "badge": SCAM_CATEGORIES[top_cat_id]["badge"],
        "description": SCAM_CATEGORIES[top_cat_id]["description"],
        "score": top_score,
        "confidence_label": confidence_label,
        "evidence_strength": evidence_strength,
        "signals": signals_map.get(top_cat_id, []),
    }

    # Alternative patterns: candidates with score >= 20 that are not the top category
    alternatives = []
    for cat_id, s in ranked_candidates[1:]:
        if s >= 20:
            alternatives.append({
                "id": cat_id,
                "name": SCAM_CATEGORIES[cat_id]["name"],
                "score": s,
                "signals_count": len(signals_map.get(cat_id, [])),
            })

    return {
        "primary_pattern": primary_dict,
        "alternative_patterns": alternatives,
        "all_scores": scores,
        "signals_map": signals_map,
    }


def _insufficient_evidence_result(features: Dict[str, Any], reason: str) -> Dict[str, Any]:
    cat = SCAM_CATEGORIES["insufficient_evidence"]
    return {
        "primary_pattern": {
            "id": cat["id"],
            "name": cat["name"],
            "badge": cat["badge"],
            "description": cat["description"],
            "score": 15,
            "confidence_label": "Insufficient evidence",
            "evidence_strength": "Low",
            "signals": [reason],
        },
        "alternative_patterns": [],
        "all_scores": {k: 0 for k in SCAM_CATEGORIES},
        "signals_map": {},
    }
