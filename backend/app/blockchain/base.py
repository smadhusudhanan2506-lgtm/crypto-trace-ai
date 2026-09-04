"""
CryptoTrace AI — Abstract Blockchain Adapter
Every chain adapter must implement this interface.
"""
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel


# ============================================================
# Normalized Data Models — Common schema across all blockchains
# ============================================================

class TxInput(BaseModel):
    """Bitcoin-style transaction input."""
    address: str = ""
    value: float = 0.0
    prev_tx_hash: str = ""
    prev_output_index: int = 0
    script: str = ""


class TxOutput(BaseModel):
    """Bitcoin-style transaction output."""
    address: str = ""
    value: float = 0.0
    output_index: int = 0
    script: str = ""
    spent: bool = False
    spending_tx_hash: str = ""


class TokenTransfer(BaseModel):
    """ERC-20 / token transfer."""
    token_address: str = ""
    token_name: str = ""
    token_symbol: str = ""
    token_decimals: int = 18
    from_address: str = ""
    to_address: str = ""
    value: float = 0.0
    log_index: int = 0


class NormalizedTransaction(BaseModel):
    """Universal transaction representation across all blockchains."""
    tx_hash: str
    chain: str  # "bitcoin", "ethereum", "polygon", etc.
    block_number: int = 0
    block_hash: str = ""
    block_timestamp: Optional[datetime] = None
    status: str = "confirmed"  # confirmed, pending, failed
    confirmations: int = 0

    # Sender / Receiver (primary)
    from_address: str = ""
    to_address: str = ""
    amount: float = 0.0
    asset: str = ""  # "BTC", "ETH", "USDT", etc.

    # Fee
    fee: float = 0.0
    gas_used: int = 0
    gas_price: float = 0.0

    # Bitcoin UTXO model
    inputs: List[TxInput] = []
    outputs: List[TxOutput] = []

    # Ethereum token transfers
    token_transfers: List[TokenTransfer] = []

    # Contract interaction
    is_contract_interaction: bool = False
    contract_address: str = ""
    method_name: str = ""

    # Raw data preserved for reproducibility
    raw_data: Dict[str, Any] = {}

    # Provenance
    provider: str = ""
    provider_url: str = ""
    retrieved_at: Optional[datetime] = None


class AddressInfo(BaseModel):
    """Wallet address information."""
    address: str
    chain: str
    balance: float = 0.0
    asset: str = ""
    tx_count: int = 0
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    is_contract: bool = False
    provider: str = ""
    retrieved_at: Optional[datetime] = None


class ChainIdentification(BaseModel):
    """Result of chain auto-detection."""
    chain: str
    confidence: float
    address_type: str = ""  # "address" or "transaction"


# ============================================================
# Abstract Adapter — Every blockchain implements this
# ============================================================

class BlockchainAdapter(ABC):
    """Abstract base class for blockchain data adapters."""

    @property
    @abstractmethod
    def chain_name(self) -> str:
        """Return the chain identifier (e.g., 'bitcoin', 'ethereum')."""
        pass

    @property
    @abstractmethod
    def native_asset(self) -> str:
        """Return the native asset symbol (e.g., 'BTC', 'ETH')."""
        pass

    @property
    @abstractmethod
    def is_configured(self) -> bool:
        """Check if this adapter has valid configuration."""
        pass

    @abstractmethod
    async def validate_address(self, address: str) -> bool:
        """Validate if a string is a valid address for this chain."""
        pass

    @abstractmethod
    async def validate_transaction(self, tx_hash: str) -> bool:
        """Validate if a string is a valid transaction hash for this chain."""
        pass

    @abstractmethod
    async def get_transaction(self, tx_hash: str) -> Optional[NormalizedTransaction]:
        """Fetch and normalize a transaction by hash."""
        pass

    @abstractmethod
    async def get_transactions_for_address(
        self, address: str, limit: int = 50
    ) -> List[NormalizedTransaction]:
        """Fetch transactions for an address."""
        pass

    @abstractmethod
    async def get_address_info(self, address: str) -> Optional[AddressInfo]:
        """Get address balance and basic info."""
        pass

    async def get_token_transfers(
        self, address: str, limit: int = 50
    ) -> List[TokenTransfer]:
        """Get token transfers for an address (EVM chains)."""
        return []

    async def get_internal_transactions(
        self, tx_hash: str
    ) -> List[NormalizedTransaction]:
        """Get internal transactions (EVM chains)."""
        return []

    async def identify(self, value: str) -> Optional[ChainIdentification]:
        """Try to identify if a value belongs to this chain."""
        if await self.validate_transaction(value):
            return ChainIdentification(
                chain=self.chain_name,
                confidence=0.9,
                address_type="transaction",
            )
        if await self.validate_address(value):
            return ChainIdentification(
                chain=self.chain_name,
                confidence=0.8,
                address_type="address",
            )
        return None
