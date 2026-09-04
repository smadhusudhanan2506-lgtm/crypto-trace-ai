"""
CryptoTrace AI — Tracing API Router
"""
import uuid
import asyncio
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional, List

from app.core.database import get_db, async_session
from app.core.dependencies import get_current_user
from app.auth.models import User
from app.blockchain.registry import registry
from app.tracing import Trace, TraceHop
from app.tracing.service import start_trace, get_trace_status

router = APIRouter(prefix="/api/traces", tags=["Tracing"])


class TraceRequest(BaseModel):
    tx_hash: str = ""
    address: str = ""
    chain: str = ""
    max_hops: int = 5
    direction: str = "forward"
    case_id: str = ""


class TraceResponse(BaseModel):
    trace_id: str
    status: str
    message: str


class TraceHopResponse(BaseModel):
    id: str
    hop_number: int
    source_address: str
    destination_address: str
    tx_hash: str
    amount: float
    asset: str
    timestamp: Optional[str] = None
    chain: str
    is_vasp_endpoint: bool
    vasp_name: str

    model_config = {"from_attributes": True}


class TraceDetailResponse(BaseModel):
    id: str
    case_id: Optional[str] = None
    start_tx_hash: str
    start_address: str
    chain: str
    direction: str
    max_hops: int
    status: str
    progress: float
    progress_message: str
    hops_completed: int
    total_transactions: int
    total_wallets: int
    total_value: float
    risk_score: float
    vasp_detected: bool
    vasp_name: str
    vasp_confidence: float
    graph_data: dict
    error_message: str
    created_at: Optional[str] = None
    completed_at: Optional[str] = None

    model_config = {"from_attributes": True}


async def _run_trace_background(trace_id: str, **kwargs):
    """Run trace in background using a new db session."""
    async with async_session() as db:
        try:
            await start_trace(db, trace_id, **kwargs)
            await db.commit()
        except Exception as e:
            await db.rollback()
            raise


@router.post("", response_model=TraceResponse)
async def create_trace(
    data: TraceRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a new blockchain trace. Returns immediately; trace runs in background."""
    if not data.tx_hash and not data.address:
        raise HTTPException(status_code=400, detail="Provide either tx_hash or address")

    # Auto-detect chain if not specified
    chain = data.chain
    if not chain:
        value = data.tx_hash or data.address
        identification = await registry.identify_chain(value)
        if identification:
            chain = identification.chain
        else:
            raise HTTPException(status_code=400, detail="Could not detect blockchain. Please specify chain.")

    # Validate adapter exists
    adapter = registry.get_adapter(chain)
    if not adapter or not adapter.is_configured:
        raise HTTPException(status_code=400, detail=f"Blockchain '{chain}' is not supported or not configured")

    trace_id = str(uuid.uuid4())

    # Start background trace
    effective_max_hops = settings.TRACE_MAX_HOPS if (data.max_hops <= 0 or data.max_hops > settings.TRACE_MAX_HOPS) else data.max_hops
    background_tasks.add_task(
        _run_trace_background,
        trace_id=trace_id,
        start_tx_hash=data.tx_hash,
        start_address=data.address,
        chain=chain,
        max_hops=effective_max_hops,
        direction=data.direction,
        case_id=data.case_id,
        investigator_id=current_user.id,
    )

    return TraceResponse(
        trace_id=trace_id,
        status="queued",
        message=f"Trace started on {chain}. Poll /api/traces/{trace_id}/status for progress.",
    )


@router.get("/{trace_id}/status")
async def get_status(trace_id: str, current_user: User = Depends(get_current_user)):
    """Get real-time trace progress."""
    status = await get_trace_status(trace_id)
    if status:
        return status
    return {"status": "unknown", "message": "Trace not found or already completed. Check /api/traces/{trace_id}"}


@router.get("/{trace_id}", response_model=TraceDetailResponse)
async def get_trace(
    trace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get completed trace details with graph data."""
    result = await db.execute(select(Trace).where(Trace.id == trace_id))
    trace = result.scalar_one_or_none()
    if not trace:
        raise HTTPException(status_code=404, detail="Trace not found")

    return TraceDetailResponse(
        id=trace.id,
        case_id=trace.case_id,
        start_tx_hash=trace.start_tx_hash,
        start_address=trace.start_address,
        chain=trace.chain,
        direction=trace.direction,
        max_hops=trace.max_hops,
        status=trace.status,
        progress=trace.progress,
        progress_message=trace.progress_message or "",
        hops_completed=trace.hops_completed,
        total_transactions=trace.total_transactions,
        total_wallets=trace.total_wallets,
        total_value=trace.total_value,
        risk_score=trace.risk_score,
        vasp_detected=trace.vasp_detected,
        vasp_name=trace.vasp_name,
        vasp_confidence=trace.vasp_confidence,
        graph_data=trace.graph_data or {},
        error_message=trace.error_message or "",
        created_at=trace.created_at.isoformat() if trace.created_at else None,
        completed_at=trace.completed_at.isoformat() if trace.completed_at else None,
    )


@router.get("/{trace_id}/hops", response_model=List[TraceHopResponse])
async def get_trace_hops(
    trace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all hops for a trace."""
    result = await db.execute(
        select(TraceHop).where(TraceHop.trace_id == trace_id).order_by(TraceHop.hop_number)
    )
    hops = list(result.scalars().all())
    return [TraceHopResponse(
        id=h.id,
        hop_number=h.hop_number,
        source_address=h.source_address,
        destination_address=h.destination_address,
        tx_hash=h.tx_hash,
        amount=h.amount,
        asset=h.asset,
        timestamp=h.timestamp.isoformat() if h.timestamp else None,
        chain=h.chain,
        is_vasp_endpoint=h.is_vasp_endpoint,
        vasp_name=h.vasp_name or "",
    ) for h in hops]


@router.get("")
async def list_traces(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List recent traces."""
    result = await db.execute(select(Trace).order_by(desc(Trace.created_at)).limit(50))
    traces = list(result.scalars().all())
    return [TraceDetailResponse(
        id=t.id,
        case_id=t.case_id,
        start_tx_hash=t.start_tx_hash,
        start_address=t.start_address,
        chain=t.chain,
        direction=t.direction,
        max_hops=t.max_hops,
        status=t.status,
        progress=t.progress,
        progress_message=t.progress_message or "",
        hops_completed=t.hops_completed,
        total_transactions=t.total_transactions,
        total_wallets=t.total_wallets,
        total_value=t.total_value,
        risk_score=t.risk_score,
        vasp_detected=t.vasp_detected,
        vasp_name=t.vasp_name,
        vasp_confidence=t.vasp_confidence,
        graph_data={},  # Omit graph in list
        error_message=t.error_message or "",
        created_at=t.created_at.isoformat() if t.created_at else None,
        completed_at=t.completed_at.isoformat() if t.completed_at else None,
    ) for t in traces]


# Import settings at module level for the router
from app.core.config import settings
