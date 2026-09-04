"""
CryptoTrace AI — Tracing Models: Traces, Hops, and Transaction Graph.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, Integer, Text, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Transaction(Base):
    """Stored blockchain transaction (fetched from real APIs)."""
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tx_hash = Column(String(255), nullable=False, index=True)
    chain = Column(String(50), nullable=False, index=True)
    block_number = Column(Integer, default=0)
    block_timestamp = Column(DateTime, nullable=True, index=True)
    status = Column(String(20), default="confirmed")
    from_address = Column(String(255), default="", index=True)
    to_address = Column(String(255), default="", index=True)
    amount = Column(Float, default=0.0)
    asset = Column(String(20), default="")
    fee = Column(Float, default=0.0)
    gas_used = Column(Integer, default=0)
    gas_price = Column(Float, default=0.0)
    is_contract_interaction = Column(Boolean, default=False)
    token_transfers = Column(JSON, default=list)
    raw_data = Column(JSON, default=dict)
    provider = Column(String(100), default="")
    retrieved_at = Column(DateTime, default=utcnow)
    created_at = Column(DateTime, default=utcnow)


class Wallet(Base):
    """Known wallet address with aggregated intelligence."""
    __tablename__ = "wallets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    address = Column(String(255), nullable=False, unique=True, index=True)
    chain = Column(String(50), default="")
    label = Column(String(255), default="")
    entity_name = Column(String(255), default="")
    entity_type = Column(String(100), default="")
    risk_score = Column(Float, default=0.0)
    risk_factors = Column(JSON, default=list)
    tx_count = Column(Integer, default=0)
    total_received = Column(Float, default=0.0)
    total_sent = Column(Float, default=0.0)
    balance = Column(Float, default=0.0)
    first_seen = Column(DateTime, nullable=True)
    last_seen = Column(DateTime, nullable=True)
    is_contract = Column(Boolean, default=False)
    connected_victims = Column(Integer, default=0)
    connected_cases = Column(Integer, default=0)
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


class Trace(Base):
    """A fund tracing job initiated by an investigator."""
    __tablename__ = "traces"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("cases.id"), nullable=True, index=True)
    start_tx_hash = Column(String(255), default="")
    start_address = Column(String(255), default="")
    chain = Column(String(50), default="")
    direction = Column(String(20), default="forward")  # forward, backward, both
    max_hops = Column(Integer, default=5)
    max_addresses_per_hop = Column(Integer, default=20)
    status = Column(String(30), default="queued", index=True)
    # queued, running, completed, failed, cancelled
    progress = Column(Float, default=0.0)  # 0-100
    progress_message = Column(String(500), default="")
    hops_completed = Column(Integer, default=0)
    total_transactions = Column(Integer, default=0)
    total_wallets = Column(Integer, default=0)
    total_value = Column(Float, default=0.0)
    risk_score = Column(Float, default=0.0)
    risk_factors = Column(JSON, default=list)
    vasp_detected = Column(Boolean, default=False)
    vasp_name = Column(String(255), default="")
    vasp_confidence = Column(Float, default=0.0)
    graph_data = Column(JSON, default=dict)
    error_message = Column(Text, default="")
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    investigator_id = Column(String, ForeignKey("users.id"), nullable=True)

    case = relationship("Case", back_populates="traces")
    hops = relationship("TraceHop", back_populates="trace", cascade="all, delete-orphan")


class TraceHop(Base):
    """Individual hop in a fund trace."""
    __tablename__ = "trace_hops"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    trace_id = Column(String, ForeignKey("traces.id"), nullable=False, index=True)
    hop_number = Column(Integer, nullable=False)
    source_address = Column(String(255), default="", index=True)
    destination_address = Column(String(255), default="", index=True)
    tx_hash = Column(String(255), default="", index=True)
    amount = Column(Float, default=0.0)
    asset = Column(String(20), default="")
    timestamp = Column(DateTime, nullable=True)
    block_number = Column(Integer, default=0)
    chain = Column(String(50), default="")
    direction = Column(String(20), default="forward")
    transaction_type = Column(String(50), default="transfer")
    confidence = Column(Float, default=1.0)
    is_vasp_endpoint = Column(Boolean, default=False)
    vasp_name = Column(String(255), default="")
    created_at = Column(DateTime, default=utcnow)

    trace = relationship("Trace", back_populates="hops")


class FraudPattern(Base):
    """Detected fraud pattern."""
    __tablename__ = "fraud_patterns"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("cases.id"), nullable=True, index=True)
    trace_id = Column(String, ForeignKey("traces.id"), nullable=True)
    wallet_address = Column(String(255), default="", index=True)
    pattern_type = Column(String(100), nullable=False)
    description = Column(Text, default="")
    severity = Column(String(20), default="medium")  # low, medium, high, critical
    confidence = Column(Float, default=0.0)
    evidence = Column(JSON, default=dict)
    related_transactions = Column(JSON, default=list)
    risk_points = Column(Integer, default=0)
    created_at = Column(DateTime, default=utcnow)

    case = relationship("Case", back_populates="fraud_patterns")


class Evidence(Base):
    """Evidence item with integrity hash."""
    __tablename__ = "evidence"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("cases.id"), nullable=True, index=True)
    evidence_type = Column(String(50), nullable=False)
    # Types: transaction, wallet, graph, screenshot, report, timeline, attribution, note, api_response
    title = Column(String(500), default="")
    description = Column(Text, default="")
    source = Column(String(255), default="")
    data = Column(JSON, default=dict)
    sha256_hash = Column(String(64), default="")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow)

    case = relationship("Case", back_populates="evidence_items")


class Alert(Base):
    """Investigation alert."""
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("cases.id"), nullable=True, index=True)
    alert_type = Column(String(100), nullable=False)
    severity = Column(String(20), default="medium")
    title = Column(String(500), default="")
    description = Column(Text, default="")
    wallet_address = Column(String(255), default="")
    tx_hash = Column(String(255), default="")
    status = Column(String(20), default="new")  # new, acknowledged, resolved
    acknowledged_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow, index=True)

    case = relationship("Case", back_populates="alerts")


class AuditLog(Base):
    """Tamper-evident, hash-chained audit log."""
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), default="")
    resource_id = Column(String, default="")
    details = Column(JSON, default=dict)
    ip_address = Column(String(50), default="")
    previous_hash = Column(String(64), default="")
    current_hash = Column(String(64), default="")
    created_at = Column(DateTime, default=utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")


class Entity(Base):
    """Known VASP / Service entity."""
    __tablename__ = "entities"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False, index=True)
    entity_type = Column(String(100), default="unknown")
    # Types: exchange, broker, payment_processor, custodian, bridge, mixer, defi_protocol, unknown
    description = Column(Text, default="")
    website = Column(String(255), default="")
    country = Column(String(100), default="")
    risk_level = Column(String(20), default="unknown")
    source = Column(String(255), default="")
    confidence = Column(Float, default=0.0)
    last_verified = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)


class EntityAddress(Base):
    """Links wallet addresses to known entities."""
    __tablename__ = "entity_addresses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_id = Column(String, ForeignKey("entities.id"), nullable=False, index=True)
    address = Column(String(255), nullable=False, index=True)
    chain = Column(String(50), default="")
    label = Column(String(255), default="")
    address_type = Column(String(100), default="")  # hot_wallet, deposit, withdrawal, contract
    source = Column(String(255), default="")
    confidence = Column(Float, default=0.0)
    last_verified = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)


class Report(Base):
    """Generated investigation report."""
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("cases.id"), nullable=True, index=True)
    report_type = Column(String(20), default="pdf")  # pdf, json, csv
    title = Column(String(500), default="")
    file_path = Column(String(1000), default="")
    file_data = Column(Text, default="")  # Base64 for small reports
    sha256_hash = Column(String(64), default="")
    generated_by = Column(String, ForeignKey("users.id"), nullable=True)
    generated_at = Column(DateTime, default=utcnow)

    case = relationship("Case", back_populates="reports")


class MonitoringTarget(Base):
    """Wallet address being monitored for new transactions."""
    __tablename__ = "monitoring_targets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    wallet_address = Column(String(255), nullable=False, index=True)
    chain = Column(String(50), default="")
    case_id = Column(String, ForeignKey("cases.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    last_checked = Column(DateTime, nullable=True)
    last_tx_hash = Column(String(255), default="")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow)
