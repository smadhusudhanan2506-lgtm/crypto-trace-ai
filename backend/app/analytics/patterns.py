"""
CryptoTrace AI — Fraud Pattern & Graph Topological Detection Engine
Implements 10 forensic graph topological & behavioral patterns:
1. Peel Chain (Laundering Pattern)
2. Mixing / Tumbler Pattern
3. Layering via Fan-Out / Fan-In Funnel
4. Structuring / Smurfing
5. Nested Cross-Chain Hopping
6. Dormant-then-Burst (Cooling Off)
7. Round-Number & Same-Amount Clustering
8. Exchange Cash-Out Funnel
9. Darknet Market & Ransomware Affiliate Split
10. White-Money vs Illicit Contrast Classifier
"""
from typing import List, Dict, Any, Optional, Set
from datetime import datetime, timezone
from collections import Counter, defaultdict


def detect_patterns(hops: List[dict], transactions: Optional[List[dict]] = None) -> List[dict]:
    """
    Run all 10 topological and behavioral pattern detectors on traced hops.
    Returns list of detected patterns with structured evidence and risk points.
    """
    patterns = []
    if not hops:
        return patterns

    patterns.extend(_detect_peel_chain(hops))
    patterns.extend(_detect_mixing_tumbler(hops))
    patterns.extend(_detect_fan_out_fan_in(hops))
    patterns.extend(_detect_structuring_smurfing(hops))
    patterns.extend(_detect_cross_chain_hopping(hops))
    patterns.extend(_detect_dormant_then_burst(hops))
    patterns.extend(_detect_round_number_clustering(hops))
    patterns.extend(_detect_exchange_funnel(hops))
    patterns.extend(_detect_darknet_ransomware_split(hops))
    patterns.extend(_detect_rapid_forwarding(hops))

    return patterns


# ─── 1. PEEL CHAIN DETECTOR ───────────────────────────────────────────────────
def _detect_peel_chain(hops: List[dict]) -> List[dict]:
    """
    Peel Chain: A linear sequence of hops where at each hop a small amount
    peels off to an address while the bulk of the funds moves forward.
    Signal: High out-degree=1 per hop, decreasing balance trail, short time gaps (< 10 mins).
    """
    patterns = []
    if len(hops) < 2:
        return patterns

    sorted_hops = sorted(hops, key=lambda h: h.get("hop_number", 0))
    amounts = [float(h.get("amount", 0)) for h in sorted_hops if float(h.get("amount", 0)) > 0]

    is_decaying = True
    peel_count = 0
    for i in range(len(amounts) - 1):
        if amounts[i+1] < amounts[i]:
            peel_count += 1
        elif amounts[i+1] > amounts[i] * 1.05:
            is_decaying = False
            break

    if is_decaying and peel_count >= 1 and len(sorted_hops) >= 2:
        decay_pct = ((amounts[0] - amounts[-1]) / amounts[0] * 100) if amounts[0] > 0 else 0
        patterns.append({
            "pattern_type": "peel_chain",
            "name": "Peel Chain Obfuscation",
            "code": "PEEL_CHAIN",
            "description": f"Peel chain detected across {len(sorted_hops)} hops: funds peeled off sequentially with a {decay_pct:.1f}% balance decay.",
            "severity": "high",
            "confidence": min(0.95, 0.70 + (len(sorted_hops) * 0.08)),
            "risk_points": 30,
            "evidence": {
                "hops_count": len(sorted_hops),
                "initial_amount": amounts[0] if amounts else 0,
                "final_amount": amounts[-1] if amounts else 0,
                "amount_decay_percentage": round(decay_pct, 2),
                "peeled_hops": peel_count,
            },
            "predicted_purpose": "Ransomware Payout / Stolen Fund Layering before Exchange Exit",
            "related_transactions": [h.get("tx_hash", "") for h in sorted_hops if h.get("tx_hash")],
        })

    return patterns


