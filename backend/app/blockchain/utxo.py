"""
CryptoTrace AI — Generic UTXO Blockchain Adapter (Litecoin & Dogecoin)
Real UTXO data via Blockchair & dedicated explorers (Litecoinspace, Dogechain).
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

# Address regexes
LTC_REGEX = re.compile(r'^(L|M|3|ltc1)[a-km-zA-HJ-NP-Z1-9]{25,62}$')
DOGE_REGEX = re.compile(r'^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$')
UTXO_TX_REGEX = re.compile(r'^[a-fA-F0-9]{64}$')


class UTXOAdapter(BlockchainAdapter):
    """
    Adapter for UTXO-based altcoins (Litecoin, Dogecoin).
    """

    def __init__(self, chain: str = "litecoin", asset: str = "LTC"):
        self._chain = chain.lower()
        self._asset = asset.upper()
        self._client = None
        self._rate_limiter = asyncio.Semaphore(settings.BLOCKCHAIN_MAX_REQUESTS_PER_SECOND)

    @property
    def chain_name(self) -> str:
        return self._chain

    @property
    def native_asset(self) -> str:
        return self._asset

    @property
    def is_configured(self) -> bool:
        return True

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=25.0,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CryptoTrace/1.0"}
            )
        return self._client

    async def validate_address(self, address: str) -> bool:
        """Validate address format."""
        addr = address.strip()
        if self._chain in ["litecoin", "ltc"]:
            return bool(LTC_REGEX.match(addr))
        elif self._chain in ["dogecoin", "doge"]:
            return bool(DOGE_REGEX.match(addr))
        return False

    async def validate_transaction(self, tx_hash: str) -> bool:
        """Validate transaction hash."""
        return bool(UTXO_TX_REGEX.match(tx_hash.strip()))

    async def get_transaction(self, tx_hash: str) -> Optional[NormalizedTransaction]:
        """Fetch UTXO transaction via Blockchair or Litecoinspace."""
        tx_hash = tx_hash.strip()
        async with self._rate_limiter:
            client = await self._get_client()

            # For Litecoin: try litecoinspace.org (mempool instance) first
            if self._chain in ["litecoin", "ltc"]:
                try:
                    res = await client.get(f"https://litecoinspace.org/api/tx/{tx_hash}", timeout=10.0)
                    if res.status_code == 200:
                        data = res.json()
                        return self._parse_mempool_style_tx(data)
                except Exception as e:
                    logger.debug(f"Litecoinspace error: {e}")

            # Fallback to Blockchair API
            try:
                bc_chain = "litecoin" if self._chain in ["litecoin", "ltc"] else "dogecoin"
                res = await client.get(f"https://api.blockchair.com/{bc_chain}/dashboards/transaction/{tx_hash}", timeout=10.0)
                if res.status_code == 200:
                    data = res.json()
                    tx_data = data.get("data", {}).get(tx_hash, {})
                    if tx_data and tx_data.get("transaction"):
                        return self._parse_blockchair_tx(tx_data)
            except Exception as e:
                logger.debug(f"Blockchair tx error: {e}")

        return None

    def _parse_mempool_style_tx(self, data: dict) -> NormalizedTransaction:
        """Parse mempool.space-style JSON into NormalizedTransaction."""
        txid = data.get("txid", "")
        status_data = data.get("status", {})
        confirmed = status_data.get("confirmed", False)
        block_height = status_data.get("block_height", 0)
        block_time = status_data.get("block_time", 0)
        timestamp = datetime.fromtimestamp(block_time, tz=timezone.utc) if block_time else None

        inputs = []
        total_input = 0
        input_addresses = []
        for vin in data.get("vin", []):
            prevout = vin.get("prevout", {})
            addr = prevout.get("scriptpubkey_address", "")
            val_sat = prevout.get("value", 0)
            val = val_sat / 1e8
            total_input += val_sat
            if addr:
                input_addresses.append(addr)
            inputs.append(TxInput(
                address=addr,
                value=val,
                prev_tx_hash=vin.get("txid", ""),
                prev_output_index=vin.get("vout", 0),
            ))

        outputs = []
        total_output = 0
        output_addresses = []
        for idx, vout in enumerate(data.get("vout", [])):
            addr = vout.get("scriptpubkey_address", "")
            val_sat = vout.get("value", 0)
            val = val_sat / 1e8
            total_output += val_sat
            if addr:
                output_addresses.append(addr)
            outputs.append(TxOutput(
                address=addr,
                value=val,
                output_index=idx,
            ))

        from_addr = input_addresses[0] if input_addresses else ""
        to_addr = ""
        for a in output_addresses:
            if a != from_addr:
                to_addr = a
                break
        if not to_addr and output_addresses:
            to_addr = output_addresses[0]

        fee_sat = data.get("fee", max(0, total_input - total_output))
        fee = fee_sat / 1e8

        return NormalizedTransaction(
            tx_hash=txid,
            chain=self._chain,
            block_number=block_height,
            block_timestamp=timestamp,
            status="confirmed" if confirmed else "pending",
            from_address=from_addr,
            to_address=to_addr,
            amount=total_output / 1e8,
            asset=self._asset,
            fee=fee,
            inputs=inputs,
            outputs=outputs,
            raw_data=data,
            provider="mempool",
            retrieved_at=datetime.now(timezone.utc),
        )

    def _parse_blockchair_tx(self, data: dict) -> NormalizedTransaction:
        """Parse Blockchair transaction structure."""
        tx_info = data.get("transaction", {})
        tx_hash = tx_info.get("hash", "")
        block_id = tx_info.get("block_id", 0)
        time_str = tx_info.get("time", "")
        timestamp = None
        if time_str:
            try:
                timestamp = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
            except Exception:
                pass

        inputs_raw = data.get("inputs", [])
        outputs_raw = data.get("outputs", [])

        inputs = []
        input_addresses = []
        for vin in inputs_raw:
            addr = vin.get("recipient", "")
            val = float(vin.get("value", 0)) / 1e8
            if addr:
                input_addresses.append(addr)
            inputs.append(TxInput(
                address=addr,
                value=val,
                prev_tx_hash=vin.get("spending_transaction_hash", ""),
            ))

        outputs = []
        output_addresses = []
        total_out = 0.0
        for idx, vout in enumerate(outputs_raw):
            addr = vout.get("recipient", "")
            val = float(vout.get("value", 0)) / 1e8
            total_out += val
            if addr:
                output_addresses.append(addr)
            outputs.append(TxOutput(
                address=addr,
                value=val,
                output_index=idx,
            ))

        from_addr = input_addresses[0] if input_addresses else ""
        to_addr = ""
        for a in output_addresses:
            if a != from_addr:
                to_addr = a
                break
        if not to_addr and output_addresses:
            to_addr = output_addresses[0]

        fee = float(tx_info.get("fee", 0)) / 1e8

        return NormalizedTransaction(
            tx_hash=tx_hash,
            chain=self._chain,
            block_number=block_id,
            block_timestamp=timestamp,
            status="confirmed",
            from_address=from_addr,
            to_address=to_addr,
            amount=total_out,
            asset=self._asset,
            fee=fee,
            inputs=inputs,
            outputs=outputs,
            raw_data=data,
            provider="blockchair",
            retrieved_at=datetime.now(timezone.utc),
        )

    async def get_transactions_for_address(
        self, address: str, limit: int = 50
    ) -> List[NormalizedTransaction]:
        """Fetch transactions for a UTXO address."""
        address = address.strip()
        async with self._rate_limiter:
            client = await self._get_client()

            # Litecoinspace for Litecoin
            if self._chain in ["litecoin", "ltc"]:
                try:
                    res = await client.get(f"https://litecoinspace.org/api/address/{address}/txs", timeout=12.0)
                    if res.status_code == 200:
                        items = res.json()
                        if isinstance(items, list):
                            return [self._parse_mempool_style_tx(t) for t in items[:limit]]
                except Exception as e:
                    logger.debug(f"Litecoinspace address txs error: {e}")

            # Blockchair fallback
            try:
                bc_chain = "litecoin" if self._chain in ["litecoin", "ltc"] else "dogecoin"
                res = await client.get(f"https://api.blockchair.com/{bc_chain}/dashboards/address/{address}?transaction_details=true", timeout=12.0)
                if res.status_code == 200:
                    data = res.json()
                    addr_data = data.get("data", {}).get(address, {})
                    tx_hashes = addr_data.get("transactions", [])
                    txs = []
                    for th in tx_hashes[:min(limit, 10)]:
                        tx_obj = await self.get_transaction(th)
                        if tx_obj:
                            txs.append(tx_obj)
                    return txs
            except Exception as e:
                logger.debug(f"Blockchair address error: {e}")

        return []

    async def get_address_info(self, address: str) -> Optional[AddressInfo]:
        """Get UTXO address balance and tx count."""
        address = address.strip()
        async with self._rate_limiter:
            client = await self._get_client()

            # Litecoinspace for LTC
            if self._chain in ["litecoin", "ltc"]:
                try:
                    res = await client.get(f"https://litecoinspace.org/api/address/{address}", timeout=10.0)
                    if res.status_code == 200:
                        data = res.json()
                        cs = data.get("chain_stats", {})
                        balance = (cs.get("funded_txo_sum", 0) - cs.get("spent_txo_sum", 0)) / 1e8
                        return AddressInfo(
                            address=address,
                            chain=self._chain,
                            balance=balance,
                            asset=self._asset,
                            tx_count=cs.get("tx_count", 0),
                            provider="litecoinspace",
                            retrieved_at=datetime.now(timezone.utc),
                        )
                except Exception:
                    pass

            # Blockchair fallback
            try:
                bc_chain = "litecoin" if self._chain in ["litecoin", "ltc"] else "dogecoin"
                res = await client.get(f"https://api.blockchair.com/{bc_chain}/dashboards/address/{address}", timeout=10.0)
                if res.status_code == 200:
                    data = res.json()
                    addr_data = data.get("data", {}).get(address, {}).get("address", {})
                    balance = float(addr_data.get("balance", 0)) / 1e8
                    tx_count = int(addr_data.get("transaction_count", 0))
                    return AddressInfo(
                        address=address,
                        chain=self._chain,
                        balance=balance,
                        asset=self._asset,
                        tx_count=tx_count,
                        provider="blockchair",
                        retrieved_at=datetime.now(timezone.utc),
                    )
            except Exception:
                pass

        return None

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()
