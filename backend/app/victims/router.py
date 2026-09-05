"""
CryptoTrace AI — Victim Service & Router
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.auth.models import User
from app.victims.models import Victim
from app.cases.models import Case
from app.victims.schemas import VictimCreate, VictimResponse

router = APIRouter(prefix="/api/cases/{case_id}/victims", tags=["Victims"])
global_router = APIRouter(prefix="/api/victims", tags=["Victims"])


@router.post("", response_model=VictimResponse, status_code=201)
async def add_victim(
    case_id: str,
    data: VictimCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a victim to a case."""
    victim = Victim(case_id=case_id, **data.model_dump())
    db.add(victim)
    await db.flush()
    await db.refresh(victim)
    return VictimResponse.model_validate(victim)


@router.get("", response_model=List[VictimResponse])
async def list_victims(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all victims for a case."""
    result = await db.execute(select(Victim).where(Victim.case_id == case_id))
    victims = list(result.scalars().all())
    return [VictimResponse.model_validate(v) for v in victims]


@global_router.get("", response_model=List[VictimResponse])
async def list_all_victims(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all victim complaints across cases."""
    result = await db.execute(select(Victim).order_by(desc(Victim.created_at)).limit(100))
    victims = list(result.scalars().all())
    return [VictimResponse.model_validate(v) for v in victims]


@global_router.post("", response_model=VictimResponse, status_code=201)
async def create_victim_complaint(
    data: VictimCreate,
    case_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register a new victim complaint from NCRP / Portal."""
    target_case_id = case_id
    if not target_case_id:
        # Create a default or linked investigation case
        case_num = f"CASE-NCRP-{uuid.uuid4().hex[:6].upper()}"
        new_case = Case(
            case_number=case_num,
            title=f"NCRP Complaint: {data.name or 'Cyber Fraud'} ({data.cryptocurrency or 'ETH'})",
            description=data.complaint_description or f"Victim reported fraudulent cryptocurrency loss of {data.amount_lost} {data.currency}.",
            investigator_id=current_user.id,
            organization=current_user.organization or "National Cyber Crime Portal",
            complaint_source="National Cyber Crime Reporting Portal (NCRP)",
            reported_amount=data.amount_lost,
            currency=data.currency,
            cryptocurrency=data.cryptocurrency or "ETH",
            blockchain=data.chain or "ethereum",
            suspect_wallet=data.wallet_address,
            initial_txid=data.tx_hash,
            status="under_investigation",
            priority="high",
        )
        db.add(new_case)
        await db.flush()
        target_case_id = new_case.id

    victim = Victim(case_id=target_case_id, **data.model_dump())
    db.add(victim)
    await db.flush()
    await db.commit()
    await db.refresh(victim)
    return VictimResponse.model_validate(victim)