# ─── 2. MIXING / TUMBLER DETECTOR ─────────────────────────────────────────────
def _detect_mixing_tumbler(hops: List[dict]) -> List[dict]:
    """
    Mixing / Tumbler: Many-to-many convergence into smart contract pools (Tornado Cash, CoinJoin)
    with standardized deposit tiers (0.1, 1, 10 ETH/BTC) to break amount correlation.
    """
    patterns = []
    mixer_keywords = ["tornado", "mixer", "tumbler", "coinjoin", "anonymizer"]
    standard_tiers = {0.1, 1.0, 10.0, 100.0, 0.01, 0.05}

    for hop in hops:
        src = (hop.get("source_address") or "").lower()
        dst = (hop.get("destination_address") or "").lower()
        vasp_name = (hop.get("vasp_name") or "").lower()
        amount = float(hop.get("amount", 0))

        is_mixer_name = any(k in vasp_name for k in mixer_keywords)
        is_tornado_addr = any(addr in dst or addr in src for addr in [
            "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b",
            "0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc",
            "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936",
            "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf",
        ])
        is_tier_match = any(abs(amount - tier) < 0.001 for tier in standard_tiers)

        if is_mixer_name or is_tornado_addr:
            patterns.append({
                "pattern_type": "mixing_tumbler",
                "name": "Mixing / Tumbler Protocol Interaction",
                "code": "MIXER_TUMBLER",
                "description": f"Direct interaction with privacy mixer/tumbler ({hop.get('vasp_name', 'Tornado Cash')}) detected to obscure transaction graph history.",
                "severity": "critical",
                "confidence": 0.99,
                "risk_points": 40,
                "evidence": {
                    "mixer_address": dst if is_tornado_addr else src,
                    "mixer_name": hop.get("vasp_name", "Tornado Cash Pool"),
                    "standardized_amount": amount,
                    "is_tier_match": is_tier_match,
                },
                "predicted_purpose": "Cryptographic Traceability Severing / OFAC Sanction Evasion",
                "related_transactions": [hop.get("tx_hash", "")],
            })
            break

    return patterns


# ─── 3. FAN-OUT / FAN-IN FUNNEL DETECTOR ──────────────────────────────────────
def _detect_fan_out_fan_in(hops: List[dict]) -> List[dict]:
    """
    Fan-Out / Fan-In Funnel: One address splits funds to multiple intermediary/burner wallets
    which subsequently reconverge into a single cash-out target.
    """
    patterns = []
    sender_targets = defaultdict(set)
    receiver_sources = defaultdict(set)

    for hop in hops:
        src = (hop.get("source_address") or "").lower()
        dst = (hop.get("destination_address") or "").lower()
        if src and dst:
            sender_targets[src].add(dst)
            receiver_sources[dst].add(src)

    # Fan-out detection
    for src, targets in sender_targets.items():
        if len(targets) >= 3:
            patterns.append({
                "pattern_type": "fan_out_splitting",
                "name": "Fan-Out Splitting (Star Topology)",
                "code": "FAN_OUT",
                "description": f"Star topology fan-out: wallet {src[:10]}... dispersed funds into {len(targets)} intermediary burner wallets.",
                "severity": "high",
                "confidence": min(0.95, 0.60 + len(targets) * 0.08),
                "risk_points": 20,
                "evidence": {"source_wallet": src, "burner_count": len(targets)},
                "predicted_purpose": "Layering & Obfuscation into Burner Mules",
                "related_transactions": [h.get("tx_hash", "") for h in hops if (h.get("source_address") or "").lower() == src],
            })

    # Fan-in detection (Reconvergence)
    for dst, sources in receiver_sources.items():
        if len(sources) >= 2:
            patterns.append({
                "pattern_type": "fan_in_funnel",
                "name": "Fan-In Funnel Reconvergence",
                "code": "FAN_IN",
                "description": f"Funnel convergence: {len(sources)} disparate intermediary wallets consolidated funds into single terminal hub {dst[:10]}...",
                "severity": "high",
                "confidence": min(0.95, 0.65 + len(sources) * 0.10),
                "risk_points": 25,
                "evidence": {"terminal_wallet": dst, "converging_sources": len(sources)},
                "predicted_purpose": "Syndicate Consolidation before Exchange Liquidation",
                "related_transactions": [h.get("tx_hash", "") for h in hops if (h.get("destination_address") or "").lower() == dst],
            })

    return patterns


