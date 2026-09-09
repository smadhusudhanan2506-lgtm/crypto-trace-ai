"""
CryptoTrace AI — Tron Blockchain Adapter (TRX & TRC-20 Tokens)
Real Tron data via TronGrid & TronScan public APIs.
Provides full tracing for TRX and TRC-20 tokens (e.g. USDT on Tron).
"""
import re
import httpx
import asyncio
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from app.blockchain.base import (
    BlockchainAdapter, NormalizedTransaction, AddressInfo,
    TokenTransfer, ChainIdentification,
)
from app.blockchain.tokens import get_token_decimals, get_token_symbol, lookup_token_info
from app.core.config import settings

logger = logging.getLogger(__name__)

# Tron address regex pattern (starts with T, Base58check, 34 chars)
TRON_ADDRESS_REGEX = re.compile(r'^T[a-km-zA-HJ-NP-Z1-9]{33}$')
TRON_TX_REGEX = re.compile(r'^[a-fA-F0-9]{64}$')

# Well known USDT contract on Tron
TRON_USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"


class TronAdapter(BlockchainAdapter):
    """
    Tron adapter connecting to TronGrid and TronScan public endpoints.
    No API key strictly required for basic public usage; supports fast rate-limited fallback.
    """

    def __init__(self, api_key: str = ""):
        self.api_key = api_key
        self.trongrid_url = "https://api.trongrid.io"
        self.tronscan_url = "https://apilist.tronscanapi.com/api"
        self.fallback_tronscan_url = "https://apilist.tronscan.org/api"
        self._client = None
        self._rate_limiter = asyncio.Semaphore(settings.BLOCKCHAIN_MAX_REQUESTS_PER_SECOND)

    @property
    def chain_name(self) -> str:
        return "tron"

    @property
    def native_asset(self) -> str:
        return "TRX"

    @property
    def is_configured(self) -> bool:
        return True

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CryptoTrace/1.0",
                "Accept": "application/json",
            }
            if self.api_key:
                headers["TRON-PRO-API-KEY"] = self.api_key
            self._client = httpx.AsyncClient(timeout=25.0, headers=headers)
        return self._client

    async def validate_address(self, address: str) -> bool:
        """Validate Tron address."""
        return bool(TRON_ADDRESS_REGEX.match(address.strip()))

    async def validate_transaction(self, tx_hash: str) -> bool:
        """Validate Tron transaction hash."""
        return bool(TRON_TX_REGEX.match(tx_hash.strip()))

    async def _tronscan_get(self, endpoint: str, params: Optional[dict] = None) -> Optional[dict]:
        """Query TronScan API with fallback."""
        async with self._rate_limiter:
            client = await self._get_client()
            for base_url in [self.tronscan_url, self.fallback_tronscan_url]:
                url = f"{base_url}{endpoint}"
                try:
                    response = await client.get(url, params=params, timeout=12.0)
                    if response.status_code == 200:
                        return response.json()
                except Exception as e:
                    logger.debug(f"TronScan request failed on {url}: {e}")
            return None

    async def _trongrid_get(self, endpoint: str, params: Optional[dict] = None) -> Optional[dict]:
        """Query TronGrid API."""
        async with self._rate_limiter:
            client = await self._get_client()
            url = f"{self.trongrid_url}{endpoint}"
            try:
                response = await client.get(url, params=params, timeout=12.0)
                if response.status_code == 200:
                    return response.json()
            except Exception as e:
                logger.debug(f"TronGrid request failed on {url}: {e}")
            return None

    async def get_transaction(self, tx_hash: str) -> Optional[NormalizedTransaction]:
        """Fetch and normalize a Tron transaction."""
        tx_hash = tx_hash.strip()

        # Try TronScan transaction-info endpoint first (rich parsed data)
        data = await self._tronscan_get("/transaction-info", params={"hash": tx_hash})
        if data and data.get("hash"):
            return self._normalize_tronscan_tx(data)

        # Fallback to TronGrid API
        tg_data = await self._trongrid_get(f"/v1/transactions/{tx_hash}")
        if tg_data and tg_data.get("data"):
            tx_item = tg_data["data"][0] if isinstance(tg_data["data"], list) and tg_data["data"] else tg_data["data"]
            return self._normalize_trongrid_tx(tx_item)

        return None

    def _normalize_tronscan_tx(self, data: dict) -> NormalizedTransaction:
        """Parse TronScan transaction response into NormalizedTransaction."""
        tx_hash = data.get("hash", "")
        block_number = data.get("block", 0)
        timestamp_ms = data.get("timestamp", 0)
        timestamp = datetime.fromtimestamp(timestamp_ms / 1000.0, tz=timezone.utc) if timestamp_ms else None
        
        status = "confirmed" if data.get("confirmed", True) and data.get("contractRet") == "SUCCESS" else "failed"
        
        from_address = data.get("ownerAddress", "")
        to_address = data.get("toAddress", "")
        
        # Check fee (fee in Sun, 1 TRX = 1e6 Sun)
        fee_sun = data.get("cost", {}).get("fee", 0) or data.get("fee", 0)
        fee_trx = fee_sun / 1e6

        # Check transfers & TRC-20 tokens
        token_transfers: List[TokenTransfer] = []
        is_contract = bool(data.get("contractType") in [31, "TriggerSmartContract"] or data.get("trigger_info"))

        # TRC-20 transfers
        trc20_transfers = data.get("trc20TransferInfo", [])
        if trc20_transfers and isinstance(trc20_transfers, list):
            for t in trc20_transfers:
                sym = t.get("symbol", "USDT")
                decimals = int(t.get("decimals", 6))
                raw_amt = float(t.get("amount_str", 0) or t.get("amount", 0))
                val = raw_amt / (10 ** decimals) if decimals > 0 else raw_amt
                from_a = t.get("from_address", from_address)
                to_a = t.get("to_address", to_address)
                contract_addr = t.get("contract_address", TRON_USDT_CONTRACT)

                token_transfers.append(TokenTransfer(
                    token_address=contract_addr,
                    token_name=t.get("name", sym),
                    token_symbol=sym,
                    token_decimals=decimals,
                    from_address=from_a,
                    to_address=to_a,
                    value=val,
                ))

        # Main amount
        if token_transfers:
            # If transaction is a TRC20 transfer, set primary amount to token transfer
            first_tt = token_transfers[0]
            amount = first_tt.value
            asset = first_tt.token_symbol
            from_address = first_tt.from_address
            to_address = first_tt.to_address
        else:
            # Native TRX transfer
            raw_amount = float(data.get("amount", 0) or data.get("contractData", {}).get("amount", 0))
            amount = raw_amount / 1e6 if raw_amount > 0 else 0.0
            asset = "TRX"

        return NormalizedTransaction(
            tx_hash=tx_hash,
            chain="tron",
            block_number=block_number,
            block_timestamp=timestamp,
            status=status,
            from_address=from_address,
            to_address=to_address,
            amount=amount,
            asset=asset,
            fee=fee_trx,
            is_contract_interaction=is_contract,
            token_transfers=token_transfers,
            raw_data=data,
            provider="tronscan",
            provider_url=f"https://tronscan.org/#/transaction/{tx_hash}",
            retrieved_at=datetime.now(timezone.utc),
        )

    def _normalize_trongrid_tx(self, data: dict) -> NormalizedTransaction:
        """Parse TronGrid raw transaction into NormalizedTransaction."""
        tx_hash = data.get("txID", "")
        raw_data = data.get("raw_data", {})
        contracts = raw_data.get("contract", [])
        
        timestamp_ms = raw_data.get("timestamp", 0)
        timestamp = datetime.fromtimestamp(timestamp_ms / 1000.0, tz=timezone.utc) if timestamp_ms else None

        from_addr = ""
        to_addr = ""
        amount = 0.0
        asset = "TRX"
        token_transfers = []
        is_contract = False

        if contracts:
            c = contracts[0]
            c_type = c.get("type", "")
            param = c.get("parameter", {}).get("value", {})
            from_addr = param.get("owner_address", "")
            
            if c_type == "TransferContract":
                to_addr = param.get("to_address", "")
                amount = float(param.get("amount", 0)) / 1e6
                asset = "TRX"
            elif c_type == "TriggerSmartContract":
                is_contract = True
                contract_address = param.get("contract_address", "")
                to_addr = contract_address
                data_hex = param.get("data", "")
                
                # Check for standard TRC-20 transfer: a9059cbb (transfer)
                if data_hex.startswith("a9059cbb") and len(data_hex) >= 72:
                    try:
                        recipient_hex = data_hex[32:72]
                        val_hex = data_hex[72:136]
                        val_raw = int(val_hex, 16) if val_hex else 0
                        decimals = get_token_decimals("tron", contract_address, default=6)
                        amount = val_raw / (10 ** decimals)
                        asset = get_token_symbol("tron", contract_address, default="USDT")
                        token_transfers.append(TokenTransfer(
                            token_address=contract_address,
                            token_name=asset,
                            token_symbol=asset,
                            token_decimals=decimals,
                            from_address=from_addr,
                            to_address=to_addr,
                            value=amount,
                        ))
                    except Exception:
                        pass

        return NormalizedTransaction(
            tx_hash=tx_hash,
            chain="tron",
            block_number=0,
            block_timestamp=timestamp,
            status="confirmed",
            from_address=from_addr,
            to_address=to_addr,
            amount=amount,
            asset=asset,
            fee=0.0,
            is_contract_interaction=is_contract,
            token_transfers=token_transfers,
            raw_data=data,
            provider="trongrid",
            provider_url=f"https://tronscan.org/#/transaction/{tx_hash}",
            retrieved_at=datetime.now(timezone.utc),
        )

    async def get_transactions_for_address(
        self, address: str, limit: int = 50
    ) -> List[NormalizedTransaction]:
        """Fetch TRX transactions and TRC-20 token transfers for a Tron address."""
        address = address.strip()
        transactions: List[NormalizedTransaction] = []
        seen_hashes = set()

        # 1. Fetch TRC-20 token transfers (especially USDT)
        trc20_res = await self._tronscan_get(
            "/new/transfer",
            params={
                "address": address,
                "trc20Id": TRON_USDT_CONTRACT,
                "limit": limit,
                "start": 0,
            }
        )

        if trc20_res and isinstance(trc20_res.get("data"), list):
            for t in trc20_res["data"][:limit]:
                thash = t.get("transactionHash", "") or t.get("hash", "")
                if not thash or thash in seen_hashes:
                    continue
                seen_hashes.add(thash)

                decimals = int(t.get("decimals", 6))
                raw_amt = float(t.get("amount", 0) or t.get("quant", 0))
                val = raw_amt / (10 ** decimals) if decimals > 0 else raw_amt
                sym = t.get("symbol", "USDT")
                ts_ms = int(t.get("timestamp", 0) or t.get("block_timestamp", 0))
                timestamp = datetime.fromtimestamp(ts_ms / 1000.0, tz=timezone.utc) if ts_ms else None

                from_a = t.get("transferFromAddress", "") or t.get("from_address", "")
                to_a = t.get("transferToAddress", "") or t.get("to_address", "")

                transactions.append(NormalizedTransaction(
                    tx_hash=thash,
                    chain="tron",
                    block_number=int(t.get("block", 0)),
                    block_timestamp=timestamp,
                    status="confirmed" if t.get("confirmed", True) else "pending",
                    from_address=from_a,
                    to_address=to_a,
                    amount=val,
                    asset=sym,
                    fee=0.0,
                    is_contract_interaction=True,
                    token_transfers=[TokenTransfer(
                        token_address=t.get("contract_address", TRON_USDT_CONTRACT),
                        token_name=sym,
                        token_symbol=sym,
                        token_decimals=decimals,
                        from_address=from_a,
                        to_address=to_a,
                        value=val,
                    )],
                    raw_data=t,
                    provider="tronscan_trc20",
                    provider_url=f"https://tronscan.org/#/transaction/{thash}",
                    retrieved_at=datetime.now(timezone.utc),
                ))

        # 2. Fetch Native TRX transfers
        native_res = await self._tronscan_get(
            "/transaction",
            params={
                "address": address,
                "limit": limit,
                "start": 0,
            }
        )

        if native_res and isinstance(native_res.get("data"), list):
            for t in native_res["data"][:limit]:
                thash = t.get("hash", "")
                if not thash or thash in seen_hashes:
                    continue
                seen_hashes.add(thash)

                norm_tx = self._normalize_tronscan_tx(t)
                transactions.append(norm_tx)

        # Sort descending by timestamp
        transactions.sort(
            key=lambda t: t.block_timestamp or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True
        )
        return transactions[:limit]

    async def get_address_info(self, address: str) -> Optional[AddressInfo]:
        """Get Tron address balances (TRX + USDT) and activity."""
        address = address.strip()

        # 1. Try TronGrid API
        tg_data = await self._trongrid_get(f"/v1/accounts/{address}")
        if tg_data and isinstance(tg_data.get("data"), list) and len(tg_data["data"]) > 0:
            acc = tg_data["data"][0]
            balance_trx = float(acc.get("balance", 0)) / 1e6
            create_time_ms = acc.get("create_time", 0)
            first_seen = datetime.fromtimestamp(create_time_ms / 1000.0, tz=timezone.utc) if create_time_ms else None
            return AddressInfo(
                address=address,
                chain="tron",
                balance=balance_trx,
                asset="TRX",
                tx_count=len(acc.get("active_permission", [])),
                first_seen=first_seen,
                is_contract=False,
                provider="trongrid",
                retrieved_at=datetime.now(timezone.utc),
            )

        # 2. Try TronScan API
        data = await self._tronscan_get("/account/overview", params={"address": address})
        if not data or not (data.get("address") or data.get("balance")):
            data = await self._tronscan_get("/account", params={"address": address})

        if data and (data.get("address") or "balance" in data):
            balance_trx = float(data.get("balance", 0)) / 1e6
            tx_count = int(data.get("totalTransactionCount", 0) or data.get("transactions", 0))
            first_seen_ms = data.get("date_created", 0)
            first_seen = datetime.fromtimestamp(first_seen_ms / 1000.0, tz=timezone.utc) if first_seen_ms else None

            return AddressInfo(
                address=address,
                chain="tron",
                balance=balance_trx,
                asset="TRX",
                tx_count=tx_count,
                first_seen=first_seen,
                is_contract=bool(data.get("isContract", False)),
                provider="tronscan",
                retrieved_at=datetime.now(timezone.utc),
            )

        return AddressInfo(
            address=address,
            chain="tron",
            balance=0.0,
            asset="TRX",
            tx_count=0,
            provider="tron_network",
            retrieved_at=datetime.now(timezone.utc),
        )

    async def get_token_transfers(
        self, address: str, limit: int = 50
    ) -> List[TokenTransfer]:
        """Get TRC-20 token transfers for a Tron address."""
        res = await self._tronscan_get(
            "/new/transfer",
            params={
                "address": address.strip(),
                "limit": limit,
                "start": 0,
            }
        )
        transfers: List[TokenTransfer] = []
        if res and isinstance(res.get("data"), list):
            for t in res["data"][:limit]:
                decimals = int(t.get("decimals", 6))
                raw_amt = float(t.get("amount", 0) or t.get("quant", 0))
                val = raw_amt / (10 ** decimals) if decimals > 0 else raw_amt
                sym = t.get("symbol", "USDT")
                from_a = t.get("transferFromAddress", "") or t.get("from_address", "")
                to_a = t.get("transferToAddress", "") or t.get("to_address", "")
                transfers.append(TokenTransfer(
                    token_address=t.get("contract_address", TRON_USDT_CONTRACT),
                    token_name=sym,
                    token_symbol=sym,
                    token_decimals=decimals,
                    from_address=from_a,
                    to_address=to_a,
                    value=val,
                ))
        return transfers

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()
