"""
CryptoTrace AI — Database Engine & Session Management
Async SQLAlchemy with SQLite (dev) / PostgreSQL (prod).
"""
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings


# For SQLite, we need to handle the path correctly
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite+aiosqlite:///./"):
    # Make the path absolute relative to the backend directory
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "cryptotrace.db")
    db_url = f"sqlite+aiosqlite:///{db_path}"

engine = create_async_engine(
    db_url,
    echo=settings.DEBUG,
    # SQLite needs these; PostgreSQL ignores them
    connect_args={"check_same_thread": False, "timeout": 30} if "sqlite" in db_url else {},
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


def register_models():
    """Import all models to register them with Base.registry."""
    import app.auth.models  # noqa: F401
    import app.cases.models  # noqa: F401
    import app.victims.models  # noqa: F401
    import app.tracing  # noqa: F401


# Call immediately on module load
register_models()


async def get_db() -> AsyncSession:
    """Dependency that provides an async database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Create all tables and configure SQLite pragma. Called at application startup."""
    register_models()
    async with engine.begin() as conn:
        if "sqlite" in db_url:
            await conn.execute(text("PRAGMA journal_mode=WAL;"))
            await conn.execute(text("PRAGMA busy_timeout=30000;"))
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Dispose of the engine. Called at application shutdown."""
    await engine.dispose()
