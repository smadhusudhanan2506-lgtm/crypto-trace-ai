"""
CryptoTrace AI — Auth API Router
Registers and authenticates users, saving user profiles, sessions, and audit events to the database.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.auth.schemas import UserCreate, UserLogin, TokenResponse, UserResponse
from app.auth import service as auth_service
from app.audit import log_action

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, request: Request, db: AsyncSession = Depends(get_db)):
    """Register a new investigator account and save to database."""
    try:
        user = await auth_service.create_user(db, user_data)
        
        # Log registration audit event in the database
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "")
        await log_action(
            db=db,
            user_id=user.id,
            action="user.registered",
            resource_type="user",
            resource_id=user.id,
            details={
                "email": user.email,
                "role": user.role,
                "organization": user.organization,
                "badge_number": user.badge_number,
                "user_agent": user_agent,
            },
            ip_address=client_ip,
        )
        await db.commit()
        await db.refresh(user)
        return auth_service.create_user_token(user)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")


@router.post("/login", response_model=TokenResponse)
async def login(login_data: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    """Authenticate, update login timestamp, log audit trail, and receive JWT token."""
    user = await auth_service.authenticate_user(db, login_data)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")

    # Log successful login in database audit trail
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "")
    await log_action(
        db=db,
        user_id=user.id,
        action="user.login",
        resource_type="user",
        resource_id=user.id,
        details={
            "email": user.email,
            "role": user.role,
            "user_agent": user_agent,
        },
        ip_address=client_ip,
    )
    await db.commit()
    await db.refresh(user)
    return auth_service.create_user_token(user)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(lambda: None),
):
    """Get current user info from JWT."""
    pass
