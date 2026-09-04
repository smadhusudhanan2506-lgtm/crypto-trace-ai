"""
CryptoTrace AI — Victim SQLAlchemy Models
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Victim(Base):
    __tablename__ = "victims"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("cases.id"), nullable=False, index=True)
    victim_identifier = Column(String(255), default="")  # anonymized victim ID
    name = Column(String(255), default="")  # optional, may be redacted
    contact = Column(String(255), default="")
    amount_lost = Column(Float, default=0.0)
    currency = Column(String(20), default="INR")
    cryptocurrency = Column(String(20), default="")
    wallet_address = Column(String(255), default="", index=True)
    tx_hash = Column(String(255), default="", index=True)
    chain = Column(String(50), default="")
    complaint_date = Column(DateTime, nullable=True)
    complaint_description = Column(Text, default="")
    created_at = Column(DateTime, default=utcnow)

    case = relationship("Case", back_populates="victims")
