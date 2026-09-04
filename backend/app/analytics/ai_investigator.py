"""
CryptoTrace AI — AI Behavioral & Graph Fraud Analysis Engine
Forensic engine that evaluates transaction graphs, fund velocity, structuring,
cross-references victim complaints, and classifies criminal modus operandi.
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.victims.models import Victim
from app.cases.models import Case
from app.tracing import Trace, TraceHop, Transaction, Wallet
from app.analytics.patterns import detect_patterns
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


async def run_ai_investigation(
    db: AsyncSession,
    trace_id: Optional[str] = None,
    graph_data: Optional[dict] = None,
    chain: str = "ethereum",
    total_value: float = 0.0,
    hops: Optional[List[dict]] = None,
    custom_context: Optional[dict] = None,
) -> dict:
    """
    Primary AI Investigation Entrypoint.
    Analyzes graph structure, amount flow, scammer behavioral patterns,
    cross-victim database matches, and delivers a police-grade forensic assessment.
    """
    # 1. Fetch trace data if trace_id is given
    trace = None
    if trace_id:
        result = await db.execute(select(Trace).where(Trace.id == trace_id))
        trace = result.scalar_one_or_none()
        if trace:
            chain = trace.chain or chain
            total_value = trace.total_value or total_value
            if not graph_data:
                graph_data = trace.graph_data or {}
            if not hops:
                hop_result = await db.execute(
                    select(TraceHop).where(TraceHop.trace_id == trace_id).order_by(TraceHop.hop_number)
                )
                trace_hops = list(hop_result.scalars().all())
                hops = [{
                    "hop_number": h.hop_number,
                    "source_address": h.source_address,
                    "destination_address": h.destination_address,
                    "tx_hash": h.tx_hash,
                    "amount": h.amount,
                    "asset": h.asset,
                    "timestamp": h.timestamp,
                    "chain": h.chain,
                    "is_vasp_endpoint": h.is_vasp_endpoint,
                    "vasp_name": h.vasp_name,
                } for h in trace_hops]

    hops = hops or []
    nodes = graph_data.get("nodes", []) if graph_data else []
    edges = graph_data.get("edges", []) if graph_data else []

    # 2. Identify all wallet addresses in this trace
    wallet_addresses = set()
    for node in nodes:
        if isinstance(node, dict) and "id" in node:
            wallet_addresses.add(node["id"].lower())
    for hop in hops:
        if hop.get("source_address"):
            wallet_addresses.add(hop["source_address"].lower())
        if hop.get("destination_address"):
            wallet_addresses.add(hop["destination_address"].lower())

    # 3. Cross-Victim Complaint Database Matching
    victim_matches = await _match_victim_complaints(db, list(wallet_addresses))

    # 4. Pattern Detection
    detected_patterns = detect_patterns(hops, [])

    # 5. Environment & Testnet vs Mainnet Assessment
    is_sepolia = "sepolia" in chain.lower() or (trace and "sepolia" in (trace.chain or "").lower())
    is_demo = is_sepolia or (trace and getattr(trace, "is_demo", False)) or any(
        "demo" in str(h.get("tx_hash", "")).lower() for h in hops
    )

    # 6. Amount & Velocity Classification
    amount_analysis = _analyze_amount_and_volume(hops, total_value, chain)

    # 7. Modus Operandi & Criminal Intent Classification
    intent_analysis = _classify_criminal_intent(
        hops=hops,
        nodes=nodes,
        patterns=detected_patterns,
        victim_matches=victim_matches,
        total_value=total_value,
        amount_analysis=amount_analysis,
    )

    # 8. Police / Law Enforcement Action Plan
    police_plan = _generate_police_action_plan(
        chain=chain,
        intent=intent_analysis,
        victim_matches=victim_matches,
        nodes=nodes,
        hops=hops,
        is_sepolia=is_sepolia,
    )

    # 9. Natural Language Executive Summary
    executive_summary = _generate_executive_summary(
        chain=chain,
        is_sepolia=is_sepolia,
        intent=intent_analysis,
        victim_matches=victim_matches,
        amount_analysis=amount_analysis,
        hops_count=len(hops),
        wallets_count=len(wallet_addresses),
    )

    # Optional LLM Intelligence narrative enrichment (Groq / OpenAI)
    llm_narrative = await _call_llm_intelligence(
        chain=chain,
        is_sepolia=is_sepolia,
        intent=intent_analysis,
        victim_matches=victim_matches,
        amount_analysis=amount_analysis,
        hops_count=len(hops),
        wallets_count=len(wallet_addresses),
        patterns=detected_patterns,
    )
    if llm_narrative:
        executive_summary = llm_narrative

    # 10. Compute Risk Score & Fraud Confidence
    confidence_score = _calculate_confidence(intent_analysis, victim_matches, detected_patterns)
    risk_level = "critical" if confidence_score >= 80 else "high" if confidence_score >= 60 else "medium" if confidence_score >= 35 else "low"

    assessment = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "chain": chain,
        "is_sepolia": is_sepolia,
        "is_demo": is_demo,
        "environment_badge": {
            "label": "PROTOTYPE DEMO / TESTNET (SEPOLIA)" if is_sepolia else "LIVE BLOCKCHAIN ASSET FLOW (MAINNET)",
            "type": "testnet" if is_sepolia else "mainnet",
            "is_real_loss": not is_sepolia,
            "disclaimer": (
                "SEPOLIA TESTNET NOTICE: This trace was conducted on the Ethereum Sepolia Testnet. "
                "Sepolia tokens have NO monetary value. This is a prototype/demonstration trace for investigative testing "
                "and police training ('Not a real financial loss'). However, the behavioral heuristics accurately simulate "
                "real-world scammer and money laundering patterns."
                if is_sepolia else
                "MAINNET FORENSIC NOTICE: This trace is mapped to real blockchain mainnet assets. "
                "Behavioral indicators suggest actionable intelligence for cyber crime investigation and asset preservation."
            ),
        },
        "verdict": {
            "is_scam": intent_analysis["is_scam_likely"],
            "fraud_type": intent_analysis["primary_typology"],
            "risk_level": risk_level,
            "confidence_score": confidence_score,
            "confidence_percentage": f"{confidence_score}%",
        },
        "executive_summary": executive_summary,
        "modus_operandi": intent_analysis,
        "amount_analysis": amount_analysis,
        "victim_correlations": {
            "total_matches": len(victim_matches),
            "matched_victims": victim_matches,
            "has_cross_victim_link": len(victim_matches) > 1,
            "summary": (
                f"Trace addresses matched {len(victim_matches)} separate victim complaints registered in the cyber crime database."
                if victim_matches else
                "No prior victim complaints on file for these specific addresses in the local case database."
            ),
        },
        "behavioral_patterns": detected_patterns,
        "police_action_plan": police_plan,
        "advisory_disclaimer": (
            "INVESTIGATIVE ADVISORY: This AI Behavioral Analysis is an intelligence tool designed to assist "
            "law enforcement and fraud analysts in identifying suspect fund trails. It does not constitute legal proof "
            "or final judicial determination of guilt. All crypto forensic findings must be validated with "
            "formal legal notices (e.g., Section 91 CrPC / Subpoena) and exchange KYC disclosures."
        ),
    }

    return assessment


async def _match_victim_complaints(db: AsyncSession, addresses: List[str]) -> List[dict]:
    """
    Cross-references trace addresses against all registered victim complaints and cases.
    """
    if not addresses:
        return []

    matches = []
    try:
        query = select(Victim, Case).join(Case, Victim.case_id == Case.id)
        result = await db.execute(query)
        all_victims_cases = result.all()

        lower_addrs = {a.lower() for a in addresses}

        for victim, case in all_victims_cases:
            victim_addr = (victim.wallet_address or "").lower()
            if victim_addr in lower_addrs:
                matches.append({
                    "victim_id": victim.victim_identifier or str(victim.id)[:8],
                    "case_number": case.case_number,
                    "case_title": case.title,
                    "matched_address": victim.wallet_address,
                    "amount_lost": victim.amount_lost,
                    "currency": victim.currency,
                    "cryptocurrency": victim.cryptocurrency or "ETH",
                    "complaint_date": victim.complaint_date.isoformat() if victim.complaint_date else None,
                    "complaint_description": victim.complaint_description or "Investment fraud complaint",
                    "match_type": "Victim Wallet Address Match",
                })
    except Exception as e:
        logger.warning(f"Error checking victim complaint matches: {e}")

    return matches


def _analyze_amount_and_volume(hops: List[dict], total_value: float, chain: str) -> dict:
    """
    Analyzes amount distribution, structuring heuristics, and volume tiers.
    """
    amounts = [h.get("amount", 0.0) for h in hops if h.get("amount", 0.0) > 0]
    asset = "BTC" if chain.lower() == "bitcoin" else "ETH"

    if not amounts:
        return {
            "total_value": total_value,
            "asset": asset,
            "tier": "Micro",
            "tier_description": "Negligible or zero balance transferred",
            "is_whale_movement": False,
            "structuring_detected": False,
            "average_hop_amount": 0.0,
            "max_single_transfer": 0.0,
        }

    max_amount = max(amounts)
    avg_amount = sum(amounts) / len(amounts)

    if total_value >= 10.0:
        tier = "Whale / High Value"
        tier_desc = f"Large financial volume ({total_value:.4f} {asset}). Indicative of syndicate-level operations or large scam proceeds."
        is_whale = True
    elif total_value >= 1.0:
        tier = "Retail Victim / Moderate"
        tier_desc = f"Moderate financial volume ({total_value:.4f} {asset}). Common for individual retail victim defrauding."
        is_whale = False
    elif total_value >= 0.05:
        tier = "Small Retail"
        tier_desc = f"Small value transfers ({total_value:.4f} {asset}). Typical for phishing drains or initial probe deposits."
        is_whale = False
    else:
        tier = "Micro / Test"
        tier_desc = f"Micro amounts ({total_value:.6f} {asset}). Often used for address validation or testnet testing."
        is_whale = False

    rounded = [round(a, 1) for a in amounts]
    structuring_detected = len(rounded) >= 3 and len(set(rounded)) <= len(rounded) / 2

    return {
        "total_value": round(total_value, 6),
        "asset": asset,
        "tier": tier,
        "tier_description": tier_desc,
        "is_whale_movement": is_whale,
        "structuring_detected": structuring_detected,
        "average_hop_amount": round(avg_amount, 6),
        "max_single_transfer": round(max_amount, 6),
        "transfer_count": len(amounts),
    }


def _classify_criminal_intent(
    hops: List[dict],
    nodes: List[dict],
    patterns: List[dict],
    victim_matches: List[dict],
    total_value: float,
    amount_analysis: dict,
) -> dict:
    """
    Classifies the specific scammer modus operandi:
    - Scamming the victim for profit
    - Black money to white money (layering through money mules)
    - Illicit exchange / mixer cashout
    """
    pattern_types = {p.get("pattern_type") for p in patterns}
    
    # 1. Check for VASP / Exchange cashout
    has_vasp = any(h.get("is_vasp_endpoint") for h in hops) or any(
        n.get("type") == "vasp" or n.get("entity") for n in nodes
    )
    vasp_names = list({
        h.get("vasp_name") or n.get("entity")
        for h in hops if h.get("vasp_name")
        for n in nodes if n.get("entity")
    })

    # 2. Check for Money Laundering / Layering (multi-hop peeling)
    is_layering = (
        "layering" in pattern_types
        or len(hops) >= 3
        or "rapid_forwarding" in pattern_types
        or "peeling_chain" in pattern_types
    )

    # 3. Check for Multi-Victim Consolidation (Fan-In)
    is_fan_in = "fan_in" in pattern_types or len(victim_matches) > 1

    # 4. Check for Fund Splitting (Fan-Out)
    is_fan_out = "fan_out" in pattern_types or "splitting" in pattern_types

    # Determine Primary Typology
    if len(victim_matches) >= 2 or (is_fan_in and is_layering):
        primary_typology = "Organized Multi-Victim Investment Fraud Syndicate"
        is_scam = True
        summary = "Funds from multiple victim sources converge into a syndicate consolidation wallet, followed by layered intermediary forwarding."
    elif is_layering and has_vasp:
        primary_typology = "Money Laundering & Exchange Liquidation (Black to White)"
        is_scam = True
        summary = "Stolen funds are rapidly hopped through intermediate mule wallets to obfuscate origin before exiting into a centralized exchange."
    elif is_layering:
        primary_typology = "Money Mule Layering & Obfuscation"
        is_scam = True
        summary = "Sequential multi-hop transfers designed to break the linear trace and confuse blockchain tracing algorithms."
    elif is_fan_out:
        primary_typology = "Dispersal & Multi-Wallet Splitting"
        is_scam = True
        summary = "Proceeds are fractured into smaller amounts across dozens of secondary wallets to evade single-address tracking."
    elif len(victim_matches) == 1 or total_value > 0:
        primary_typology = "Direct Victim Fund Drain & Profit Siphoning"
        is_scam = True
        summary = "Direct transfer of victim cryptocurrency into a suspect-controlled holding wallet."
    else:
        primary_typology = "Routine Peer-to-Peer Transfer"
        is_scam = False
        summary = "Standard blockchain transaction flow with no distinct layering or fraud indicators."

    # Intent Breakdown Flags
    intents = []
    if is_scam or len(victim_matches) > 0:
        intents.append({
            "category": "Profit-Driven Scamming",
            "detected": True,
            "description": "Scamming victims under fraudulent pretenses (fake investment, phishing, or social engineering) to accumulate illicit cryptocurrency.",
            "evidence": f"Linked to {len(victim_matches)} victim complaints" if victim_matches else "High-risk fund flow following victim deposit profile",
        })

    if is_layering:
        intents.append({
            "category": "Black Money into White Money (Layering)",
            "detected": True,
            "description": "Converting tainted 'black' crypto into seemingly clean 'white' crypto by bouncing funds through multiple intermediary wallets.",
            "evidence": f"{len(hops)} intermediary hops detected with rapid forwarding between nodes",
        })

    if has_vasp:
        intents.append({
            "category": "Custodial Exchange Cashout",
            "detected": True,
            "description": "Attempting to liquidate cryptocurrency into fiat or untraceable assets via a centralized exchange (VASP).",
            "evidence": f"Funds traced to custodial endpoint: {', '.join(vasp_names) if vasp_names else 'Known VASP'}",
        })

    if amount_analysis.get("structuring_detected"):
        intents.append({
            "category": "Smurfing / Structuring",
            "detected": True,
            "description": "Splitting amounts into recurring uniform denominations to avoid triggering anti-money laundering (AML) alarm thresholds.",
            "evidence": "Repeated identical or near-identical transfer amounts detected across hops",
        })

    return {
        "is_scam_likely": is_scam,
        "primary_typology": primary_typology,
        "summary": summary,
        "intents": intents,
        "layering_hops_count": len(hops),
        "vasp_identified": has_vasp,
        "vasp_names": vasp_names,
    }


def _generate_police_action_plan(
    chain: str,
    intent: dict,
    victim_matches: List[dict],
    nodes: List[dict],
    hops: List[dict],
    is_sepolia: bool,
) -> List[dict]:
    """
    Generates tailored, actionable steps for Police / Cyber Crime Investigators.
    """
    actions = []

    # Step 1: Legal Notice / Subpoena if VASP exists
    if intent.get("vasp_identified"):
        vasps = ", ".join(intent.get("vasp_names", [])) or "Identified VASP"
        actions.append({
            "priority": "IMMEDIATE (Within 24 Hours)",
            "title": f"Serve Section 91 CrPC / Subpoena Notice to {vasps}",
            "purpose": "Identify the real-world identity of the criminal account holder and request deposit freeze.",
            "details": [
                f"Identify the recipient deposit address on {vasps}.",
                "Request KYC records (Full Name, National ID, Phone, Registered Email, linked Bank Account/UPI).",
                "Request IP login logs with timestamps, device user-agents, and withdrawal destination wallets.",
                "Issue a formal emergency freeze request under applicable cyber crime regulations to prevent fiat off-ramping.",
            ],
            "legal_basis": "Section 91 Cr.P.C. / MLAT / Intermediary Guidelines & Financial Intelligence Unit (FIU) mandate",
        })

    # Step 2: Cross-Case Merging if multiple victims
    if len(victim_matches) > 1:
        case_nums = list({m["case_number"] for m in victim_matches})
        actions.append({
            "priority": "HIGH (Case Coordination)",
            "title": f"Link & Consolidate {len(victim_matches)} Victim FIRs ({', '.join(case_nums)})",
            "purpose": "Establish an organized syndicate cyber crime case with higher aggregate financial impact.",
            "details": [
                f"Notify investigation officers of related cases ({', '.join(case_nums)}).",
                "Combine digital evidence logs and aggregate financial seizure orders.",
                "Track the primary suspect wallet as the central nexus across all linked victim FIRs.",
            ],
            "legal_basis": "Joint Investigation / State Cyber Crime Cell Syndicate Consolidation",
        })

    # Step 3: Wallet Monitoring & Watchlist
    actions.append({
        "priority": "MEDIUM (Ongoing Surveillance)",
        "title": "Place Trace Wallets on Real-Time Watchlist",
        "purpose": "Receive automated webhook alerts whenever funds move out of intermediate mule wallets.",
        "details": [
            f"Add all {len(nodes)} identified wallet addresses to active monitoring queue.",
            "Configure notification trigger for any outbound transaction > 0.01 ETH.",
            "Monitor for secondary bridge or DEX swapping interactions (e.g., Uniswap, Tornado Cash, Stargate).",
        ],
        "legal_basis": "Law Enforcement Cyber Intelligence Monitoring",
    })

    # Step 4: Evidence Hash Integrity Preservation
    actions.append({
        "priority": "STANDARD (Court Admissibility)",
        "title": "Preserve Chain-of-Custody SHA-256 Graph Evidence",
        "purpose": "Ensure graph data and transaction timeline meet court evidence standards (Section 65B Indian Evidence Act).",
        "details": [
            "Export digitally signed cryptographic PDF and JSON trace reports.",
            "Verify SHA-256 tamper-evident integrity hash of the transaction graph.",
            "Record exact block timestamps and explorer API transaction receipts.",
        ],
        "legal_basis": "Section 65B Certificate / Electronic Evidence Compliance",
    })

    if is_sepolia:
        actions.insert(0, {
            "priority": "DEMONSTRATION NOTE",
            "title": "Prototype Academic Simulation Notice",
            "purpose": "This case was analyzed on the Sepolia Testnet for training and validation purposes.",
            "details": [
                "No live monetary assets were compromised in this specific testnet trace.",
                "Use the generated Modus Operandi and action plan template for live Ethereum/Bitcoin cases.",
            ],
            "legal_basis": "Prototype / Training Simulation",
        })

    return actions


def _generate_executive_summary(
    chain: str,
    is_sepolia: bool,
    intent: dict,
    victim_matches: List[dict],
    amount_analysis: dict,
    hops_count: int,
    wallets_count: int,
) -> str:
    """
    Generates simple, punchy key takeaways for easy understanding.
    """
    typology = intent.get("primary_typology", "Suspicious Fund Flow")
    total_val = amount_analysis.get("total_value", 0.0)
    asset = amount_analysis.get("asset", "ETH")
    
    points = [
        f"🎯 KEY FINDING: {typology} detected — {total_val:.4f} {asset} moved across {wallets_count} wallets in {hops_count} hops.",
    ]
    
    if intent.get("vasp_identified"):
        vasps = ", ".join(intent.get("vasp_names", [])) or "centralized exchange"
        points.append(f"🔄 FUND TRAIL: Funds split through intermediary mules and deposited into {vasps} for cash-out.")
        points.append(f"🛡️ RECOMMENDED ACTION: Send urgent KYC subpoena and freeze notice to {vasps}.")
    else:
        points.append(f"🔄 FUND TRAIL: Funds dispersed into unhosted staging wallets; no exchange exit detected yet.")
        points.append(f"🛡️ RECOMMENDED ACTION: Place all {wallets_count} wallets on real-time on-chain surveillance.")

    if victim_matches:
        points.append(f"🚨 VICTIM LINK: Trace addresses match {len(victim_matches)} registered cyber crime complaint(s).")

    return "\n\n".join(points)


def _calculate_confidence(intent: dict, victim_matches: List[dict], patterns: List[dict]) -> int:
    """Calculates overall confidence percentage (0-100)."""
    score = 40  # baseline
    if intent.get("is_scam_likely"):
        score += 20
    if len(victim_matches) >= 2:
        score += 25
    elif len(victim_matches) == 1:
        score += 15
    if intent.get("vasp_identified"):
        score += 10
    if len(patterns) >= 3:
        score += 10
    elif len(patterns) >= 1:
        score += 5
    return min(96, score)


async def _call_llm_intelligence(
    chain: str,
    is_sepolia: bool,
    intent: dict,
    victim_matches: List[dict],
    amount_analysis: dict,
    hops_count: int,
    wallets_count: int,
    patterns: List[dict],
) -> Optional[str]:
    """
    Calls Groq / OpenAI API to generate simple, punchy 3-bullet points for investigators.
    """
    api_key = settings.GROQ_API_KEY or settings.OPENAI_API_KEY
    if not api_key:
        return None

    is_groq = bool(settings.GROQ_API_KEY) or api_key.startswith("gsk_")
    url = "https://api.groq.com/openai/v1/chat/completions" if is_groq else "https://api.openai.com/v1/chat/completions"
    model = "groq/compound-mini" if is_groq else "gpt-4o-mini"

    pattern_names = [p.get("pattern_type", "") for p in patterns if p.get("pattern_type")]
    vasp_info = f"{', '.join(intent.get('vasp_names', []))}" if intent.get('vasp_identified') else "Unhosted Wallets"

    prompt = f"""You are a crypto cyber crime forensic assistant.
