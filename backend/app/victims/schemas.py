"""
CryptoTrace AI — Victim Pydantic Schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class VictimCreate(BaseModel):
    victim_identifier: str = ""
    name: str = ""
    contact: str = ""
    amount_lost: float = 0.0
    currency: str = "INR"
    cryptocurrency: str = ""
    wallet_address: str = ""
    tx_hash: str = ""
    chain: str = ""
    complaint_date: Optional[datetime] = None
    complaint_description: str = ""


class VictimResponse(BaseModel):
    id: str
    case_id: str
    victim_identifier: str
    name: str
    amount_lost: float
    currency: str
    cryptocurrency: str
    wallet_address: str
    tx_hash: str
    chain: str
    complaint_date: Optional[datetime] = None
    complaint_description: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
