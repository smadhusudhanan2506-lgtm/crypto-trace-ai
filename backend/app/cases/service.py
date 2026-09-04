"""
CryptoTrace AI — Case Service: CRUD operations.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.cases.models import Case, CaseNote
from app.cases.schemas import CaseCreate, CaseUpdate


def generate_case_number() -> str:
    """Generate a unique case number like CASE-2026-0001."""
    now = datetime.now(timezone.utc)
    short_id = str(uuid.uuid4())[:8].upper()
    return f"CASE-{now.year}-{short_id}"


async def create_case(db: AsyncSession, data: CaseCreate, investigator_id: str) -> Case:
    """Create a new investigation case."""
    case = Case(
        case_number=data.case_number or generate_case_number(),
        title=data.title,
        description=data.description,
        investigator_id=investigator_id,
        organization=data.organization,
        complaint_source=data.complaint_source,
        victim_count=data.victim_count,
        reported_amount=data.reported_amount,
        currency=data.currency,
        cryptocurrency=data.cryptocurrency,
        blockchain=data.blockchain,
        suspect_wallet=data.suspect_wallet,
        initial_txid=data.initial_txid,
    )
    db.add(case)
    await db.flush()
    await db.refresh(case)
    return case


async def get_case(db: AsyncSession, case_id: str) -> Optional[Case]:
    """Get a case by ID."""
    result = await db.execute(select(Case).where(Case.id == case_id))
    return result.scalar_one_or_none()


async def get_case_by_number(db: AsyncSession, case_number: str) -> Optional[Case]:
    """Get a case by case number."""
    result = await db.execute(select(Case).where(Case.case_number == case_number))
    return result.scalar_one_or_none()


async def list_cases(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    investigator_id: Optional[str] = None,
) -> tuple[List[Case], int]:
    """List cases with optional filtering."""
    query = select(Case)

    if status:
        query = query.where(Case.status == status)
    if priority:
        query = query.where(Case.priority == priority)
    if investigator_id:
        query = query.where(Case.investigator_id == investigator_id)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Results
    query = query.order_by(desc(Case.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    cases = list(result.scalars().all())

    return cases, total


async def update_case(db: AsyncSession, case_id: str, data: CaseUpdate) -> Optional[Case]:
    """Update a case."""
    case = await get_case(db, case_id)
    if not case:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(case, key, value)

    case.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(case)
    return case


async def add_note(db: AsyncSession, case_id: str, author_id: str, content: str) -> CaseNote:
    """Add a note to a case (append-only)."""
    note = CaseNote(
        case_id=case_id,
        author_id=author_id,
        content=content,
    )
    db.add(note)
    await db.flush()
    await db.refresh(note)
    return note


async def get_notes(db: AsyncSession, case_id: str) -> List[CaseNote]:
    """Get all notes for a case."""
    result = await db.execute(
        select(CaseNote).where(CaseNote.case_id == case_id).order_by(CaseNote.created_at)
    )
    return list(result.scalars().all())


async def get_dashboard_stats(db: AsyncSession) -> dict:
    """Get aggregate stats for dashboard cards."""
    total = (await db.execute(select(func.count(Case.id)))).scalar() or 0
    active = (await db.execute(
        select(func.count(Case.id)).where(Case.status.in_(["new", "under_investigation", "high_priority"]))
    )).scalar() or 0
    high_risk = (await db.execute(
        select(func.count(Case.id)).where(Case.risk_score >= 60)
    )).scalar() or 0
    total_victims = (await db.execute(select(func.sum(Case.victim_count)))).scalar() or 0
    total_value = (await db.execute(select(func.sum(Case.reported_amount)))).scalar() or 0
    total_traced = (await db.execute(select(func.sum(Case.funds_traced)))).scalar() or 0
    vasp_found = (await db.execute(
        select(func.count(Case.id)).where(Case.vasp_identified == True)
    )).scalar() or 0

    return {
        "total_cases": total,
        "active_cases": active,
        "high_risk_cases": high_risk,
        "total_victims": int(total_victims),
        "total_reported_value": float(total_value),
        "funds_traced": float(total_traced),
        "vasp_endpoints": vasp_found,
        "fraud_networks": 0,  # Updated by network analysis
    }
