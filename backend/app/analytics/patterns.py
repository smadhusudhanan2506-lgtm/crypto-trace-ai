"""
CryptoTrace AI — Fraud Pattern Detection Engine
13 deterministic pattern detectors with explainable results.
IMPORTANT: Patterns are investigative indicators, NOT proof of criminal activity.
"""
from typing import List, Dict, Any
from datetime import timedelta
from collections import Counter


def detect_patterns(hops: List[dict], transactions: List[dict]) -> List[dict]:
    """
    Run all pattern detectors on traced hops and transactions.
    Returns list of detected patterns with evidence.
    """
    patterns = []

    if not hops:
        return patterns

    patterns.extend(_detect_fan_out(hops))
    patterns.extend(_detect_fan_in(hops))
    patterns.extend(_detect_rapid_forwarding(hops))
    patterns.extend(_detect_layering(hops))
    patterns.extend(_detect_structuring(hops))
    patterns.extend(_detect_consolidation(hops))
    patterns.extend(_detect_splitting(hops))
    patterns.extend(_detect_round_amounts(hops))
    patterns.extend(_detect_time_clustering(hops))

    return patterns


def _detect_fan_out(hops: List[dict]) -> List[dict]:
    """Fan-out: one address sends to many different addresses."""
    patterns = []
    sender_targets: Dict[str, set] = {}
    sender_txs: Dict[str, list] = {}

    for hop in hops:
        src = hop.get("source_address", "")
        dst = hop.get("destination_address", "")
        if src:
            sender_targets.setdefault(src, set()).add(dst)
            sender_txs.setdefault(src, []).append(hop.get("tx_hash", ""))

    for addr, targets in sender_targets.items():
        if len(targets) >= 5:
            patterns.append({
                "pattern_type": "fan_out",
                "description": f"High fan-out detected: address {addr[:12]}... sent to {len(targets)} different addresses",
                "severity": "high" if len(targets) >= 10 else "medium",
                "confidence": min(0.9, 0.5 + len(targets) * 0.05),
                "risk_points": 15,
                "evidence": {
                    "address": addr,
                    "target_count": len(targets),
                    "targets": list(targets)[:10],
                },
                "related_transactions": sender_txs.get(addr, [])[:10],
            })

    return patterns


def _detect_fan_in(hops: List[dict]) -> List[dict]:
    """Fan-in: many addresses send to one address."""
    patterns = []
    receiver_sources: Dict[str, set] = {}
    receiver_txs: Dict[str, list] = {}

    for hop in hops:
        src = hop.get("source_address", "")
        dst = hop.get("destination_address", "")
        if dst:
            receiver_sources.setdefault(dst, set()).add(src)
            receiver_txs.setdefault(dst, []).append(hop.get("tx_hash", ""))

    for addr, sources in receiver_sources.items():
        if len(sources) >= 5:
            patterns.append({
                "pattern_type": "fan_in",
                "description": f"High fan-in detected: address {addr[:12]}... received from {len(sources)} different addresses",
                "severity": "high" if len(sources) >= 10 else "medium",
                "confidence": min(0.9, 0.5 + len(sources) * 0.05),
                "risk_points": 15,
                "evidence": {
                    "address": addr,
                    "source_count": len(sources),
                    "sources": list(sources)[:10],
                },
                "related_transactions": receiver_txs.get(addr, [])[:10],
            })

    return patterns


def _detect_rapid_forwarding(hops: List[dict]) -> List[dict]:
    """Rapid forwarding: funds leave address within minutes of arrival."""
    patterns = []
    # Group by address: incoming and outgoing timestamps
    addr_incoming: Dict[str, list] = {}
    addr_outgoing: Dict[str, list] = {}

    for hop in hops:
        ts = hop.get("timestamp")
        if not ts:
            continue
        dst = hop.get("destination_address", "")
        src = hop.get("source_address", "")
        if dst:
            addr_incoming.setdefault(dst, []).append({"ts": ts, "hop": hop})
        if src:
            addr_outgoing.setdefault(src, []).append({"ts": ts, "hop": hop})

    for addr in set(addr_incoming.keys()) & set(addr_outgoing.keys()):
        for inc in addr_incoming[addr]:
            for out in addr_outgoing[addr]:
                try:
                    if hasattr(inc["ts"], 'timestamp') and hasattr(out["ts"], 'timestamp'):
                        diff = (out["ts"] - inc["ts"]).total_seconds()
                    else:
                        continue
                    if 0 < diff < 600:  # Within 10 minutes
                        patterns.append({
                            "pattern_type": "rapid_forwarding",
                            "description": f"Rapid forwarding at {addr[:12]}...: funds forwarded within {int(diff)} seconds",
                            "severity": "high" if diff < 180 else "medium",
                            "confidence": 0.85,
                            "risk_points": 15,
                            "evidence": {
                                "address": addr,
                                "time_delta_seconds": diff,
                            },
                            "related_transactions": [
                                inc["hop"].get("tx_hash", ""),
                                out["hop"].get("tx_hash", ""),
                            ],
                        })
                        break  # One detection per address
                except (TypeError, AttributeError):
                    continue

    return patterns


