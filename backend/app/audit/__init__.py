"""
CryptoTrace AI — Audit Log Service (Hash-Chained)
"""
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.tracing import AuditLog
from app.core.security import compute_chain_hash
import json


async def log_action(
    db: AsyncSession,
    user_id: str,
    action: str,
    resource_type: str = "",
    resource_id: str = "",
    details: dict = None,
    ip_address: str = "",
):
    """Create a hash-chained audit log entry."""
    # Get previous hash
    result = await db.execute(
        select(AuditLog).order_by(desc(AuditLog.created_at)).limit(1)
    )
    previous = result.scalar_one_or_none()
    previous_hash = previous.current_hash if previous else "genesis"

    # Compute current hash
    record_data = json.dumps({
        "user_id": user_id,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }, sort_keys=True)

    current_hash = compute_chain_hash(record_data, previous_hash)

    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {},
        ip_address=ip_address,
        previous_hash=previous_hash,
        current_hash=current_hash,
    )
    db.add(log)
    await db.flush()
    return log
