"""
CryptoTrace AI — Victim Case Correlator
Correlates active graph entities and suspect wallets with previously registered
investigation cases, police FIRs, and victim complaints in the database.
"""
from typing import List, Dict, Any, Set
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
import logging

logger = logging.getLogger(__name__)


async def correlate_with_previous_cases(
    db: AsyncSession,
    wallets: List[str],
    tx_hashes: List[str],
    current_case_id: str = None,
) -> List[Dict[str, Any]]:
    """
    Searches the database for matching suspect wallets or transaction hashes
    across previously filed cases and victim records.
    """
    correlations: List[Dict[str, Any]] = []
    if not db or (not wallets and not tx_hashes):
        return correlations

    try:
        from app.cases.models import Case
        from app.victims.models import Victim

        clean_wallets = [w.lower() for w in wallets if w]
        clean_txs = [t.lower() for t in tx_hashes if t]

        # 1. Search Cases
        stmt_cases = select(Case).where(
            or_(
                Case.suspect_wallet.in_(clean_wallets),
                Case.initial_txid.in_(clean_txs)
            )
        )
        if current_case_id:
            stmt_cases = stmt_cases.where(Case.id != current_case_id)

        res_cases = await db.execute(stmt_cases)
        matched_cases = res_cases.scalars().all()

        for c in matched_cases:
            correlations.append({
                "type": "case_match",
                "case_id": c.id,
                "case_number": c.case_number or f"CASE-{c.id[:8]}",
                "title": c.title,
                "wallet": c.suspect_wallet,
                "txid": c.initial_txid,
                "status": c.status,
                "priority": c.priority,
                "reported_amount": c.reported_amount,
                "cryptocurrency": c.cryptocurrency,
            })

        # 2. Search Victims
        stmt_victims = select(Victim).where(
            or_(
                Victim.suspect_address.in_(clean_wallets),
                Victim.tx_hash.in_(clean_txs),
                Victim.wallet_address.in_(clean_wallets)
            )
        )
        if current_case_id:
            stmt_victims = stmt_victims.where(Victim.case_id != current_case_id)

        res_victims = await db.execute(stmt_victims)
        matched_victims = res_victims.scalars().all()

        for v in matched_victims:
            correlations.append({
                "type": "victim_report_match",
                "case_id": v.case_id,
                "case_number": f"VIC-{v.id[:8]}",
                "title": f"Complaint by {v.name} ({v.complaint_number or 'Unnumbered FIR'})",
                "wallet": v.suspect_address or v.wallet_address,
                "txid": v.tx_hash,
                "amount_lost": v.amount_lost,
                "cryptocurrency": v.cryptocurrency,
            })

    except Exception as e:
        logger.warning(f"Case correlation error: {e}")

    return correlations