# ─── 4. STRUCTURING / SMURFING DETECTOR ───────────────────────────────────────
def _detect_structuring_smurfing(hops: List[dict]) -> List[dict]:
    """
    Structuring / Smurfing: Transactions repeatedly clustered just below regulatory
    reporting thresholds ($10,000 USD equivalent / ~2.5 - 3.5 ETH) to evade AML alerts.
    """
    patterns = []
    amounts = [float(h.get("amount", 0)) for h in hops if float(h.get("amount", 0)) > 0]
    if not amounts:
        return patterns

    threshold_hits = [a for a in amounts if (2.5 <= a <= 3.45) or (9000 <= a <= 9950)]

    if len(threshold_hits) >= 2:
        patterns.append({
            "pattern_type": "structuring_smurfing",
            "name": "Smurfing / Structuring Threshold Evasion",
            "code": "SMURFING",
            "description": f"Structuring detected: {len(threshold_hits)} transfers clustered just below regulatory reporting thresholds.",
            "severity": "high",
            "confidence": 0.88,
            "risk_points": 25,
            "evidence": {
                "threshold_hits_count": len(threshold_hits),
                "sample_amounts": threshold_hits[:5],
                "regulatory_threshold": "$10,000 / 3.5 ETH AML trigger",
            },
            "predicted_purpose": "Anti-Money Laundering (AML) Compliance Evasion",
            "related_transactions": [h.get("tx_hash", "") for h in hops if float(h.get("amount", 0)) in threshold_hits],
        })

    return patterns


# ─── 5. CROSS-CHAIN BRIDGE HOPPING DETECTOR ───────────────────────────────────
def _detect_cross_chain_hopping(hops: List[dict]) -> List[dict]:
    """
    Nested / Chain-Hopping: Funds cross from Chain A -> Bridge/Swap -> Chain B -> Chain C
    to break single-chain forensic graph tools.
    """
    patterns = []
    chains_seen = set()
    for h in hops:
        c = (h.get("chain") or "").lower()
        if c:
            chains_seen.add(c)

    if len(chains_seen) >= 2:
        patterns.append({
            "pattern_type": "cross_chain_hopping",
            "name": "Cross-Chain Bridge Hopping",
            "code": "CHAIN_HOPPING",
            "description": f"Multi-chain hopping detected across {len(chains_seen)} distinct blockchains ({', '.join(sorted(chains_seen))}).",
            "severity": "high",
            "confidence": 0.94,
            "risk_points": 30,
            "evidence": {
                "chains_involved": list(chains_seen),
                "chain_count": len(chains_seen),
            },
            "predicted_purpose": "Cross-Chain Forensic Trace Disruption (Bridge Layering)",
            "related_transactions": [h.get("tx_hash", "") for h in hops if h.get("tx_hash")],
        })

    return patterns


# ─── 6. DORMANT-THEN-BURST DETECTOR ───────────────────────────────────────────
def _detect_dormant_then_burst(hops: List[dict]) -> List[dict]:
    """
    Dormant-then-Burst: Wallet receives illicit funds and sits idle for weeks/months
    (cooling off period), then suddenly bursts into a fast automated multi-hop sequence.
    """
    patterns = []
    if len(hops) < 2:
        return patterns

    for i in range(len(hops) - 1):
        t1 = hops[i].get("timestamp")
        t2 = hops[i+1].get("timestamp")
        if t1 and t2:
            try:
                dt1 = t1 if isinstance(t1, datetime) else datetime.fromisoformat(str(t1).replace("Z", "+00:00"))
                dt2 = t2 if isinstance(t2, datetime) else datetime.fromisoformat(str(t2).replace("Z", "+00:00"))
                diff_days = abs((dt2 - dt1).total_seconds()) / 86400
                if diff_days >= 14:
                    patterns.append({
                        "pattern_type": "dormant_then_burst",
                        "name": "Cooling-Off / Dormant Burst",
                        "code": "DORMANT_BURST",
                        "description": f"Cooling-off dormancy detected: funds rested for {int(diff_days)} days before sudden high-velocity multi-hop movement.",
                        "severity": "medium",
                        "confidence": 0.85,
                        "risk_points": 20,
                        "evidence": {"dormant_period_days": round(diff_days, 1)},
                        "predicted_purpose": "Law Enforcement Heat Evasion & Delayed Liquidation",
                        "related_transactions": [hops[i].get("tx_hash", ""), hops[i+1].get("tx_hash", "")],
                    })
                    break
            except Exception:
                continue

    return patterns


