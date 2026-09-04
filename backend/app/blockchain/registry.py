"""
CryptoTrace AI — Blockchain Adapter Registry
Central registry for all supported chain adapters.
"""
import logging
from typing import Optional, List, Dict
from app.blockchain.base import BlockchainAdapter, ChainIdentification
from app.blockchain.bitcoin import BitcoinAdapter
from app.blockchain.ethereum import EthereumAdapter
from app.core.config import settings

logger = logging.getLogger(__name__)


class BlockchainRegistry:
    """
    Registry of all blockchain adapters. Provides chain detection
    and unified access to any supported chain.
    """

    def __init__(self):
        self._adapters: Dict[str, BlockchainAdapter] = {}
        self._initialize_adapters()

    def _initialize_adapters(self):
        """Register all available adapters."""
        # Bitcoin — always available (no API key needed)
        self._adapters["bitcoin"] = BitcoinAdapter()

        # Ethereum Mainnet
        eth_rpc = settings.ETH_RPC_URL
        if settings.ALCHEMY_API_KEY and "alchemy.com" not in eth_rpc:
            eth_rpc = f"https://eth-mainnet.g.alchemy.com/v2/{settings.ALCHEMY_API_KEY}"

        self._adapters["ethereum"] = EthereumAdapter(
            rpc_url=eth_rpc,
            explorer_api_key=settings.ETH_EXPLORER_API_KEY,
            chain="ethereum",
            asset="ETH",
            explorer_url="https://api.etherscan.io/api",
        )

        # Ethereum Sepolia Testnet (100% Free Ethereum for testing & demonstrations)
        sepolia_rpc = getattr(settings, "SEPOLIA_RPC_URL", "") or "https://ethereum-sepolia-rpc.publicnode.com"
        if settings.ALCHEMY_API_KEY and "alchemy.com" not in sepolia_rpc:
            sepolia_rpc = f"https://eth-sepolia.g.alchemy.com/v2/{settings.ALCHEMY_API_KEY}"

        self._adapters["sepolia"] = EthereumAdapter(
            rpc_url=sepolia_rpc,
            explorer_api_key="",
            chain="sepolia",
            asset="ETH",
            explorer_url="https://eth-sepolia.blockscout.com/api",
        )

        # Polygon — if configured
        if settings.POLYGON_RPC_URL:
            self._adapters["polygon"] = EthereumAdapter(
                rpc_url=settings.POLYGON_RPC_URL,
                explorer_api_key=settings.POLYGON_EXPLORER_API_KEY,
                chain="polygon",
                asset="MATIC",
                explorer_url="https://api.polygonscan.com/api",
            )

        # BNB Chain — if configured
        if settings.BNB_RPC_URL:
            self._adapters["bnb"] = EthereumAdapter(
                rpc_url=settings.BNB_RPC_URL,
                explorer_api_key=settings.BNB_EXPLORER_API_KEY,
                chain="bnb",
                asset="BNB",
                explorer_url="https://api.bscscan.com/api",
            )

    def get_adapter(self, chain: str) -> Optional[BlockchainAdapter]:
        """Get adapter for a specific chain."""
        return self._adapters.get(chain.lower())

    def get_supported_chains(self) -> List[dict]:
        """Return list of supported chains with status."""
        chains = []
        for name, adapter in self._adapters.items():
            chains.append({
                "chain": name,
                "asset": adapter.native_asset,
                "configured": adapter.is_configured,
                "status": "connected" if adapter.is_configured else "not_configured",
            })
        return chains

    async def identify_chain(self, value: str) -> Optional[ChainIdentification]:
        """Auto-detect which blockchain a TXID or address belongs to."""
        value = value.strip()

        # Try each adapter
        for name, adapter in self._adapters.items():
            if not adapter.is_configured:
                continue
            try:
                result = await adapter.identify(value)
                if result:
                    return result
            except Exception as e:
                logger.warning(f"Chain identification error for {name}: {e}")

        return None

    async def close_all(self):
        """Close all adapter HTTP clients."""
        for adapter in self._adapters.values():
            if hasattr(adapter, "close"):
                await adapter.close()


# Singleton instance
registry = BlockchainRegistry()
