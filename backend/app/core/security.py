"""
CryptoTrace AI — Security: JWT tokens + password hashing.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from jose import JWTError, jwt
import bcrypt
from app.core.config import settings
import hashlib
import json


def hash_password(password: str) -> str:
    """Hash a password using bcrypt directly."""
    password_bytes = password.encode("utf-8")[:72]  # bcrypt max length
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8")[:72],
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def compute_sha256(data: Any) -> str:
    """Compute SHA-256 hash of data for evidence integrity."""
    if isinstance(data, dict) or isinstance(data, list):
        data_str = json.dumps(data, sort_keys=True, default=str)
    elif isinstance(data, bytes):
        data_str = data
    else:
        data_str = str(data)

    if isinstance(data_str, str):
        data_str = data_str.encode("utf-8")

    return hashlib.sha256(data_str).hexdigest()


def compute_chain_hash(current_data: str, previous_hash: str) -> str:
    """Compute hash for audit log chain — each record includes previous hash."""
    combined = f"{previous_hash}:{current_data}"
    return hashlib.sha256(combined.encode("utf-8")).hexdigest()
