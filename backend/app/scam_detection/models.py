"""
CryptoTrace AI — Scam Analysis Persistence Model
SQLAlchemy model storing scam pattern intelligence reports.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, Integer, JSON, Boolean, Text
from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class ScamAnalysisRecord(Base):
    __tablename__ = "scam_analyses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, index=True, nullable=True)
    trace_id = Column(String, index=True, nullable=True)
    txid = Column(String(255), index=True, default="")
    wallet = Column(String(255), index=True, default="")
    chain = Column(String(50), default="ethereum", index=True)

    # Classification
    primary_pattern_id = Column(String(50), default="")
    primary_pattern_name = Column(String(255), default="")
    primary_score = Column(Float, default=0.0)
    confidence_label = Column(String(50), default="Insufficient evidence")
    evidence_strength = Column(String(20), default="Low")

    # Structured Payloads
    primary_pattern = Column(JSON, default=dict)
    alternative_patterns = Column(JSON, default=list)
    all_scores = Column(JSON, default=dict)
    features = Column(JSON, default=dict)
    evidence = Column(JSON, default=list)
    graph_signals = Column(JSON, default=list)
    node_roles = Column(JSON, default=dict)
    limitations = Column(JSON, default=list)
    correlated_cases = Column(JSON, default=list)
    summary_narrative = Column(Text, default="")

    created_at = Column(DateTime, default=utcnow)