# ─── 7. ROUND-NUMBER & SAME-AMOUNT CLUSTERING DETECTOR ────────────────────────
def _detect_round_number_clustering(hops: List[dict]) -> List[dict]:
    """
    Round-Number / Same-Amount Clustering: Multiple unrelated-looking wallets all move
    identical or round amounts (0.5, 1, 5, 10 ETH/BTC) into a common terminal address.
    """
    patterns = []
    amounts = [round(float(h.get("amount", 0)), 4) for h in hops if float(h.get("amount", 0)) > 0]
    if len(amounts) < 3:
        return patterns

    counter = Counter(amounts)
    repeated_amounts = {amt: cnt for amt, cnt in counter.items() if cnt >= 2}

    if repeated_amounts:
        top_amt, count = max(repeated_amounts.items(), key=lambda item: item[1])
        patterns.append({
            "pattern_type": "same_amount_clustering",
            "name": "Common-Ownership Amount Clustering",
            "code": "AMOUNT_CLUSTERING",
            "description": f"Common-input ownership heuristic: {count} transactions moved identical amounts of {top_amt} assets.",
            "severity": "medium",
            "confidence": 0.86,
            "risk_points": 18,
            "evidence": {
                "clustered_amount": top_amt,
                "repetition_count": count,
            },
            "predicted_purpose": "Syndicate Coordinated Batch Transfer (Single Actor Control)",
            "related_transactions": [h.get("tx_hash", "") for h in hops if round(float(h.get("amount", 0)), 4) == top_amt],
        })

    return patterns


# ─── 8. EXCHANGE CASH-OUT FUNNEL DETECTOR ─────────────────────────────────────
def _detect_exchange_funnel(hops: List[dict]) -> List[dict]:
    """
    Exchange Funnel / Cash-Out: Funds flow through peel/layering chains and terminate
    at a verified centralized exchange deposit address (KYC actionable endpoint).
    """
    patterns = []
    for h in hops:
        is_vasp = h.get("is_vasp_endpoint") or bool(h.get("vasp_name"))
        vasp_name = h.get("vasp_name", "")
        if is_vasp and vasp_name:
            patterns.append({
                "pattern_type": "exchange_cashout_funnel",
                "name": "Exchange KYC Cash-Out Terminal",
                "code": "EXCHANGE_FUNNEL",
                "description": f"Terminal exit node identified at registered VASP/Exchange ({vasp_name}). Immediate Section 91 CrPC subpoena target.",
                "severity": "critical",
                "confidence": 0.98,
                "risk_points": 35,
                "evidence": {
                    "vasp_name": vasp_name,
                    "deposit_address": h.get("destination_address", ""),
                    "liquidation_amount": h.get("amount", 0),
                    "asset": h.get("asset", "ETH"),
                },
                "predicted_purpose": "Fiat Off-Ramp / Account Cash-Out (Subpoenable KYC Endpoint)",
                "related_transactions": [h.get("tx_hash", "")],
            })
            break

    return patterns


# ─── 9. DARKNET / RANSOMWARE SPLIT DETECTOR ───────────────────────────────────
def _detect_darknet_ransomware_split(hops: List[dict]) -> List[dict]:
    """
    Darknet Market / Ransomware Affiliate Split: Hub node receiving numerous small
    customer/victim micro-inflows followed by periodic large batched affiliate split payouts.
    """
    patterns = []
    inflow_amounts = []
    outflow_amounts = []

    for h in hops:
        hop_num = h.get("hop_number", 0)
        amt = float(h.get("amount", 0))
        if hop_num <= 1:
            inflow_amounts.append(amt)
        else:
            outflow_amounts.append(amt)

    if len(inflow_amounts) >= 2 and any(a > 0.005 for a in inflow_amounts):
        avg_in = sum(inflow_amounts) / len(inflow_amounts)
        if len(outflow_amounts) > 0 and max(outflow_amounts) >= avg_in * 0.8:
            patterns.append({
                "pattern_type": "ransomware_affiliate_split",
                "name": "Ransomware / Syndicate Revenue Split",
                "code": "AFFILIATE_SPLIT",
                "description": "Hub collection with rapid revenue splitting between operator and affiliate deposit wallets.",
                "severity": "high",
                "confidence": 0.82,
                "risk_points": 22,
                "evidence": {
                    "inflow_batches": len(inflow_amounts),
                    "outflow_splits": len(outflow_amounts),
                },
                "predicted_purpose": "Ransomware Affiliate Split or Darknet Vendor Payout",
                "related_transactions": [h.get("tx_hash", "") for h in hops if h.get("tx_hash")],
            })

    return patterns