def _detect_layering(hops: List[dict]) -> List[dict]:
    """Layering: funds pass through multiple single-hop intermediaries."""
    patterns = []

    # Build chain: A→B→C→D where each address appears exactly once as source and once as destination
    chain = []
    current = None
    for hop in sorted(hops, key=lambda h: h.get("hop_number", 0)):
        dst = hop.get("destination_address", "")
        src = hop.get("source_address", "")
        if current is None or src == current:
            chain.append(hop)
            current = dst
        else:
            if len(chain) >= 3:
                patterns.append({
                    "pattern_type": "layering",
                    "description": f"Layering pattern detected: funds passed through {len(chain)} sequential intermediary addresses",
                    "severity": "high" if len(chain) >= 5 else "medium",
                    "confidence": min(0.85, 0.5 + len(chain) * 0.1),
                    "risk_points": 10,
                    "evidence": {
                        "chain_length": len(chain),
                        "addresses": [h.get("destination_address", "") for h in chain],
                    },
                    "related_transactions": [h.get("tx_hash", "") for h in chain],
                })
            chain = [hop]
            current = dst

    if len(chain) >= 3:
        patterns.append({
            "pattern_type": "layering",
            "description": f"Layering pattern detected: funds passed through {len(chain)} sequential intermediary addresses",
            "severity": "high" if len(chain) >= 5 else "medium",
            "confidence": min(0.85, 0.5 + len(chain) * 0.1),
            "risk_points": 10,
            "evidence": {
                "chain_length": len(chain),
                "addresses": [h.get("destination_address", "") for h in chain],
            },
            "related_transactions": [h.get("tx_hash", "") for h in chain],
        })

    return patterns


def _detect_structuring(hops: List[dict]) -> List[dict]:
    """Structuring: repeated transfers of similar amounts."""
    patterns = []
    amounts = [hop.get("amount", 0) for hop in hops if hop.get("amount", 0) > 0]

    if len(amounts) < 3:
        return patterns

    # Round to 2 decimals and count
    rounded = [round(a, 2) for a in amounts]
    counter = Counter(rounded)

    for amount, count in counter.most_common(5):
        if count >= 3:
            patterns.append({
                "pattern_type": "structuring",
                "description": f"Possible structuring: {count} transactions with similar amount ({amount})",
                "severity": "medium",
                "confidence": min(0.8, 0.4 + count * 0.1),
                "risk_points": 10,
                "evidence": {
                    "repeated_amount": amount,
                    "occurrence_count": count,
                },
                "related_transactions": [],
            })

    return patterns


def _detect_consolidation(hops: List[dict]) -> List[dict]:
    """Consolidation: multiple wallets merge funds into one."""
    return _detect_fan_in(hops)  # Same detection, different name for reporting


def _detect_splitting(hops: List[dict]) -> List[dict]:
    """Splitting: one transaction divides funds to many addresses."""
    patterns = []
    tx_outputs: Dict[str, list] = {}

    for hop in hops:
        tx = hop.get("tx_hash", "")
        if tx:
            tx_outputs.setdefault(tx, []).append(hop.get("destination_address", ""))

    for tx_hash, destinations in tx_outputs.items():
        unique_dests = set(destinations)
        if len(unique_dests) >= 5:
            patterns.append({
                "pattern_type": "splitting",
                "description": f"Fund splitting: transaction sent to {len(unique_dests)} different addresses",
                "severity": "medium",
                "confidence": 0.7,
                "risk_points": 10,
                "evidence": {
                    "tx_hash": tx_hash,
                    "destination_count": len(unique_dests),
                },
                "related_transactions": [tx_hash],
            })

    return patterns


def _detect_round_amounts(hops: List[dict]) -> List[dict]:
    """Suspicious round-number transfers."""
    patterns = []
    round_count = 0
    total = 0

    for hop in hops:
        amount = hop.get("amount", 0)
        if amount > 0:
            total += 1
            # Check if amount is a round number (within 0.001)
            if amount == int(amount) or (amount * 10) == int(amount * 10):
                round_count += 1

    if total > 5 and round_count / total > 0.6:
        patterns.append({
            "pattern_type": "round_amounts",
            "description": f"High proportion of round-number transfers: {round_count}/{total} ({int(round_count/total*100)}%)",
            "severity": "low",
            "confidence": 0.5,
            "risk_points": 5,
            "evidence": {
                "round_count": round_count,
                "total_count": total,
                "ratio": round(round_count / total, 2),
            },
            "related_transactions": [],
        })

    return patterns


def _detect_time_clustering(hops: List[dict]) -> List[dict]:
    """Burst of transactions in a short time window."""
    patterns = []
    timestamps = []

    for hop in hops:
        ts = hop.get("timestamp")
        if ts and hasattr(ts, 'timestamp'):
            timestamps.append(ts)

    if len(timestamps) < 3:
        return patterns

    timestamps.sort()

    # Check for 5+ transactions within 10 minutes
    for i in range(len(timestamps) - 4):
        window = timestamps[i:i + 5]
        try:
            span = (window[-1] - window[0]).total_seconds()
            if span < 600:  # 10 minutes
                patterns.append({
                    "pattern_type": "time_clustering",
                    "description": f"Transaction burst: 5+ transactions within {int(span)} seconds",
                    "severity": "medium",
                    "confidence": 0.7,
                    "risk_points": 5,
                    "evidence": {
                        "transaction_count": 5,
                        "time_span_seconds": span,
                    },
                    "related_transactions": [],
                })
                break  # One detection
        except (TypeError, AttributeError):
            continue

    return patterns
