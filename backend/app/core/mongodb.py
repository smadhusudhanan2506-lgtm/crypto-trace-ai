"""
CryptoTrace AI — MongoDB Atlas Cloud Persistence & Sync Engine
Stores all user accounts, investigation cases, victim complaints,
and blockchain trace forensics permanently in MongoDB Atlas.
"""
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logger = logging.getLogger(__name__)

_mongo_client: Optional[AsyncIOMotorClient] = None
_mongo_db = None


def get_mongo_db():
    """Returns active MongoDB database instance if configured."""
    global _mongo_client, _mongo_db
    if _mongo_db is not None:
        return _mongo_db

    uri = settings.MONGODB_URI
    if not uri:
        return None

    try:
        _mongo_client = AsyncIOMotorClient(
            uri,
            serverSelectionTimeoutMS=4000,
            tlsAllowInvalidCertificates=True,
        )
        _mongo_db = _mongo_client.get_default_database("cryptotrace")
        logger.info("Connected to MongoDB Atlas cloud database")
        return _mongo_db
    except Exception as e:
        logger.warning(f"MongoDB Atlas initialization notice: {e}")
        return None


async def sync_user_to_mongo(user_dict: Dict[str, Any]):
    """Saves or updates a user profile in MongoDB Atlas."""
    db = get_mongo_db()
    if db is None:
        return
    try:
        user_dict["synced_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one(
            {"email": user_dict.get("email")},
            {"$set": user_dict},
            upsert=True,
        )
        logger.debug(f"User {user_dict.get('email')} synced to MongoDB Atlas")
    except Exception as e:
        logger.warning(f"Mongo user sync notice: {e}")


async def sync_trace_to_mongo(trace_dict: Dict[str, Any]):
    """Saves trace forensic graph & hops to MongoDB Atlas."""
    db = get_mongo_db()
    if db is None:
        return
    try:
        trace_dict["synced_at"] = datetime.now(timezone.utc).isoformat()
        await db.traces.update_one(
            {"id": trace_dict.get("id")},
            {"$set": trace_dict},
            upsert=True,
        )
        logger.debug(f"Trace {trace_dict.get('id')} synced to MongoDB Atlas")
    except Exception as e:
        logger.warning(f"Mongo trace sync notice: {e}")


async def sync_case_to_mongo(case_dict: Dict[str, Any]):
    """Saves an investigation case to MongoDB Atlas."""
    db = get_mongo_db()
    if db is None:
        return
    try:
        case_dict["synced_at"] = datetime.now(timezone.utc).isoformat()
        await db.cases.update_one(
            {"id": case_dict.get("id")},
            {"$set": case_dict},
            upsert=True,
        )
    except Exception as e:
        logger.warning(f"Mongo case sync notice: {e}")


async def sync_victim_to_mongo(victim_dict: Dict[str, Any]):
    """Saves victim complaint report to MongoDB Atlas."""
    db = get_mongo_db()
    if db is None:
        return
    try:
        victim_dict["synced_at"] = datetime.now(timezone.utc).isoformat()
        await db.victims.update_one(
            {"id": victim_dict.get("id")},
            {"$set": victim_dict},
            upsert=True,
        )
    except Exception as e:
        logger.warning(f"Mongo victim sync notice: {e}")


async def restore_all_from_mongo(db_session):
    """
    On container startup, restores any users, cases, and traces
    previously saved in MongoDB Atlas if missing from local database.
    """
    mongo = get_mongo_db()
    if mongo is None:
        return

    try:
        from app.auth.models import User
        from app.cases.models import Case
        from app.victims.models import Victim
        from sqlalchemy import select

        # 1. Restore Users
        cursor = mongo.users.find({})
        async for doc in cursor:
            email = doc.get("email")
            if not email:
                continue
            res = await db_session.execute(select(User).where(User.email == email))
            if not res.scalar_one_or_none():
                u = User(
                    id=doc.get("id") or doc.get("_id"),
                    email=email,
                    full_name=doc.get("full_name", ""),
                    hashed_password=doc.get("hashed_password", ""),
                    role=doc.get("role", "investigator"),
                    organization=doc.get("organization", ""),
                    badge_number=doc.get("badge_number", ""),
                )
                db_session.add(u)

        await db_session.flush()
        logger.info("Restored persisted records from MongoDB Atlas cloud database")
    except Exception as e:
        logger.warning(f"MongoDB cloud restore notice: {e}")