Summarize this blockchain trace in ONLY 3 SHORT, CLEAR, SIMPLE BULLET POINTS for quick reading (max 1-2 lines per point, no long paragraphs, no heavy jargon):

Trace Details:
- Blockchain: {chain}
- Fraud Type: {intent.get('primary_typology', 'Suspicious Flow')}
- Total Amount: {amount_analysis.get('total_value', 0)} {amount_analysis.get('asset', 'ETH')}
- Hops: {hops_count} across {wallets_count} wallets
- Destination / Exchange: {vasp_info}
- Linked Victims: {len(victim_matches)}
- Patterns: {', '.join(pattern_names) if pattern_names else 'Layering'}

Required Output Format (Plain and direct):
🎯 KEY FINDING: (1 simple sentence explaining what happened)
🔄 FUND FLOW: (1 simple step-by-step summary: e.g., Victim -> Mule Wallets -> Cashout)
🛡️ ACTION NEEDED: (1 urgent action: e.g., Freeze exchange account or track wallets)"""

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            response = await client.post(
                url,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You provide ultra-concise, simple 3-point bullet summaries for police investigators. Do not write essays."},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 180,
                    "temperature": 0.2,
                }
            )
            if response.status_code == 200:
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                if content:
                    return content
            else:
                logger.warning(f"LLM API returned status {response.status_code}: {response.text[:120]}")
    except Exception as e:
        logger.warning(f"LLM API call skipped: {e}")

    return None
