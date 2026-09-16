"""
CryptoTrace AI — Graph Feature Extractor
Extracts quantitative topological, temporal, token, and fund-flow features
from transaction graphs and hop sequences.
"""
from typing import List, Dict, Any, Optional, Set, Tuple
from datetime import datetime, timezone
import math


def extract_features(
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
    chain: str = "ethereum",
    start_address: str = "",
    start_tx_hash: str = "",
) -> Dict[str, Any]:
    """
    Extracts structural graph, financial flow, temporal, token, and service features
    from node-edge topology data.
    """
    total_nodes = len(nodes)
    total_edges = len(edges)

    if total_nodes == 0 and total_edges == 0:
        return _empty_feature_dict(chain)

    # 1. Degree & Adjacency Mappings
    in_degrees: Dict[str, int] = {}
    out_degrees: Dict[str, int] = {}
    inflow_amounts: Dict[str, float] = {}
    outflow_amounts: Dict[str, float] = {}
    senders: Set[str] = set()
    receivers: Set[str] = set()
    dest_counts: Dict[str, int] = {}
    source_counts: Dict[str, int] = {}

    amounts: List[float] = []
    timestamps: List[datetime] = []
    tokens: Set[str] = set()
    token_tx_count = 0
    native_tx_count = 0
    chains_seen: Set[str] = {chain.lower()} if chain else set()
    has_bridge = False
    has_dex = False
    has_mixer = False
    vasp_names: Set[str] = set()

    for n in nodes:
        nid = str(n.get("id", "")).lower()
        nchain = str(n.get("chain", "")).lower()
        if nchain:
            chains_seen.add(nchain)
        label = str(n.get("label", "")).lower()
        entity = str(n.get("entity", "")).lower()
        ntype = str(n.get("type", "")).lower()

        # VASP detection
        if ntype == "vasp" or "exchange" in label or "vasp" in label or "binance" in entity or "coinbase" in entity:
            v_name = n.get("entity") or n.get("label") or "Known VASP"
            vasp_names.add(str(v_name))
        
        # Bridge detection
        if "bridge" in label or "bridge" in entity or "portal" in label or "wormhole" in label or "stargate" in label:
            has_bridge = True

        # DEX detection
        if "uniswap" in label or "swap" in label or "pancake" in label or "dex" in label or "router" in label:
            has_dex = True

        # Mixer detection
        if "tornado" in label or "mixer" in label or "tumbler" in label or "anonymizer" in label:
            has_mixer = True

    for e in edges:
        src = str(e.get("source", "") or "").lower()
        tgt = str(e.get("target", "") or "").lower()
        raw_val = e.get("amount", 0)
        try:
            val = float(raw_val or 0)
        except (ValueError, TypeError):
            val = 0.0
        asset = str(e.get("asset", "") or "").upper()
        echain = str(e.get("chain", "") or "").lower()
        if echain:
            chains_seen.add(echain)

        if src:
            senders.add(src)
            out_degrees[src] = out_degrees.get(src, 0) + 1
            outflow_amounts[src] = outflow_amounts.get(src, 0.0) + val
            source_counts[src] = source_counts.get(src, 0) + 1
        if tgt:
            receivers.add(tgt)
            in_degrees[tgt] = in_degrees.get(tgt, 0) + 1
            inflow_amounts[tgt] = inflow_amounts.get(tgt, 0.0) + val
            dest_counts[tgt] = dest_counts.get(tgt, 0) + 1

        if val > 0:
            amounts.append(val)

        if asset and asset not in ["ETH", "BTC", "SOL", "TRX", "MATIC", "BNB"]:
            tokens.add(asset)
            token_tx_count += 1
        else:
            native_tx_count += 1

        ts_str = str(e.get("timestamp", ""))
        if ts_str:
            try:
                # Parse ISO timestamp or UNIX epoch
                if ts_str.isdigit():
                    timestamps.append(datetime.fromtimestamp(int(ts_str), tz=timezone.utc))
                else:
                    ts_clean = ts_str.replace("Z", "+00:00")
                    timestamps.append(datetime.fromisoformat(ts_clean))
            except Exception:
                pass

    # 2. Graph Topologies: Fan-in, Fan-out, Splitting, Consolidation
    wallet_splitting_events = sum(1 for deg in out_degrees.values() if deg >= 2)
    wallet_merging_events = sum(1 for deg in in_degrees.values() if deg >= 2)
    max_in_degree = max(in_degrees.values(), default=0)
    max_out_degree = max(out_degrees.values(), default=0)
    branching_factor = round(total_edges / max(1, total_nodes), 2)

    has_fan_out = max_out_degree >= 3 or wallet_splitting_events >= 2
    has_fan_in = max_in_degree >= 3 or (len(senders) >= 3 and len(receivers) <= 2)

    # Consolidation: multiple source nodes send to a hub that then forwards > 60% downstream
    has_consolidation = False
    for node_id, in_deg in in_degrees.items():
        if in_deg >= 2 and out_degrees.get(node_id, 0) >= 1:
            in_tot = inflow_amounts.get(node_id, 0.0)
            out_tot = outflow_amounts.get(node_id, 0.0)
            if in_tot > 0 and (out_tot / in_tot) >= 0.5:
                has_consolidation = True
                break

    # 3. Hop depth calculation
    max_hop_depth = 0
    for n in nodes:
        hop = n.get("hop")
        if isinstance(hop, (int, float)):
            max_hop_depth = max(max_hop_depth, int(hop))
    if max_hop_depth == 0 and total_edges > 0:
        max_hop_depth = min(total_edges, 5)

    # 4. Money Flow Features
    total_amount_received = round(sum(amounts), 4)
    total_amount_sent = round(sum(outflow_amounts.values()), 4)
    largest_dest_pct = 0.0
    if total_amount_received > 0 and inflow_amounts:
        largest_dest_pct = round((max(inflow_amounts.values(), default=0.0) / total_amount_received) * 100, 1)

    largest_src_pct = 0.0
    if total_amount_sent > 0 and outflow_amounts:
        largest_src_pct = round((max(outflow_amounts.values(), default=0.0) / total_amount_sent) * 100, 1)

    # Amount concentration
    amount_concentration = round(max(amounts, default=0.0) / max(0.0001, total_amount_received), 2) if total_amount_received > 0 else 0.0

    # Amount similarity / Clustering
    similar_amounts_count = 0
    if len(amounts) >= 3:
        # Check standard deviation or pair similarity
        for i in range(len(amounts)):
            for j in range(i + 1, len(amounts)):
                if amounts[i] > 0 and abs(amounts[i] - amounts[j]) / amounts[i] < 0.05:
                    similar_amounts_count += 1
                    break
    amount_similarity_ratio = round(similar_amounts_count / max(1, len(amounts)), 2)

    # 5. Temporal Features
    timestamps.sort()
    time_deltas_seconds: List[float] = []
    if len(timestamps) >= 2:
        for k in range(len(timestamps) - 1):
            delta = (timestamps[k+1] - timestamps[k]).total_seconds()
            if delta >= 0:
                time_deltas_seconds.append(delta)

    avg_time_delta = round(sum(time_deltas_seconds) / max(1, len(time_deltas_seconds)), 1) if time_deltas_seconds else 0.0
    rapid_transfer_count = sum(1 for d in time_deltas_seconds if d <= 300)
    has_rapid_forwarding = len(time_deltas_seconds) >= 1 and (rapid_transfer_count >= 1 or avg_time_delta < 180)

    first_ts = timestamps[0].isoformat() if timestamps else ""
    last_ts = timestamps[-1].isoformat() if timestamps else ""

    # 6. Cross-Chain Features
    is_cross_chain = len(chains_seen) > 1 or has_bridge
    chain_switches_count = max(0, len(chains_seen) - 1)

    return {
        # Graph
        "total_nodes": total_nodes,
        "total_edges": total_edges,
        "number_of_hops": max_hop_depth,
        "max_hop_depth": max_hop_depth,
        "incoming_tx_count": total_edges,
        "outgoing_tx_count": total_edges,
        "unique_senders": len(senders),
        "unique_receivers": len(receivers),
        "source_wallet_count": len(senders),
        "destination_wallet_count": len(receivers),
        "wallet_splitting_events": wallet_splitting_events,
        "wallet_merging_events": wallet_merging_events,
        "max_in_degree": max_in_degree,
        "max_out_degree": max_out_degree,
        "branching_factor": branching_factor,
        "has_fan_in": has_fan_in,
        "has_fan_out": has_fan_out,
        "has_consolidation": has_consolidation,
        "repeated_destinations": sum(1 for c in dest_counts.values() if c >= 2),
        "repeated_sources": sum(1 for c in source_counts.values() if c >= 2),
        # Money Flow
        "total_amount_received": total_amount_received,
        "total_amount_sent": total_amount_sent,
        "amount_concentration": amount_concentration,
        "largest_destination_pct": largest_dest_pct,
        "largest_source_pct": largest_src_pct,
        "small_repeated_txs_count": sum(1 for a in amounts if a < 0.1),
        "large_transfers_count": sum(1 for a in amounts if a >= 1.0),
        "transaction_amount_similarity": amount_similarity_ratio,
        "fund_consolidation_ratio": round(largest_dest_pct / 100.0, 2),
        # Time
        "first_timestamp": first_ts,
        "last_timestamp": last_ts,
        "time_between_transactions_avg": avg_time_delta,
        "rapid_transfer_count": rapid_transfer_count,
        "has_rapid_forwarding": has_rapid_forwarding,
        "burst_activity_detected": rapid_transfer_count >= 2,
        # Token
        "distinct_tokens_count": len(tokens),
        "token_transfer_count": token_tx_count,
        "native_transfers_count": native_tx_count,
        "token_swap_detected": has_dex,
        "approval_interaction_detected": False,
        # Cross-Chain
        "is_cross_chain": is_cross_chain,
        "bridge_detected": has_bridge,
        "source_chain": chain,
        "dest_chain": list(chains_seen)[-1] if chains_seen else chain,
        "chain_switches_count": chain_switches_count,
        # Services
        "vasp_exchange_detected": len(vasp_names) > 0,
        "vasp_names": list(vasp_names),
        "dex_detected": has_dex,
        "mixer_detected": has_mixer,
    }


