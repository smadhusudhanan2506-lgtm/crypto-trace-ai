"""
CryptoTrace AI — Auth Service: login, register, token validation.
"""
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.auth.models import User
from app.auth.schemas import UserCreate, UserLogin, UserResponse, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token


async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
    """Register a new user."""
    # Check if email exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise ValueError("Email already registered")

    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hash_password(user_data.password),
        role=user_data.role,
        organization=user_data.organization,
        badge_number=user_data.badge_number,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, login_data: UserLogin) -> Optional[User]:
    """Authenticate user and return User if valid."""
    result = await db.execute(select(User).where(User.email == login_data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(login_data.password, user.hashed_password):
        return None
    # Update last login
    user.last_login = datetime.now(timezone.utc)
    await db.flush()
    return user


async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
    """Get user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Get user by email."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


def create_user_token(user: User) -> TokenResponse:
    """Create JWT token for authenticated user."""
    token_data = {
        "sub": user.id,
        "email": user.email,
        "role": user.role,
    }
    access_token = create_access_token(token_data)
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )
