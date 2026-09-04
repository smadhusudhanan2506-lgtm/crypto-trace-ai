"""
CryptoTrace AI — Case Management API Router
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.auth.models import User
from app.cases.schemas import (
    CaseCreate, CaseUpdate, CaseResponse, CaseListResponse,
    CaseNoteCreate, CaseNoteResponse,
)
from app.cases import service as case_service

router = APIRouter(prefix="/api/cases", tags=["Cases"])


@router.post("", response_model=CaseResponse, status_code=201)
async def create_case(
    data: CaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new investigation case."""
    case = await case_service.create_case(db, data, current_user.id)
    return CaseResponse.model_validate(case)


@router.get("", response_model=CaseListResponse)
async def list_cases(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List investigation cases with filtering."""
    cases, total = await case_service.list_cases(db, skip, limit, status, priority)
    return CaseListResponse(
        cases=[CaseResponse.model_validate(c) for c in cases],
        total=total,
    )


@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get dashboard statistics."""
    return await case_service.get_dashboard_stats(db)


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific case."""
    case = await case_service.get_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return CaseResponse.model_validate(case)


@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: str,
    data: CaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a case."""
    case = await case_service.update_case(db, case_id, data)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return CaseResponse.model_validate(case)


@router.post("/{case_id}/notes", response_model=CaseNoteResponse, status_code=201)
async def add_note(
    case_id: str,
    data: CaseNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add an investigator note to a case."""
    note = await case_service.add_note(db, case_id, current_user.id, data.content)
    return CaseNoteResponse.model_validate(note)


@router.get("/{case_id}/notes")
async def get_notes(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all notes for a case."""
    notes = await case_service.get_notes(db, case_id)
    return [CaseNoteResponse.model_validate(n) for n in notes]
