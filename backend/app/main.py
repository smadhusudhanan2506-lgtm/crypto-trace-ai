"""
CryptoTrace AI — FastAPI Application Entry Point
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_db, close_db
from app.auth.router import router as auth_router
from app.cases.router import router as cases_router
from app.victims.router import router as victims_router, global_router as victims_global_router
from app.tracing.router import router as tracing_router
from app.analytics.router import (
    blockchain_router, analytics_router,
    evidence_router, audit_router, alerts_router,
    vasp_router,
)

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: startup and shutdown."""
    logger.info(f"Starting {settings.APP_NAME} in {settings.APP_MODE} mode...")
    await init_db()
    logger.info("Database initialized")

    # Restore data from MongoDB Atlas Cloud if available
    try:
        from app.core.database import async_session
        from app.core.mongodb import restore_all_from_mongo
        async with async_session() as db:
            await restore_all_from_mongo(db)
            await db.commit()
    except Exception as e:
        logger.warning(f"MongoDB restore on startup: {e}")

    # Seed essential users (always available in both live and demo mode)
    try:
        from app.core.database import async_session
        from app.auth.service import seed_essential_users
        async with async_session() as db:
            await seed_essential_users(db)
            await db.commit()
        logger.info("Essential investigator accounts verified")
    except Exception as e:
        logger.warning(f"Essential user seeding: {e}")

    # Seed demo data and known entities
    try:
        from app.core.database import async_session
        from app.attribution.known_entities import seed_entities
        async with async_session() as db:
            await seed_entities(db)
            await db.commit()
        logger.info("Known entities seeded")
    except Exception as e:
        logger.warning(f"Entity seeding: {e}")

    # Seed demo data if in demo mode
    if settings.is_demo_mode:
        try:
            from app.seed_data import seed_demo_data
            from app.core.database import async_session
            async with async_session() as db:
                await seed_demo_data(db)
                await db.commit()
            logger.info("Demo data seeded")
        except Exception as e:
            logger.warning(f"Demo data seeding: {e}")

    yield

    # Shutdown
    from app.blockchain.registry import registry
    await registry.close_all()
    await close_db()
    logger.info("Application shut down")


# Create FastAPI app
app = FastAPI(
    title="CryptoTrace AI",
    description="Real-Time Blockchain Fraud Investigation & VASP Attribution Platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(cases_router)
app.include_router(victims_router)
app.include_router(victims_global_router)
app.include_router(tracing_router)
app.include_router(blockchain_router)
app.include_router(analytics_router)
app.include_router(evidence_router)
app.include_router(audit_router)
app.include_router(alerts_router)
app.include_router(vasp_router)


@app.get("/api/health")
async def health_check():
    """System health check endpoint."""
    from app.blockchain.registry import registry
    chains = registry.get_supported_chains()

    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "mode": settings.APP_MODE,
        "version": "1.0.0",
        "services": {
            "backend": "online",
            "database": "online",
            "blockchain_providers": chains,
        },
    }


@app.get("/api/config")
async def get_app_config():
    """Public app configuration (no secrets)."""
    from app.blockchain.registry import registry
    return {
        "app_name": settings.APP_NAME,
        "mode": settings.APP_MODE,
        "supported_chains": registry.get_supported_chains(),
        "features": {
            "live_blockchain": settings.is_live_mode,
            "demo_mode": settings.is_demo_mode,
            "ai_assistant": bool(settings.OPENAI_API_KEY),
            "eth_explorer": settings.has_eth_explorer,
        },
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global error handler — don't expose stack traces."""
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again."},
    )