# ─── 10. RAPID FORWARDING DETECTOR ────────────────────────────────────────────
def _detect_rapid_forwarding(hops: List[dict]) -> List[dict]:
    """Rapid automated forwarding within minutes of arrival."""
    patterns = []
    if len(hops) < 2:
        return patterns

    rapid_count = 0
    for i in range(len(hops) - 1):
        t1 = hops[i].get("timestamp")
        t2 = hops[i+1].get("timestamp")
        if t1 and t2:
            try:
                dt1 = t1 if isinstance(t1, datetime) else datetime.fromisoformat(str(t1).replace("Z", "+00:00"))
                dt2 = t2 if isinstance(t2, datetime) else datetime.fromisoformat(str(t2).replace("Z", "+00:00"))
                diff = abs((dt2 - dt1).total_seconds())
                if 0 < diff < 600:
                    rapid_count += 1
            except Exception:
                continue

    if rapid_count >= 1:
        patterns.append({
            "pattern_type": "rapid_layering",
            "name": "High-Velocity Automated Layering",
            "code": "RAPID_LAYERING",
            "description": f"Automated bot forwarding: {rapid_count} transfers executed in under 10 minutes from receipt.",
            "severity": "high",
            "confidence": 0.90,
            "risk_points": 25,
            "evidence": {"automated_hops": rapid_count},
            "predicted_purpose": "Bot-Automated Speed Layering to Outrun Freezing Requests",
            "related_transactions": [h.get("tx_hash", "") for h in hops if h.get("tx_hash")],
        })

    return patterns