def _empty_feature_dict(chain: str) -> Dict[str, Any]:
    return {
        "total_nodes": 0,
        "total_edges": 0,
        "number_of_hops": 0,
        "max_hop_depth": 0,
        "incoming_tx_count": 0,
        "outgoing_tx_count": 0,
        "unique_senders": 0,
        "unique_receivers": 0,
        "source_wallet_count": 0,
        "destination_wallet_count": 0,
        "wallet_splitting_events": 0,
        "wallet_merging_events": 0,
        "max_in_degree": 0,
        "max_out_degree": 0,
        "branching_factor": 0.0,
        "has_fan_in": False,
        "has_fan_out": False,
        "has_consolidation": False,
        "repeated_destinations": 0,
        "repeated_sources": 0,
        "total_amount_received": 0.0,
        "total_amount_sent": 0.0,
        "amount_concentration": 0.0,
        "largest_destination_pct": 0.0,
        "largest_source_pct": 0.0,
        "small_repeated_txs_count": 0,
        "large_transfers_count": 0,
        "transaction_amount_similarity": 0.0,
        "fund_consolidation_ratio": 0.0,
        "first_timestamp": "",
        "last_timestamp": "",
        "time_between_transactions_avg": 0.0,
        "rapid_transfer_count": 0,
        "has_rapid_forwarding": False,
        "burst_activity_detected": False,
        "distinct_tokens_count": 0,
        "token_transfer_count": 0,
        "native_transfers_count": 0,
        "token_swap_detected": False,
        "approval_interaction_detected": False,
        "is_cross_chain": False,
        "bridge_detected": False,
        "source_chain": chain,
        "dest_chain": chain,
        "chain_switches_count": 0,
        "vasp_exchange_detected": False,
        "vasp_names": [],
        "dex_detected": False,
        "mixer_detected": False,
    }
