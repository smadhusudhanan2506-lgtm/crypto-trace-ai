"""
CryptoTrace AI — Bitcoin Blockchain Adapter
Real Bitcoin data via Mempool.space and Blockstream APIs.
No API key required.
"""
import re
import httpx
import asyncio
import logging
from typing import Optional, List
from datetime import datetime, timezone
from app.blockchain.base import (
    BlockchainAdapter, NormalizedTransaction, AddressInfo,
    TxInput, TxOutput, ChainIdentification,
)
from app.core.config import settings

logger = logging.getLogger(__name__)

# Bitcoin address regex patterns
BTC_LEGACY_REGEX = re.compile(r'^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$')
BTC_SEGWIT_REGEX = re.compile(r'^bc1[a-zA-HJ-NP-Z0-9]{25,90}$')
BTC_TX_REGEX = re.compile(r'^[a-fA-F0-9]{64}$')


class BitcoinAdapter(BlockchainAdapter):
    """
    Bitcoin adapter using Mempool.space (primary) and Blockstream (fallback).
    Both are free, no API key required.
    """

    def __init__(self):
        self.primary_url = settings.BTC_API_URL.rstrip("/")
        self.fallback_url = settings.BTC_FALLBACK_API_URL.rstrip("/")
        self._client = None
        self._rate_limiter = asyncio.Semaphore(settings.BLOCKCHAIN_MAX_REQUESTS_PER_SECOND)

    @property
    def chain_name(self) -> str:
        return "bitcoin"

    @property
    def native_asset(self) -> str:
        return "BTC"

    @property
    def is_configured(self) -> bool:
        return True  # No API key needed

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def _request(self, path: str, fallback: bool = True) -> Optional[dict]:
        """Make request with rate limiting and fallback."""
        async with self._rate_limiter:
            client = await self._get_client()
            url = f"{self.primary_url}{path}"
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    return response.json()
                logger.warning(f"Bitcoin API {url} returned {response.status_code}")
            except Exception as e:
                logger.warning(f"Bitcoin primary API error: {e}")

            # Try fallback
            if fallback:
                url = f"{self.fallback_url}{path}"
                try:
                    response = await client.get(url)
                    if response.status_code == 200:
                        return response.json()
                except Exception as e:
                    logger.error(f"Bitcoin fallback API error: {e}")

            return None

    async def validate_address(self, address: str) -> bool:
        """Validate Bitcoin address format."""
        if BTC_LEGACY_REGEX.match(address):
            return True
        if BTC_SEGWIT_REGEX.match(address):
            return True
        return False

    async def validate_transaction(self, tx_hash: str) -> bool:
        """Validate Bitcoin transaction hash format."""
        return bool(BTC_TX_REGEX.match(tx_hash))

    async def get_transaction(self, tx_hash: str) -> Optional[NormalizedTransaction]:
        """Fetch real Bitcoin transaction from Mempool.space API."""
        data = await self._request(f"/tx/{tx_hash}")
        if not data:
            return None

        # Get status
        status_data = data.get("status", {})
        confirmed = status_data.get("confirmed", False)
        block_height = status_data.get("block_height", 0)
        block_hash = status_data.get("block_hash", "")
        block_time = status_data.get("block_time", 0)

        # Parse inputs
        inputs = []
        total_input = 0
        input_addresses = []
        for vin in data.get("vin", []):
            prevout = vin.get("prevout", {})
            addr = prevout.get("scriptpubkey_address", "")
            value_sat = prevout.get("value", 0)
            value_btc = value_sat / 1e8
            total_input += value_sat
            if addr:
                input_addresses.append(addr)
            inputs.append(TxInput(
                address=addr,
                value=value_btc,
                prev_tx_hash=vin.get("txid", ""),
                prev_output_index=vin.get("vout", 0),
                script=vin.get("scriptsig", ""),
            ))

        # Parse outputs
        outputs = []
        total_output = 0
        output_addresses = []
        for idx, vout in enumerate(data.get("vout", [])):
            addr = vout.get("scriptpubkey_address", "")
            value_sat = vout.get("value", 0)
            value_btc = value_sat / 1e8
            total_output += value_sat
            if addr:
                output_addresses.append(addr)
            outputs.append(TxOutput(
                address=addr,
                value=value_btc,
                output_index=idx,
                script=vout.get("scriptpubkey_type", ""),
            ))

        fee_sat = data.get("fee", total_input - total_output)
        fee_btc = fee_sat / 1e8

        # Primary sender = first input address
        from_addr = input_addresses[0] if input_addresses else ""
        # Primary receiver = first non-sender output, or first output
        to_addr = ""
        for addr in output_addresses:
            if addr != from_addr:
                to_addr = addr
                break
        if not to_addr and output_addresses:
            to_addr = output_addresses[0]

        timestamp = datetime.fromtimestamp(block_time, tz=timezone.utc) if block_time else None

        return NormalizedTransaction(
            tx_hash=data.get("txid", tx_hash),
            chain="bitcoin",
            block_number=block_height,
            block_hash=block_hash,
            block_timestamp=timestamp,
            status="confirmed" if confirmed else "pending",
            confirmations=0,  # Would need current block height
            from_address=from_addr,
            to_address=to_addr,
            amount=total_output / 1e8,
            asset="BTC",
            fee=fee_btc,
            inputs=inputs,
            outputs=outputs,
            raw_data=data,
            provider="mempool.space",
            provider_url=f"{self.primary_url}/tx/{tx_hash}",
            retrieved_at=datetime.now(timezone.utc),
        )

    async def get_transactions_for_address(
        self, address: str, limit: int = 50
    ) -> List[NormalizedTransaction]:
        """Fetch transactions for a Bitcoin address."""
        data = await self._request(f"/address/{address}/txs")
        if not data or not isinstance(data, list):
            return []

        transactions = []
        for tx_data in data[:limit]:
            txid = tx_data.get("txid", "")
            if txid:
                # Parse each transaction inline to avoid extra API calls
                status_data = tx_data.get("status", {})
                confirmed = status_data.get("confirmed", False)
                block_height = status_data.get("block_height", 0)
                block_hash = status_data.get("block_hash", "")
                block_time = status_data.get("block_time", 0)

                inputs = []
                total_input = 0
                input_addrs = []
                for vin in tx_data.get("vin", []):
                    prevout = vin.get("prevout", {})
                    addr = prevout.get("scriptpubkey_address", "")
                    value_sat = prevout.get("value", 0)
                    total_input += value_sat
                    if addr:
                        input_addrs.append(addr)
                    inputs.append(TxInput(
                        address=addr,
                        value=value_sat / 1e8,
                        prev_tx_hash=vin.get("txid", ""),
                        prev_output_index=vin.get("vout", 0),
                    ))

                outputs = []
                total_output = 0
                output_addrs = []
                for idx, vout in enumerate(tx_data.get("vout", [])):
                    addr = vout.get("scriptpubkey_address", "")
                    value_sat = vout.get("value", 0)
                    total_output += value_sat
                    if addr:
                        output_addrs.append(addr)
                    outputs.append(TxOutput(
                        address=addr,
                        value=value_sat / 1e8,
                        output_index=idx,
                    ))

                from_addr = input_addrs[0] if input_addrs else ""
                to_addr = ""
                for a in output_addrs:
                    if a != from_addr:
                        to_addr = a
                        break
                if not to_addr and output_addrs:
                    to_addr = output_addrs[0]

                fee_sat = tx_data.get("fee", total_input - total_output)
                timestamp = datetime.fromtimestamp(block_time, tz=timezone.utc) if block_time else None

                transactions.append(NormalizedTransaction(
                    tx_hash=txid,
                    chain="bitcoin",
                    block_number=block_height,
                    block_hash=block_hash,
                    block_timestamp=timestamp,
                    status="confirmed" if confirmed else "pending",
                    from_address=from_addr,
                    to_address=to_addr,
                    amount=total_output / 1e8,
                    asset="BTC",
                    fee=fee_sat / 1e8,
                    inputs=inputs,
                    outputs=outputs,
                    raw_data=tx_data,
                    provider="mempool.space",
                    retrieved_at=datetime.now(timezone.utc),
                ))

        return transactions

    async def get_address_info(self, address: str) -> Optional[AddressInfo]:
        """Get Bitcoin address info."""
        data = await self._request(f"/address/{address}")
        if not data:
            return None

        chain_stats = data.get("chain_stats", {})
        mempool_stats = data.get("mempool_stats", {})

        funded = chain_stats.get("funded_txo_sum", 0) / 1e8
        spent = chain_stats.get("spent_txo_sum", 0) / 1e8
        balance = funded - spent

        tx_count = chain_stats.get("tx_count", 0) + mempool_stats.get("tx_count", 0)

        return AddressInfo(
            address=address,
            chain="bitcoin",
            balance=balance,
            asset="BTC",
            tx_count=tx_count,
            is_contract=False,
            provider="mempool.space",
            retrieved_at=datetime.now(timezone.utc),
        )

    async def close(self):
        """Close HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