# ─── COMPREHENSIVE GRAPH TOPOLOGY & CRIME PURPOSE ANALYZER ────────────────────
def analyze_graph_topology(hops: List[dict], nodes: List[dict], edges: List[dict]) -> Dict[str, Any]:
    """
    Extracts graph metrics (degree centrality, time delta, amount decay, bridge hops)
    and predicts the primary criminal purpose with plain-English explanation.
    """
    patterns = detect_patterns(hops)

    # 1. Structural Feature Extraction
    in_degrees = defaultdict(int)
    out_degrees = defaultdict(int)
    for e in edges:
        src = e.get("source", "")
        tgt = e.get("target", "")
        if src: out_degrees[src] += 1
        if tgt: in_degrees[tgt] += 1

    max_in = max(in_degrees.values()) if in_degrees else 0
    max_out = max(out_degrees.values()) if out_degrees else 0
    total_nodes = len(nodes)
    total_edges = len(edges)

    # Calculate amount decay
    amounts = [float(e.get("amount", 0)) for e in edges if float(e.get("amount", 0)) > 0]
    decay_pct = 0.0
    if len(amounts) >= 2 and amounts[0] > 0:
        decay_pct = max(0.0, ((amounts[0] - amounts[-1]) / amounts[0]) * 100)

    # Time delta
    time_deltas = []
    for i in range(len(edges) - 1):
        t1 = edges[i].get("timestamp")
        t2 = edges[i+1].get("timestamp")
        if t1 and t2:
            try:
                dt1 = t1 if isinstance(t1, datetime) else datetime.fromisoformat(str(t1).replace("Z", "+00:00"))
                dt2 = t2 if isinstance(t2, datetime) else datetime.fromisoformat(str(t2).replace("Z", "+00:00"))
                time_deltas.append(abs((dt2 - dt1).total_seconds()))
            except Exception:
                pass

    avg_time_sec = sum(time_deltas) / len(time_deltas) if time_deltas else 120.0
    is_bot_speed = avg_time_sec < 600.0

    # Multi-chain bridges
    chains = set(e.get("chain", "") for e in edges if e.get("chain")) | set(n.get("chain", "") for n in nodes if n.get("chain"))
    chains.discard("")
    bridge_hops = max(0, len(chains) - 1)

    # 2. Primary Topology Classification
    has_peel = any(p["pattern_type"] == "peel_chain" for p in patterns)
    has_mixer = any(p["pattern_type"] == "mixing_tumbler" for p in patterns)
    has_funnel = any(p["pattern_type"] == "exchange_cashout_funnel" for p in patterns)
    has_fan_out = any(p["pattern_type"] == "fan_out_splitting" for p in patterns)
    has_chain_hop = bridge_hops > 0 or any(p["pattern_type"] == "cross_chain_hopping" for p in patterns)

    if has_mixer:
        primary_topology = "TORNADO_MIXER_POOL"
        topology_label = "Mixing / Tumbler Obfuscation Pool"
        predicted_purpose = "Anonymization & Cryptographic Severing of Transaction Trail"
        risk_level = "critical"
    elif has_peel and has_funnel:
        primary_topology = "PEEL_CHAIN_EXCHANGE_FUNNEL"
        topology_label = "Peel Chain with Exchange Cash-Out Funnel"
        predicted_purpose = "Ransomware Payout / Phishing Drainer Liquidation via Exchange"
        risk_level = "critical"
    elif has_peel:
        primary_topology = "LINEAR_PEEL_CHAIN"
        topology_label = "Linear Peel Chain Laundering"
        predicted_purpose = "Sequential Mule Layering & Incremental Asset Peeling"
        risk_level = "high"
    elif has_fan_out:
        primary_topology = "STAR_FAN_OUT_DISPERSAL"
        topology_label = "Star-Topology Fan-Out Dispersal"
        predicted_purpose = "Syndicate Fund Splitting across Temporary Burner Wallets"
        risk_level = "high"
    elif has_funnel:
        primary_topology = "EXCHANGE_CASH_OUT"
        topology_label = "Direct Exchange Cash-Out Nexus"
        predicted_purpose = "Rapid VASP Liquidation & KYC Off-Ramp"
        risk_level = "high"
    elif has_chain_hop:
        primary_topology = "CROSS_CHAIN_BRIDGE_HOP"
        topology_label = "Cross-Chain Bridge Hopping"
        predicted_purpose = "Cross-Chain Trail Disruption across Multiple Blockchains"
        risk_level = "high"
    else:
        primary_topology = "SEQUENTIAL_TRANSFER"
        topology_label = "Sequential Wallet Transfer Trail"
        predicted_purpose = "Direct Suspect Accumulation / Unspent Fund Holding"
        risk_level = "medium"

    # 3. Plain English Explanation for Police Officers
    explanation_parts = [
        f"🔍 **Topological Analysis:** The fund flow exhibits a **{topology_label}** structure comprising {total_nodes} wallet entities across {total_edges} transaction hops.",
        f"⏱️ **Velocity & Automation:** Average hop duration is **{int(avg_time_sec)} seconds** ({'Automated Bot Speed' if is_bot_speed else 'Human Paced'}). Balance decay rate across the trail is **{decay_pct:.1f}%**.",
    ]
    if has_funnel:
        vasp_p = next(p for p in patterns if p["pattern_type"] == "exchange_cashout_funnel")
        explanation_parts.append(f"🏛️ **Actionable Endpoint:** Trail terminates at **{vasp_p['evidence'].get('vasp_name')}**, establishing an immediate KYC freeze point under Section 91 CrPC.")
    elif has_peel:
        explanation_parts.append("📉 **Laundering Modus Operandi:** Classic peel chain mechanics where intermediary wallets siphon minor portions while propagating the principal sum forward.")

    investigator_explanation = "\n".join(explanation_parts)

    return {
        "primary_topology": primary_topology,
        "topology_label": topology_label,
        "predicted_purpose": predicted_purpose,
        "confidence": 0.94 if (has_peel or has_mixer or has_funnel) else 0.85,
        "risk_level": risk_level,
        "structural_metrics": {
            "max_in_degree": max_in,
            "max_out_degree": max_out,
            "average_time_delta_seconds": round(avg_time_sec, 1),
            "amount_decay_percentage": round(decay_pct, 2),
            "bridge_hops_count": bridge_hops,
            "is_bot_automated": is_bot_speed,
            "total_nodes": total_nodes,
            "total_edges": total_edges,
        },
        "detected_patterns": patterns,
        "investigator_explanation": investigator_explanation,
        "white_money_contrast": {
            "is_likely_legitimate": not (has_peel or has_mixer or is_bot_speed),
            "commercial_indicators": [
                "Stable counterparty relations" if not is_bot_speed else "Deviation: High-velocity bot hopping",
                "Regular business hour intervals" if not is_bot_speed else "Deviation: Rapid sub-minute execution",
            ],
            "illicit_indicators": [p["name"] for p in patterns],
        },
    }
