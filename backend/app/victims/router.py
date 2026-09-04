"""
CryptoTrace AI — Victim Service & Router
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.auth.models import User
from app.victims.models import Victim
from app.victims.schemas import VictimCreate, VictimResponse

router = APIRouter(prefix="/api/cases/{case_id}/victims", tags=["Victims"])


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
