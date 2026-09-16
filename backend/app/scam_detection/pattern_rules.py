"""
CryptoTrace AI — Scam Pattern Rules & Weight Configurations
Defines explainable heuristic rules, feature weights, and neutral evidentiary constraints.
"""
from typing import Dict, Any, List

# Standard legal & analytical limitations
STANDARD_LIMITATIONS = [
    "Blockchain transaction patterns indicate structural behavior consistent with known scam archetypes; on-chain data alone cannot establish off-chain intent, real-world identity, or legal culpability.",
    "Interaction with bridges, DEXs, or custodial exchanges is not standalone proof of criminal misconduct.",
    "Classification reflects behavioral consistency, not absolute judicial certainty."
]

CATEGORY_LIMITATIONS: Dict[str, str] = {
    "romance_payment": "Payment behavior is consistent with a repeated-payment pattern; blockchain ledger data alone cannot establish the personal or social pretext.",
    "job_task": "Deposit cadence is consistent with task/job commission structures; off-chain communications are required to verify the employer/recruiter relationship.",
    "extortion_blackmail": "Observed fund flow matches single-source coercive payment mechanics; blockchain records cannot independently verify the existence of off-chain extortion threats.",
    "rug_pull": "Token liquidity movements are consistent with developer withdrawal patterns; independent smart contract audit and tokenomics review are recommended.",
}

# The 10 standardized scam pattern definitions
SCAM_CATEGORIES = {
    "investment_ponzi": {
        "id": "investment_ponzi",
        "name": "Investment / Ponzi-type Pattern",
        "badge": "High Yield / Pooling Pattern",
        "description": "Multiple independent source wallets send funds into common collection addresses followed by consolidation and onward movement.",
        "threshold": 35,
    },
    "phishing_drainer": {
        "id": "phishing_drainer",
        "name": "Phishing / Wallet Drain Pattern",
        "badge": "Automated Unauthorized Drain",
        "description": "Rapid, high-velocity movement of victim assets followed by multi-wallet dispersal or immediate decentralized token swapping.",
        "threshold": 35,
    },
    "fake_exchange": {
        "id": "fake_exchange",
        "name": "Fake Exchange / Platform Deposit Nexus",
        "badge": "Synthetic Deposit Gate",
        "description": "Multiple unrelated wallets appear to send funds through a common collection/deposit infrastructure masquerading as an exchange.",
        "threshold": 35,
    },
    "giveaway": {
        "id": "giveaway",
        "name": "Giveaway / Doubling Scam Pattern",
        "badge": "Multi-Inflow Ingestion",
        "description": "Multiple unrelated wallets transfer similar round amounts toward a single address with zero return distributions.",
        "threshold": 30,
    },
    "romance_payment": {
        "id": "romance_payment",
        "name": "Repeated Single-Source Payment Pattern (Romance / Pig-Butchering Archetype)",
        "badge": "Sequential Single-Victim Payments",
        "description": "Individual victim wallet makes repeated progressive transfers over an extended timeline to the same recipient nexus.",
        "threshold": 30,
    },
    "job_task": {
        "id": "job_task",
        "name": "Task / Job Commission Scam Pattern",
        "badge": "Structured Micro-Deposits",
        "description": "Multiple source wallets submit repeated structured micro-deposits into a common collection nexus with tiered threshold escalation.",
        "threshold": 30,
    },
    "rug_pull": {
        "id": "rug_pull",
        "name": "Token Liquidity Siphoning (Rug Pull Archetype)",
        "badge": "Liquidity Pool Removal",
        "description": "Sudden large-scale extraction of pooled assets or liquidity tokens from a decentralized trading pair after accumulation.",
        "threshold": 35,
    },
    "extortion_blackmail": {
        "id": "extortion_blackmail",
        "name": "Coercive / Ransom Payment Pattern",
        "badge": "Direct Demand Flow",
        "description": "Direct urgent transfer from victim wallet followed by immediate peeling or mixer routing without commercial counterparty context.",
        "threshold": 45,
    },
    "cross_chain_movement": {
        "id": "cross_chain_movement",
        "name": "Cross-Chain Asset Hopping Indicator",
        "badge": "Bridge Obfuscation",
        "description": "Assets routed through decentralized cross-chain bridge protocols to sever direct single-ledger tracing continuity.",
        "threshold": 25,
    },
    "insufficient_evidence": {
        "id": "insufficient_evidence",
        "name": "Insufficient Evidence / Unclassified Behavior",
        "badge": "Inconclusive Ledger Telemetry",
        "description": "Available transaction graph data does not exhibit distinctive clustering or topological signatures of known scam archetypes.",
        "threshold": 0,
    }
}

# Configurable explainable scoring weights (Max theoretical = 100)
SCAM_PATTERN_WEIGHTS: Dict[str, Dict[str, int]] = {
    "investment_ponzi": {
        "many_sources_fan_in": 25,
        "common_collection_wallet": 20,
        "fund_consolidation": 15,
        "onward_forwarding_layering": 15,
        "amount_similarity_clustering": 10,
        "cross_case_correlation": 15,
    },
    "phishing_drainer": {
        "rapid_forwarding_speed": 25,
        "wallet_splitting_fan_out": 25,
        "high_asset_concentration_drain": 20,
        "token_swap_or_contract_call": 15,
        "cross_case_correlation": 15,
    },
    "fake_exchange": {
        "multiple_victim_inflows": 25,
        "deposit_like_infrastructure": 20,
        "high_value_collection_hub": 20,
        "delayed_structured_forwarding": 15,
        "cross_case_correlation": 20,
    },
    "giveaway": {
        "many_unrelated_sources": 30,
        "single_destination_sink": 25,
        "similar_round_amounts": 25,
        "no_outflow_returns": 20,
    },
    "romance_payment": {
        "single_dominant_source": 35,
        "repeated_transfers_over_time": 30,
        "progressive_escalating_amounts": 20,
        "intermediary_layering_hops": 15,
    },
    "job_task": {
        "multiple_source_deposits": 25,
        "small_repeated_amounts": 25,
        "common_collection_nexus": 25,
        "rapid_downstream_consolidation": 15,
        "cross_case_correlation": 10,
    },
    "rug_pull": {
        "dex_or_liquidity_interaction": 35,
        "sudden_large_single_withdrawal": 30,
        "token_swapping_activity": 20,
        "unhosted_wallet_exit": 15,
    },
    "extortion_blackmail": {
        "direct_single_victim_transfer": 20,
        "immediate_forwarding_or_peel": 30,
        "round_or_exact_demanded_sum": 25,
        "high_velocity_movement": 25,
    }
}
