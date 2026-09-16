"""
CryptoTrace AI — Explanation Engine
Generates human-readable evidentiary findings, node-level pattern roles,
and neutral analytical limitations.
"""
from typing import Dict, Any, List
from app.scam_detection.pattern_rules import (
    STANDARD_LIMITATIONS,
    CATEGORY_LIMITATIONS,
)


def generate_explanation(
    primary_pattern: Dict[str, Any],
    features: Dict[str, Any],
    signals: List[str],
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
    case_correlations: List[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Generates structured human-readable evidence, graph signal pills,
    annotated node roles, and analytical limitations.
    """
    evidence_points: List[str] = []
    case_correlations = case_correlations or []

    # 1. Concrete Graph Evidence Statements
    total_nodes = features.get("total_nodes", 0)
    total_edges = features.get("total_edges", 0)
    unique_senders = features.get("unique_senders", 0)
    unique_receivers = features.get("unique_receivers", 0)
    max_depth = features.get("max_hop_depth", 0)
    avg_latency = features.get("time_between_transactions_avg", 0)
    total_val = features.get("total_amount_received", 0)
    chain = features.get("source_chain", "ethereum").upper()

    evidence_points.append(f"✓ Traced {total_nodes} unique wallets across {total_edges} transaction hops on {chain} (depth {max_depth}).")

    if unique_senders >= 2:
        evidence_points.append(f"✓ {unique_senders} distinct source wallets identified feeding into downstream counterparties.")

    if features.get("has_fan_in"):
        evidence_points.append(f"✓ Multi-inflow fan-in convergence detected: multiple tributary wallets funneled into common address.")

    if features.get("has_fan_out"):
        evidence_points.append(f"✓ Fan-out asset splitting detected: funds fractured across {unique_receivers} downstream beneficiary wallets.")

    if features.get("has_consolidation"):
        evidence_points.append(f"✓ Fund consolidation confirmed: > 60% of aggregated tributary funds merged before onward transfer.")

    if features.get("has_rapid_forwarding"):
        evidence_points.append(f"✓ High-velocity rapid forwarding observed: average hop interval of {avg_latency}s (sub-minute bot execution).")

    if features.get("is_cross_chain") or features.get("bridge_detected"):
        evidence_points.append(f"✓ Cross-chain bridge interaction detected: assets transitioned across independent blockchain ledgers.")

    if features.get("vasp_exchange_detected"):
        vasps = ", ".join(features.get("vasp_names", [])) or "Identified VASP"
        evidence_points.append(f"✓ Terminal exit into centralized exchange endpoint ({vasps}) — Subpoenable under Section 91 CrPC.")

    # Add specific pattern signals from scoring engine
    for sig in signals:
        formatted = f"✓ {sig}"
        if formatted not in evidence_points:
            evidence_points.append(formatted)

    # Add case correlation evidence if any
    for corr in case_correlations:
        evidence_points.append(f"✓ Suspect wallet {corr.get('wallet', '')[:10]}... shared with Case #{corr.get('case_number', '')} ({corr.get('title', '')}).")

    # 2. Graph Signal Badges
    graph_signals = [
        {"name": "Fan-In Convergence", "detected": bool(features.get("has_fan_in")), "severity": "high" if features.get("has_fan_in") else "neutral"},
        {"name": "Fan-Out Splitting", "detected": bool(features.get("has_fan_out")), "severity": "high" if features.get("has_fan_out") else "neutral"},
        {"name": "Fund Consolidation", "detected": bool(features.get("has_consolidation")), "severity": "high" if features.get("has_consolidation") else "neutral"},
        {"name": "Rapid Forwarding (< 120s)", "detected": bool(features.get("has_rapid_forwarding")), "severity": "high" if features.get("has_rapid_forwarding") else "neutral"},
        {"name": "Multi-Hop Layering", "detected": bool(max_depth >= 2), "severity": "medium" if max_depth >= 2 else "neutral"},
        {"name": "Cross-Chain Movement", "detected": bool(features.get("is_cross_chain")), "severity": "medium" if features.get("is_cross_chain") else "neutral"},
        {"name": "VASP Exchange Off-Ramp", "detected": bool(features.get("vasp_exchange_detected")), "severity": "actionable" if features.get("vasp_exchange_detected") else "neutral"},
    ]

    # 3. Node Role Annotations
    node_roles: Dict[str, Dict[str, str]] = {}
    in_counts: Dict[str, int] = {}
    out_counts: Dict[str, int] = {}
    for e in edges:
        src = str(e.get("source", "")).lower()
        tgt = str(e.get("target", "")).lower()
        if src: out_counts[src] = out_counts.get(src, 0) + 1
        if tgt: in_counts[tgt] = in_counts.get(tgt, 0) + 1

    for idx, n in enumerate(nodes):
        nid = str(n.get("id", "")).lower()
        ntype = str(n.get("type", "")).lower()
        in_c = in_counts.get(nid, 0)
        out_c = out_counts.get(nid, 0)
        label = str(n.get("label", "")).lower()

        role = "Intermediate Wallet"
        reason = "Relays transactions through sequential hops."

        if ntype == "victim" or idx == 0 or (in_c == 0 and out_c >= 1):
            role = "Victim / Origin Wallet"
            reason = "Initial originating point of traced funds."
        elif ntype == "vasp" or "vasp" in label or "exchange" in label:
            role = "VASP Exchange Exit"
            reason = "Custodial off-ramp / deposit destination for fiat liquidation."
        elif in_c >= 2 and out_c >= 1:
            role = "Consolidation Hub"
            reason = f"Aggregates incoming funds from {in_c} sources before downstream forwarding."
        elif in_c >= 2 and out_c == 0:
            role = "Collection Wallet"
            reason = f"Ingestion sink receiving transfers from {in_c} independent sources."
        elif out_c >= 2:
            role = "Splitting / Fan-Out Nexus"
            reason = f"Disperses single balance into {out_c} downstream burner wallets."
        elif "bridge" in label:
            role = "Cross-Chain Bridge"
            reason = "Smart contract protocol facilitating cross-chain asset transfers."

        node_roles[nid] = {
            "address": n.get("id", ""),
            "role": role,
            "reason": reason,
            "chain": n.get("chain", features.get("source_chain", "ethereum")),
            "in_degree": in_c,
            "out_degree": out_c,
        }

    # 4. Compiling Limitations
    limitations = list(STANDARD_LIMITATIONS)
    cat_id = primary_pattern.get("id", "")
    if cat_id in CATEGORY_LIMITATIONS:
        limitations.insert(0, CATEGORY_LIMITATIONS[cat_id])

    return {
        "evidence": evidence_points,
        "graph_signals": graph_signals,
        "node_roles": node_roles,
        "limitations": limitations,
        "summary_narrative": f"Transaction behavior is consistent with an {primary_pattern.get('name', 'investigated pattern')}. "
                             f"Structural indicators show {unique_senders} senders and {unique_receivers} receivers "
                             f"with a pattern consistency score of {primary_pattern.get('score', 0)}/100 ({primary_pattern.get('confidence_label', '')}).",
    }
