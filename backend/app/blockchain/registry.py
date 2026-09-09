"""
CryptoTrace AI — Blockchain Adapter Registry
Central registry and auto-detection router for all supported blockchains.
"""
import logging
from typing import Optional, List, Dict
from app.blockchain.base import BlockchainAdapter, ChainIdentification
from app.blockchain.bitcoin import BitcoinAdapter
from app.blockchain.ethereum import EthereumAdapter
from app.blockchain.tron import TronAdapter
from app.blockchain.solana import SolanaAdapter
from app.blockchain.utxo import UTXOAdapter
from app.core.config import settings

logger = logging.getLogger(__name__)


class BlockchainRegistry:
    """
    Registry of all blockchain adapters. Provides multi-chain detection
    and unified forensic access to any supported chain.
    """

    def __init__(self):
        self._adapters: Dict[str, BlockchainAdapter] = {}
        self._initialize_adapters()

    def _initialize_adapters(self):
        """Register all available blockchain adapters."""
        # 1. Bitcoin Mainnet (BTC)
        self._adapters["bitcoin"] = BitcoinAdapter()

        # 2. Ethereum Mainnet (ETH)
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

        # 3. Ethereum Sepolia Testnet (ETH)
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

        # 4. Tron Network (TRX & TRC-20 USDT)
        self._adapters["tron"] = TronAdapter()

        # 5. Solana Network (SOL & SPL Tokens)
        self._adapters["solana"] = SolanaAdapter()

        # 6. BNB Smart Chain (BSC / BNB)
        bnb_rpc = settings.BNB_RPC_URL or "https://bsc-dataseed.binance.org"
        self._adapters["bnb"] = EthereumAdapter(
            rpc_url=bnb_rpc,
            explorer_api_key=settings.BNB_EXPLORER_API_KEY or settings.ETH_EXPLORER_API_KEY or "",
            chain="bnb",
            asset="BNB",
            explorer_url="https://api.bscscan.com/api",
        )
        self._adapters["bsc"] = self._adapters["bnb"]

        # 7. Polygon (MATIC / POL)
        polygon_rpc = settings.POLYGON_RPC_URL or "https://polygon-bor-rpc.publicnode.com"
        self._adapters["polygon"] = EthereumAdapter(
            rpc_url=polygon_rpc,
            explorer_api_key=settings.POLYGON_EXPLORER_API_KEY or settings.ETH_EXPLORER_API_KEY or "",
            chain="polygon",
            asset="MATIC",
            explorer_url="https://api.polygonscan.com/api",
        )

        # 8. Arbitrum One (ARB / ETH)
        self._adapters["arbitrum"] = EthereumAdapter(
            rpc_url="https://arb1.arbitrum.io/rpc",
            explorer_api_key=settings.ETH_EXPLORER_API_KEY or "",
            chain="arbitrum",
            asset="ETH",
            explorer_url="https://api.arbiscan.io/api",
        )

        # 9. Base (ETH)
        self._adapters["base"] = EthereumAdapter(
            rpc_url="https://mainnet.base.org",
            explorer_api_key=settings.ETH_EXPLORER_API_KEY or "",
            chain="base",
            asset="ETH",
            explorer_url="https://api.basescan.org/api",
        )

        # 10. Optimism (OP / ETH)
        self._adapters["optimism"] = EthereumAdapter(
            rpc_url="https://mainnet.optimism.io",
            explorer_api_key=settings.ETH_EXPLORER_API_KEY or "",
            chain="optimism",
            asset="ETH",
            explorer_url="https://api-optimistic.etherscan.io/api",
        )

        # 11. Avalanche C-Chain (AVAX)
        self._adapters["avalanche"] = EthereumAdapter(
            rpc_url="https://api.avax.network/ext/bc/C/rpc",
            explorer_api_key=settings.ETH_EXPLORER_API_KEY or "",
            chain="avalanche",
            asset="AVAX",
            explorer_url="https://api.snowtrace.io/api",
        )

        # 12. Litecoin (LTC)
        self._adapters["litecoin"] = UTXOAdapter(chain="litecoin", asset="LTC")

        # 13. Dogecoin (DOGE)
        self._adapters["dogecoin"] = UTXOAdapter(chain="dogecoin", asset="DOGE")

    def get_adapter(self, chain: str) -> Optional[BlockchainAdapter]:
        """Get adapter for a specific chain."""
        return self._adapters.get(chain.lower())

    def get_supported_chains(self) -> List[dict]:
        """Return list of supported chains with status."""
        seen = set()
        chains = []
        for name, adapter in self._adapters.items():
            if adapter.chain_name in seen:
                continue
            seen.add(adapter.chain_name)
            chains.append({
                "chain": adapter.chain_name,
                "asset": adapter.native_asset,
                "configured": adapter.is_configured,
                "status": "connected" if adapter.is_configured else "not_configured",
            })
        return chains

    async def identify_chain(self, value: str) -> Optional[ChainIdentification]:
        """Auto-detect which blockchain a TXID or address belongs to."""
        val = value.strip()

        # 1. Check Tron (Address starts with T, 34 chars)
        tron_adapter = self._adapters.get("tron")
        if tron_adapter and await tron_adapter.validate_address(val):
            return ChainIdentification(chain="tron", confidence=0.98, address_type="address")

        # 2. Check Bitcoin (Addresses start with 1, 3, bc1)
        btc_adapter = self._adapters.get("bitcoin")
        if btc_adapter and await btc_adapter.validate_address(val):
            return ChainIdentification(chain="bitcoin", confidence=0.98, address_type="address")

        # 3. Check Litecoin
        ltc_adapter = self._adapters.get("litecoin")
        if ltc_adapter and await ltc_adapter.validate_address(val):
            return ChainIdentification(chain="litecoin", confidence=0.95, address_type="address")

        # 4. Check Dogecoin
        doge_adapter = self._adapters.get("dogecoin")
        if doge_adapter and await doge_adapter.validate_address(val):
            return ChainIdentification(chain="dogecoin", confidence=0.95, address_type="address")

        # 5. Check Solana
        sol_adapter = self._adapters.get("solana")
        if sol_adapter:
            if await sol_adapter.validate_transaction(val):
                return ChainIdentification(chain="solana", confidence=0.99, address_type="transaction")
            if await sol_adapter.validate_address(val) and not val.startswith("0x") and not val.startswith("bc1"):
                return ChainIdentification(chain="solana", confidence=0.95, address_type="address")

        # 6. EVM Transactions (0x + 64 hex chars = 66 chars)
        is_evm_tx = val.startswith("0x") and len(val) == 66
        if is_evm_tx:
            # Probe chains in order of likelihood
            for chain_name in ["ethereum", "sepolia", "polygon", "bnb", "arbitrum", "base", "optimism"]:
                adapter = self._adapters.get(chain_name)
                if adapter and adapter.is_configured:
                    try:
                        tx = await asyncio.wait_for(adapter.get_transaction(val), timeout=2.5)
                        if tx:
                            return ChainIdentification(chain=chain_name, confidence=0.99, address_type="transaction")
                    except Exception:
                        pass
            return ChainIdentification(chain="ethereum", confidence=0.85, address_type="transaction")

        # 7. EVM Addresses (0x + 40 hex chars = 42 chars)
        is_evm_addr = val.startswith("0x") and len(val) == 42
        if is_evm_addr:
            for chain_name in ["ethereum", "sepolia", "polygon", "bnb", "arbitrum", "base"]:
                adapter = self._adapters.get(chain_name)
                if adapter and adapter.is_configured:
                    try:
                        info = await asyncio.wait_for(adapter.get_address_info(val), timeout=2.5)
                        if info and (info.tx_count > 0 or info.balance > 0):
                            return ChainIdentification(chain=chain_name, confidence=0.95, address_type="address")
                    except Exception:
                        pass
            return ChainIdentification(chain="ethereum", confidence=0.85, address_type="address")

        # 8. 64-char Hex Hash without 0x (could be Bitcoin, Tron, or other UTXO)
        if len(val) == 64 and all(c in "0123456789abcdefABCDEF" for c in val):
            # Probe Bitcoin first
            if btc_adapter:
                try:
                    tx = await asyncio.wait_for(btc_adapter.get_transaction(val), timeout=2.5)
                    if tx:
                        return ChainIdentification(chain="bitcoin", confidence=0.99, address_type="transaction")
                except Exception:
                    pass

            # Probe Tron
            if tron_adapter:
                try:
                    tx = await asyncio.wait_for(tron_adapter.get_transaction(val), timeout=2.5)
                    if tx:
                        return ChainIdentification(chain="tron", confidence=0.99, address_type="transaction")
                except Exception:
                    pass

            # Probe EVM with 0x prefix
            evm_hash = "0x" + val
            for chain_name in ["ethereum", "sepolia", "polygon", "bnb"]:
                adapter = self._adapters.get(chain_name)
                if adapter:
                    try:
                        tx = await asyncio.wait_for(adapter.get_transaction(evm_hash), timeout=2.5)
                        if tx:
                            return ChainIdentification(chain=chain_name, confidence=0.99, address_type="transaction")
                    except Exception:
                        pass

        return None

    async def close_all(self):
        """Close all adapter HTTP clients."""
        for adapter in self._adapters.values():
            if hasattr(adapter, "close"):
                await adapter.close()


# Singleton instance
registry = BlockchainRegistry()
