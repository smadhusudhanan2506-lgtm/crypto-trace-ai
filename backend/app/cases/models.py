"""
CryptoTrace AI — Case Management SQLAlchemy Models
Central model for fraud investigation cases.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, Integer, Text, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Case(Base):
    __tablename__ = "cases"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_number = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, default="")
    status = Column(String(50), default="new", index=True)
    # Statuses: new, under_investigation, high_priority, vasp_identified,
    #           evidence_collected, escalated, closed, archived
    priority = Column(String(20), default="medium")
    # Priority: low, medium, high, critical

    # Investigator
    investigator_id = Column(String, ForeignKey("users.id"), nullable=True)
    organization = Column(String(255), default="")
    complaint_source = Column(String(255), default="")

    # Financial
    reported_amount = Column(Float, default=0.0)
    currency = Column(String(20), default="INR")
    cryptocurrency = Column(String(20), default="")
    blockchain = Column(String(50), default="")

    # Initial evidence
    suspect_wallet = Column(String(255), default="", index=True)
    initial_txid = Column(String(255), default="", index=True)

    # Scores
    risk_score = Column(Float, default=0.0)
    priority_score = Column(Float, default=0.0)

    # Counts (denormalized for dashboard performance)
    victim_count = Column(Integer, default=0)
    wallet_count = Column(Integer, default=0)
    transaction_count = Column(Integer, default=0)
    funds_traced = Column(Float, default=0.0)

    # VASP
    vasp_identified = Column(Boolean, default=False)
    vasp_name = Column(String(255), default="")
    vasp_confidence = Column(Float, default=0.0)

    # Metadata
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow, index=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    closed_at = Column(DateTime, nullable=True)

    # Relationships
    investigator_user = relationship("User", back_populates="cases")
    victims = relationship("Victim", back_populates="case", cascade="all, delete-orphan")
    traces = relationship("Trace", back_populates="case", cascade="all, delete-orphan")
    evidence_items = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="case", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="case", cascade="all, delete-orphan")
    fraud_patterns = relationship("FraudPattern", back_populates="case", cascade="all, delete-orphan")
    case_wallets = relationship("CaseWallet", back_populates="case", cascade="all, delete-orphan")
    case_transactions = relationship("CaseTransaction", back_populates="case", cascade="all, delete-orphan")
    notes = relationship("CaseNote", back_populates="case", cascade="all, delete-orphan")


class CaseWallet(Base):
    """Many-to-many link between cases and wallets."""
    __tablename__ = "case_wallets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("cases.id"), nullable=False, index=True)
    wallet_address = Column(String(255), nullable=False, index=True)
    chain = Column(String(50), default="")
    role = Column(String(50), default="unknown")
    # Roles: victim, suspect, intermediary, vasp, unknown
    added_at = Column(DateTime, default=utcnow)

    case = relationship("Case", back_populates="case_wallets")


class CaseTransaction(Base):
    """Links transactions to cases."""
    __tablename__ = "case_transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("cases.id"), nullable=False, index=True)
    tx_hash = Column(String(255), nullable=False, index=True)
    chain = Column(String(50), default="")
    role = Column(String(50), default="evidence")
    added_at = Column(DateTime, default=utcnow)

    case = relationship("Case", back_populates="case_transactions")


class CaseNote(Base):
    """Investigator notes on a case. Version history via append-only."""
    __tablename__ = "case_notes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("cases.id"), nullable=False, index=True)
    author_id = Column(String, ForeignKey("users.id"), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    case = relationship("Case", back_populates="notes")
