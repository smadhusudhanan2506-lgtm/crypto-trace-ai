"""
CryptoTrace AI — Scam Pattern Intelligence API Router
Exposes endpoints for scam pattern analysis, graph evaluation, and historical reports.
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.scam_detection.scam_analyzer import scam_analyzer
from app.scam_detection.models import ScamAnalysisRecord
from app.tracing import Trace

router = APIRouter(prefix="/api/scam-analysis", tags=["Scam Pattern Intelligence"])


class ScamAnalysisRequest(BaseModel):
    txid: Optional[str] = Field(default="", description="Transaction hash (0x...)")
    wallet: Optional[str] = Field(default="", description="Wallet address (0x..., bc1..., T...)")
    chain: Optional[str] = Field(default="ethereum", description="Blockchain network")
    case_id: Optional[str] = Field(default=None, description="Linked Case ID")
    trace_id: Optional[str] = Field(default=None, description="Linked Trace ID")


class GraphEvaluationRequest(BaseModel):
    nodes: List[Dict[str, Any]] = Field(default_factory=list, description="Graph nodes")
    edges: List[Dict[str, Any]] = Field(default_factory=list, description="Graph edges")
    chain: Optional[str] = Field(default="ethereum", description="Blockchain network")
    start_tx_hash: Optional[str] = Field(default="", description="Starting TXID")
    start_address: Optional[str] = Field(default="", description="Starting address")
    case_id: Optional[str] = Field(default=None, description="Linked Case ID")
    trace_id: Optional[str] = Field(default=None, description="Linked Trace ID")


@router.post("", summary="Analyze Scam Pattern from TXID or Wallet")
async def analyze_scam_pattern(
    req: ScamAnalysisRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Evaluates transaction behavior from an existing trace or initiates graph extraction
    to classify the pattern into an explainable scam category.
    """
    clean_tx = (req.txid or "").strip()
    clean_wallet = (req.wallet or "").strip()
    clean_chain = (req.chain or "ethereum").strip().lower()

    if not clean_tx and not clean_wallet and not req.trace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide either a txid, wallet address, or trace_id.",
        )

    # 1. Lookup existing trace if available
    trace_record = None
    if req.trace_id:
        res = await db.execute(select(Trace).where(Trace.id == req.trace_id))
        trace_record = res.scalar_one_or_none()

    if not trace_record and (clean_tx or clean_wallet):
        # Query by tx or address
        query = select(Trace).where(
            (Trace.start_tx_hash == clean_tx) | (Trace.start_address == clean_wallet)
        ).order_by(Trace.created_at.desc())
        res = await db.execute(query)
        trace_record = res.scalars().first()

    nodes = []
    edges = []
    if trace_record and trace_record.graph_data:
        nodes = trace_record.graph_data.get("nodes", [])
        edges = trace_record.graph_data.get("edges", [])
        clean_chain = trace_record.chain or clean_chain
        clean_tx = clean_tx or trace_record.start_tx_hash
        clean_wallet = clean_wallet or trace_record.start_address

    # Execute scam analysis
    result = await scam_analyzer.analyze_graph(
        nodes=nodes,
        edges=edges,
        chain=clean_chain,
        start_address=clean_wallet,
        start_tx_hash=clean_tx,
        case_id=req.case_id or (trace_record.case_id if trace_record else None),
        trace_id=req.trace_id or (trace_record.id if trace_record else None),
        db=db,
        persist=True,
    )

    return result


@router.post("/evaluate", summary="Evaluate Direct Graph Topology On-Demand")
async def evaluate_graph_topology(
    req: GraphEvaluationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Evaluates raw graph topology data directly on demand without requiring a prior database trace.
    """
    result = await scam_analyzer.analyze_graph(
        nodes=req.nodes,
        edges=req.edges,
        chain=req.chain or "ethereum",
        start_address=req.start_address or "",
        start_tx_hash=req.start_tx_hash or "",
        case_id=req.case_id,
        trace_id=req.trace_id,
        db=db,
        persist=False,
    )
    return result


@router.get("/{analysis_id}", summary="Get Saved Scam Analysis Report")
async def get_scam_analysis(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieves a previously stored scam pattern intelligence record."""
    res = await db.execute(select(ScamAnalysisRecord).where(ScamAnalysisRecord.id == analysis_id))
    rec = res.scalar_one_or_none()
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scam analysis record {analysis_id} not found.",
        )

    return {
        "success": True,
        "id": rec.id,
        "case_id": rec.case_id,
        "trace_id": rec.trace_id,
        "chain": rec.chain,
        "txid": rec.txid,
        "wallet": rec.wallet,
        "primary_pattern": rec.primary_pattern,
        "alternative_patterns": rec.alternative_patterns,
        "all_scores": rec.all_scores,
        "features": rec.features,
        "evidence": rec.evidence,
        "graph_signals": rec.graph_signals,
        "node_roles": rec.node_roles,
        "limitations": rec.limitations,
        "summary_narrative": rec.summary_narrative,
        "correlated_cases": rec.correlated_cases,
        "created_at": rec.created_at.isoformat() if rec.created_at else None,
    }
