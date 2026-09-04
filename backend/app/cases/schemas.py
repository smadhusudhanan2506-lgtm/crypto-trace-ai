"""
CryptoTrace AI — Case Management Pydantic Schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CaseCreate(BaseModel):
    title: str
    case_number: Optional[str] = None
    description: str = ""
    complaint_source: str = ""
    victim_count: int = 0
    reported_amount: float = 0.0
    currency: str = "INR"
    cryptocurrency: str = ""
    blockchain: str = ""
    suspect_wallet: str = ""
    initial_txid: str = ""
    organization: str = ""


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    suspect_wallet: Optional[str] = None
    initial_txid: Optional[str] = None
    risk_score: Optional[float] = None
    priority_score: Optional[float] = None
    vasp_identified: Optional[bool] = None
    vasp_name: Optional[str] = None
    vasp_confidence: Optional[float] = None


class CaseResponse(BaseModel):
    id: str
    case_number: str
    title: str
    description: str
    status: str
    priority: str
    investigator_id: Optional[str] = None
    organization: str
    complaint_source: str
    reported_amount: float
    currency: str
    cryptocurrency: str
    blockchain: str
    suspect_wallet: str
    initial_txid: str
    risk_score: float
    priority_score: float
    victim_count: int
    wallet_count: int
    transaction_count: int
    funds_traced: float
    vasp_identified: bool
    vasp_name: str
    vasp_confidence: float
    is_demo: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class CaseListResponse(BaseModel):
    cases: List[CaseResponse]
    total: int


class CaseNoteCreate(BaseModel):
    content: str


class CaseNoteResponse(BaseModel):
    id: str
    case_id: str
    author_id: Optional[str] = None
    content: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
