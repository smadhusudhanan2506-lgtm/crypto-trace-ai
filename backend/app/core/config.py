"""
CryptoTrace AI — Application Configuration & Settings
"""
import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # === Application ===
    APP_NAME: str = "CryptoTraceAI"
    APP_MODE: str = "live"  # "live" or "demo"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # === Database ===
    DATABASE_URL: str = "sqlite+aiosqlite:///./cryptotrace.db"
    MONGODB_URI: Optional[str] = None

    # === Authentication ===
    JWT_SECRET: str = "change-this-to-a-random-secret-key-at-least-32-chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 480

    # === Blockchain Providers ===
    BTC_API_URL: str = "https://mempool.space/api"
    BTC_FALLBACK_API_URL: str = "https://blockstream.info/api"

    ETH_RPC_URL: str = "https://rpc.ankr.com/eth"
    SEPOLIA_RPC_URL: str = "https://ethereum-sepolia-rpc.publicnode.com"
    ALCHEMY_API_KEY: Optional[str] = None
    ETH_EXPLORER_API_KEY: Optional[str] = None

    POLYGON_RPC_URL: Optional[str] = None
    POLYGON_EXPLORER_API_KEY: Optional[str] = None
    BNB_RPC_URL: Optional[str] = None
    BNB_EXPLORER_API_KEY: Optional[str] = None

    # === AI Investigation Keys ===
    OPENAI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None

    # === Rate Limits & Constraints ===
    BLOCKCHAIN_MAX_REQUESTS_PER_SECOND: int = 5
    TRACE_MAX_HOPS: int = 100
    TRACE_MAX_ADDRESSES_PER_HOP: int = 50
    TRACE_MAX_DURATION_SECONDS: int = 600

    # === CORS ===
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_demo_mode(self) -> bool:
        return self.APP_MODE.lower() == "demo"

    @property
    def is_live_mode(self) -> bool:
        return self.APP_MODE.lower() == "live"

    @property
    def has_eth_explorer(self) -> bool:
        return bool(self.ETH_EXPLORER_API_KEY)


settings = Settings()
