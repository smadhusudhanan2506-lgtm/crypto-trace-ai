"""
CryptoTrace AI — Analytics & Blockchain API Routers
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.auth.models import User
from app.blockchain.registry import registry
from app.tracing import Trace, TraceHop, Transaction, AuditLog, Evidence, Alert
from app.analytics.patterns import detect_patterns
from app.analytics.risk import calculate_risk_score
from app.analytics.priority import calculate_priority


# === Blockchain Router ===
blockchain_router = APIRouter(prefix="/api/blockchain", tags=["Blockchain"])


@blockchain_router.get("/chains")
async def get_supported_chains():
    """Get list of supported blockchains with status."""
    return registry.get_supported_chains()


@blockchain_router.get("/identify/{value}")
async def identify_chain(value: str):
    """Auto-detect which blockchain a TXID or address belongs to."""
    result = await registry.identify_chain(value)
    if not result:
        return {"chain": None, "message": "Could not identify blockchain for this value"}
    return result.model_dump()


@blockchain_router.get("/tx/{chain}/{tx_hash}")
async def get_transaction(
    chain: str,
    tx_hash: str,
    current_user: User = Depends(get_current_user),
):
    """Fetch a real transaction from the blockchain."""
    adapter = registry.get_adapter(chain)
    if not adapter:
        raise HTTPException(status_code=400, detail=f"Unsupported blockchain: {chain}")
    if not adapter.is_configured:
        raise HTTPException(status_code=400, detail=f"Blockchain {chain} is not configured")

    tx = await adapter.get_transaction(tx_hash)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx.model_dump()


@blockchain_router.get("/address/{chain}/{address}")
async def get_address_info(
    chain: str,
    address: str,
    current_user: User = Depends(get_current_user),
):
    """Get real address information from blockchain."""
    adapter = registry.get_adapter(chain)
    if not adapter:
        raise HTTPException(status_code=400, detail=f"Unsupported blockchain: {chain}")

    info = await adapter.get_address_info(address)
    if not info:
        raise HTTPException(status_code=404, detail="Address not found")
    return info.model_dump()


@blockchain_router.get("/address/{chain}/{address}/transactions")
async def get_address_transactions(
    chain: str,
    address: str,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
):
    """Get transactions for an address."""
    adapter = registry.get_adapter(chain)
    if not adapter:
        raise HTTPException(status_code=400, detail=f"Unsupported blockchain: {chain}")

    txs = await adapter.get_transactions_for_address(address, limit=min(limit, 50))
    return [tx.model_dump() for tx in txs]


# === Analytics Router ===
analytics_router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


class RiskAnalysisRequest(BaseModel):
    case_id: str = ""
    trace_id: str = ""
    victim_count: int = 0
    reported_amount: float = 0


@analytics_router.post("/risk")
async def analyze_risk(
    data: RiskAnalysisRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate explainable risk score for a trace."""
    hops_data = []
    vasp_detected = False
    vasp_confidence = 0.0
    total_value = 0

    if data.trace_id:
        result = await db.execute(select(Trace).where(Trace.id == data.trace_id))
        trace = result.scalar_one_or_none()
        if trace:
            vasp_detected = trace.vasp_detected
            vasp_confidence = trace.vasp_confidence
            total_value = trace.total_value

            hop_result = await db.execute(
                select(TraceHop).where(TraceHop.trace_id == data.trace_id)
            )
            hops = list(hop_result.scalars().all())
            hops_data = [{
                "source_address": h.source_address,
                "destination_address": h.destination_address,
                "tx_hash": h.tx_hash,
                "amount": h.amount,
                "timestamp": h.timestamp,
                "hop_number": h.hop_number,
            } for h in hops]

    patterns = detect_patterns(hops_data, [])

    risk = calculate_risk_score(
        patterns=patterns,
        victim_count=data.victim_count,
        vasp_detected=vasp_detected,
        vasp_confidence=vasp_confidence,
        hops_count=len(hops_data),
        total_value=total_value,
    )

    priority = calculate_priority(
        risk_score=risk["score"],
        victim_count=data.victim_count,
        reported_amount=data.reported_amount,
        vasp_detected=vasp_detected,
    )

    return {
        "risk": risk,
        "priority": priority,
        "patterns": patterns,
    }


class AIInvestigationRequest(BaseModel):
    trace_id: str = ""
    case_id: str = ""


@analytics_router.post("/ai-investigation")
async def analyze_ai_investigation(
    data: AIInvestigationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run comprehensive AI Behavioral & Fraud Assessment."""
    from app.analytics.ai_investigator import run_ai_investigation
    assessment = await run_ai_investigation(db, trace_id=data.trace_id)
    return assessment


@analytics_router.get("/trace/{trace_id}/ai-investigation")
async def get_trace_ai_investigation(
    trace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get or generate AI Behavioral & Fraud Assessment for a trace."""
    from app.analytics.ai_investigator import run_ai_investigation
    assessment = await run_ai_investigation(db, trace_id=trace_id)
    return assessment


# === Evidence Router ===
evidence_router = APIRouter(prefix="/api/evidence", tags=["Evidence"])


@evidence_router.get("")
async def list_evidence(
    case_id: str = "",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List evidence items."""
    query = select(Evidence)
    if case_id:
        query = query.where(Evidence.case_id == case_id)
    query = query.order_by(Evidence.created_at.desc()).limit(100)
    result = await db.execute(query)
    items = list(result.scalars().all())
    return [{
        "id": e.id,
        "case_id": e.case_id,
        "evidence_type": e.evidence_type,
        "title": e.title,
        "description": e.description,
        "source": e.source,
        "sha256_hash": e.sha256_hash,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    } for e in items]


# === Audit Router ===
audit_router = APIRouter(prefix="/api/audit-logs", tags=["Audit"])


@audit_router.get("")
async def list_audit_logs(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List audit log entries."""
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(min(limit, 200))
    )
    logs = list(result.scalars().all())
    return [{
        "id": l.id,
        "user_id": l.user_id,
        "action": l.action,
        "resource_type": l.resource_type,
        "resource_id": l.resource_id,
        "details": l.details,
        "previous_hash": l.previous_hash,
        "current_hash": l.current_hash,
        "created_at": l.created_at.isoformat() if l.created_at else None,
    } for l in logs]


# === Alerts Router ===
alerts_router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@alerts_router.get("")
async def list_alerts(
    case_id: str = "",
    status: str = "",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List alerts."""
    query = select(Alert)
    if case_id:
        query = query.where(Alert.case_id == case_id)
    if status:
        query = query.where(Alert.status == status)
    query = query.order_by(Alert.created_at.desc()).limit(100)
    result = await db.execute(query)
    alerts = list(result.scalars().all())
    return [{
        "id": a.id,
        "case_id": a.case_id,
        "alert_type": a.alert_type,
        "severity": a.severity,
        "title": a.title,
        "description": a.description,
        "wallet_address": a.wallet_address,
        "tx_hash": a.tx_hash,
        "status": a.status,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in alerts]


# === VASP Intelligence Router ===
vasp_router = APIRouter(prefix="/api/vasp", tags=["VASP Intelligence"])


@vasp_router.get("/entities")
async def get_vasp_entities():
    """Get catalog of known VASP exchanges, DEXes, bridges, and mixers."""
    from app.attribution.known_entities import KNOWN_ENTITIES
    return KNOWN_ENTITIES
