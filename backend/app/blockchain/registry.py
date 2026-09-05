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
            explorer_api_key=settings.ETH_EXPLORER_API_KEY or "",
            chain="sepolia",
            asset="ETH",
            explorer_url="https://api.etherscan.io/v2/api",
        )

        # Polygon — default to public RPC if not explicitly configured
        polygon_rpc = settings.POLYGON_RPC_URL or "https://polygon-bor-rpc.publicnode.com"
        self._adapters["polygon"] = EthereumAdapter(
            rpc_url=polygon_rpc,
            explorer_api_key=settings.ETH_EXPLORER_API_KEY or settings.POLYGON_EXPLORER_API_KEY or "",
            chain="polygon",
            asset="MATIC",
            explorer_url="https://api.polygonscan.com/api",
        )

        # BNB Chain — default to public RPC if not explicitly configured
        bnb_rpc = settings.BNB_RPC_URL or "https://bsc-dataseed.binance.org"
        self._adapters["bnb"] = EthereumAdapter(
            rpc_url=bnb_rpc,
            explorer_api_key=settings.ETH_EXPLORER_API_KEY or settings.BNB_EXPLORER_API_KEY or "",
            chain="bnb",
            asset="BNB",
            explorer_url="https://api.bscscan.com/api",
        )

        # Arbitrum One
        self._adapters["arbitrum"] = EthereumAdapter(
            rpc_url="https://arb1.arbitrum.io/rpc",
            explorer_api_key=settings.ETH_EXPLORER_API_KEY or "",
            chain="arbitrum",
            asset="ETH",
            explorer_url="https://api.arbiscan.io/api",
        )

        # Base
        self._adapters["base"] = EthereumAdapter(
            rpc_url="https://mainnet.base.org",
            explorer_api_key=settings.ETH_EXPLORER_API_KEY or "",
            chain="base",
            asset="ETH",
            explorer_url="https://api.basescan.org/api",
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

        # Check Bitcoin first
        btc_adapter = self._adapters.get("bitcoin")
        if btc_adapter and btc_adapter.is_configured:
            if await btc_adapter.validate_transaction(value):
                tx = await btc_adapter.get_transaction(value)
                if tx:
                    return ChainIdentification(chain="bitcoin", confidence=0.99, address_type="transaction")
            elif await btc_adapter.validate_address(value):
                return ChainIdentification(chain="bitcoin", confidence=0.95, address_type="address")

        # EVM identification: Probe Sepolia and Ethereum RPCs to identify exact network
        is_tx = value.startswith("0x") and len(value) == 66
        is_addr = value.startswith("0x") and len(value) == 42

        if is_tx:
            for chain_name in ["sepolia", "ethereum", "polygon", "bnb"]:
                adapter = self._adapters.get(chain_name)
                if adapter and adapter.is_configured:
                    try:
                        tx = await adapter.get_transaction(value)
                        if tx:
                            return ChainIdentification(chain=chain_name, confidence=0.99, address_type="transaction")
                    except Exception:
                        pass
            return ChainIdentification(chain="sepolia" if "sepolia" in value.lower() else "sepolia", confidence=0.85, address_type="transaction")

        if is_addr:
            for chain_name in ["sepolia", "ethereum", "polygon", "bnb"]:
                adapter = self._adapters.get(chain_name)
                if adapter and adapter.is_configured:
                    try:
                        info = await adapter.get_address_info(value)
                        if info and info.tx_count > 0:
                            return ChainIdentification(chain=chain_name, confidence=0.95, address_type="address")
                    except Exception:
                        pass
            return ChainIdentification(chain="sepolia", confidence=0.8, address_type="address")

        return None

    async def close_all(self):
        """Close all adapter HTTP clients."""
        for adapter in self._adapters.values():
            if hasattr(adapter, "close"):
                await adapter.close()


# Singleton instance
registry = BlockchainRegistry()
