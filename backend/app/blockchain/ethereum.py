"""
CryptoTrace AI — Ethereum/EVM Blockchain Adapter
Real Ethereum data via JSON-RPC + Etherscan API.
"""
import re
import httpx
import asyncio
import logging
from typing import Optional, List
from datetime import datetime, timezone
from app.blockchain.base import (
    BlockchainAdapter, NormalizedTransaction, AddressInfo,
    TokenTransfer, ChainIdentification,
)
from app.core.config import settings

logger = logging.getLogger(__name__)

ETH_ADDRESS_REGEX = re.compile(r'^0x[a-fA-F0-9]{40}$')
ETH_TX_REGEX = re.compile(r'^0x[a-fA-F0-9]{64}$')


class EthereumAdapter(BlockchainAdapter):
    """
    Ethereum adapter using JSON-RPC (public or configured) + Etherscan for token transfers.
    """

    def __init__(self, rpc_url: str = "", explorer_api_key: str = "",
                 chain: str = "ethereum", asset: str = "ETH",
                 explorer_url: str = "https://api.etherscan.io/api"):
        self._chain = chain
        self._asset = asset
        self.rpc_url = rpc_url or settings.ETH_RPC_URL
        self.explorer_api_key = explorer_api_key or settings.ETH_EXPLORER_API_KEY
        self.explorer_url = explorer_url
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
        return bool(self.rpc_url)

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def _rpc_call(self, method: str, params: list) -> Optional[dict]:
        """Make JSON-RPC call to Ethereum node."""
        async with self._rate_limiter:
            client = await self._get_client()
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": method,
                "params": params,
            }
            try:
                response = await client.post(self.rpc_url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    if "error" in data:
                        logger.warning(f"RPC error: {data['error']}")
                        return None
                    return data.get("result")
            except Exception as e:
                logger.error(f"Ethereum RPC error: {e}")
            return None

    async def _etherscan_call(self, params: dict) -> Optional[dict]:
        """Make Explorer API call (Etherscan V2 if API key is set, or Blockscout public open API)."""
        async with self._rate_limiter:
            client = await self._get_client()
            req_params = dict(params)

            # Map chain names to Chain IDs for Etherscan Multichain V2
            chain_id_map = {
                "ethereum": 1,
                "sepolia": 11155111,
                "polygon": 137,
                "bnb": 56,
                "arbitrum": 42161,
                "optimism": 10,
                "base": 8453,
            }

            if self.explorer_api_key:
                url = "https://api.etherscan.io/v2/api"
                req_params["apikey"] = self.explorer_api_key
                req_params["chainid"] = chain_id_map.get(self._chain, 1)
            else:
                # Open public explorer fallback (no key required)
                url = self.explorer_url
                if self._chain == "ethereum":
                    url = "https://eth.blockscout.com/api"
                elif self._chain == "sepolia":
                    url = "https://eth-sepolia.blockscout.com/api"
                elif self._chain == "polygon":
                    url = "https://polygon.blockscout.com/api"
                elif self._chain == "bnb":
                    url = "https://bscscan.com/api"

            try:
                response = await client.get(url, params=req_params)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "1" or data.get("message") == "OK" or isinstance(data.get("result"), (list, dict)):
                        return data.get("result")
                    elif data.get("message") == "No transactions found":
                        return []
            except Exception as e:
                logger.error(f"Explorer API error ({url}): {e}")
            return None

    async def validate_address(self, address: str) -> bool:
        return bool(ETH_ADDRESS_REGEX.match(address))

    async def validate_transaction(self, tx_hash: str) -> bool:
        return bool(ETH_TX_REGEX.match(tx_hash))

    async def get_transaction(self, tx_hash: str) -> Optional[NormalizedTransaction]:
        """Fetch real Ethereum transaction via RPC."""
        # Get transaction
        tx_data = await self._rpc_call("eth_getTransactionByHash", [tx_hash])
        if not tx_data:
            return None

        # Get receipt for status and gas used
        receipt = await self._rpc_call("eth_getTransactionReceipt", [tx_hash])

        # Get block for timestamp
        block_number_hex = tx_data.get("blockNumber", "0x0")
        block_number = int(block_number_hex, 16) if block_number_hex else 0

        timestamp = None
        block_hash = tx_data.get("blockHash", "")
        if block_hash and block_hash != "0x" + "0" * 64:
            block_data = await self._rpc_call("eth_getBlockByHash", [block_hash, False])
            if block_data:
                block_time_hex = block_data.get("timestamp", "0x0")
                block_time = int(block_time_hex, 16)
                timestamp = datetime.fromtimestamp(block_time, tz=timezone.utc)

        # Parse values
        value_hex = tx_data.get("value", "0x0")
        value_wei = int(value_hex, 16)
        value_eth = value_wei / 1e18

        gas_price_hex = tx_data.get("gasPrice", "0x0")
        gas_price_wei = int(gas_price_hex, 16)

        gas_used = 0
        tx_status = "confirmed"
        if receipt:
            gas_used_hex = receipt.get("gasUsed", "0x0")
            gas_used = int(gas_used_hex, 16)
            status_hex = receipt.get("status", "0x1")
            tx_status = "confirmed" if int(status_hex, 16) == 1 else "failed"

        fee_eth = (gas_used * gas_price_wei) / 1e18

        from_addr = tx_data.get("from", "")
        to_addr = tx_data.get("to", "") or ""

        is_contract = (to_addr == "" or to_addr is None)
        contract_addr = ""
        if receipt and is_contract:
            contract_addr = receipt.get("contractAddress", "") or ""
            to_addr = contract_addr

        # Parse token transfers from receipt logs
        token_transfers = []
        if receipt and receipt.get("logs"):
            token_transfers = self._parse_erc20_transfers(receipt["logs"])

        return NormalizedTransaction(
            tx_hash=tx_hash,
            chain=self._chain,
            block_number=block_number,
            block_hash=block_hash,
            block_timestamp=timestamp,
            status=tx_status,
            from_address=from_addr.lower() if from_addr else "",
            to_address=to_addr.lower() if to_addr else "",
            amount=value_eth,
            asset=self._asset,
            fee=fee_eth,
            gas_used=gas_used,
            gas_price=gas_price_wei / 1e9,  # in Gwei
            is_contract_interaction=is_contract or bool(tx_data.get("input", "0x") != "0x"),
            contract_address=contract_addr,
            token_transfers=token_transfers,
            raw_data={
                "transaction": tx_data,
                "receipt": receipt,
            },
            provider="ethereum_rpc",
            provider_url=self.rpc_url,
            retrieved_at=datetime.now(timezone.utc),
        )

    def _parse_erc20_transfers(self, logs: list) -> List[TokenTransfer]:
        """Parse ERC-20 Transfer events from transaction receipt logs."""
        # ERC-20 Transfer event topic
        TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
        transfers = []

        for log in logs:
            topics = log.get("topics", [])
            if len(topics) >= 3 and topics[0] == TRANSFER_TOPIC:
                try:
                    from_addr = "0x" + topics[1][-40:]
                    to_addr = "0x" + topics[2][-40:]
                    value_hex = log.get("data", "0x0")
                    value = int(value_hex, 16) / 1e18  # Assume 18 decimals

                    transfers.append(TokenTransfer(
                        token_address=log.get("address", ""),
                        from_address=from_addr.lower(),
                        to_address=to_addr.lower(),
                        value=value,
                        log_index=int(log.get("logIndex", "0x0"), 16),
                    ))
                except (ValueError, IndexError):
                    continue

        return transfers

    async def get_transactions_for_address(
        self, address: str, limit: int = 50
    ) -> List[NormalizedTransaction]:
        """Fetch transactions for an Ethereum address via Etherscan / Blockscout API."""
        result = await self._etherscan_call({
            "module": "account",
            "action": "txlist",
            "address": address,
            "startblock": 0,
            "endblock": 99999999,
            "page": 1,
            "offset": limit,
            "sort": "desc",
        })

        if not result or not isinstance(result, list):
            return []

        transactions = []
        for tx in result[:limit]:
            try:
                block_time = int(tx.get("timeStamp", "0"))
                timestamp = datetime.fromtimestamp(block_time, tz=timezone.utc)
                value_eth = int(tx.get("value", "0")) / 1e18
                gas_used = int(tx.get("gasUsed", "0"))
                gas_price = int(tx.get("gasPrice", "0"))
                fee = (gas_used * gas_price) / 1e18

                transactions.append(NormalizedTransaction(
                    tx_hash=tx.get("hash", ""),
                    chain=self._chain,
                    block_number=int(tx.get("blockNumber", "0")),
                    block_timestamp=timestamp,
                    status="confirmed" if tx.get("txreceipt_status") == "1" else "failed",
                    confirmations=int(tx.get("confirmations", "0")),
                    from_address=tx.get("from", "").lower(),
                    to_address=tx.get("to", "").lower(),
                    amount=value_eth,
                    asset=self._asset,
                    fee=fee,
                    gas_used=gas_used,
                    gas_price=gas_price / 1e9,
                    is_contract_interaction=bool(tx.get("input", "0x") != "0x"),
                    raw_data=tx,
                    provider="etherscan" if self.explorer_api_key else "blockscout",
                    retrieved_at=datetime.now(timezone.utc),
                ))
            except (ValueError, KeyError) as e:
                logger.warning(f"Error parsing Explorer tx: {e}")
                continue

        return transactions

    async def get_token_transfers(
        self, address: str, limit: int = 50
    ) -> List[TokenTransfer]:
        """Get ERC-20 token transfers from Etherscan / Blockscout."""
        result = await self._etherscan_call({
            "module": "account",
            "action": "tokentx",
            "address": address,
            "page": 1,
            "offset": limit,
            "sort": "desc",
        })

        if not result or not isinstance(result, list):
            return []

        transfers = []
        for tx in result[:limit]:
            try:
                decimals = int(tx.get("tokenDecimal", "18"))
                value = int(tx.get("value", "0")) / (10 ** decimals)
                transfers.append(TokenTransfer(
                    token_address=tx.get("contractAddress", ""),
                    token_name=tx.get("tokenName", ""),
                    token_symbol=tx.get("tokenSymbol", ""),
                    token_decimals=decimals,
                    from_address=tx.get("from", "").lower(),
                    to_address=tx.get("to", "").lower(),
                    value=value,
                ))
            except (ValueError, KeyError):
                continue

        return transfers

    async def get_address_info(self, address: str) -> Optional[AddressInfo]:
        """Get Ethereum address balance via RPC."""
        balance_hex = await self._rpc_call("eth_getBalance", [address, "latest"])
        if balance_hex is None:
            return None

        balance_wei = int(balance_hex, 16)
        balance_eth = balance_wei / 1e18

        # Check if contract
        code = await self._rpc_call("eth_getCode", [address, "latest"])
        is_contract = code is not None and code != "0x"

        # Get tx count
        nonce_hex = await self._rpc_call("eth_getTransactionCount", [address, "latest"])
        tx_count = int(nonce_hex, 16) if nonce_hex else 0

        return AddressInfo(
            address=address.lower(),
            chain=self._chain,
            balance=balance_eth,
            asset=self._asset,
            tx_count=tx_count,
            is_contract=is_contract,
            provider="ethereum_rpc",
            retrieved_at=datetime.now(timezone.utc),
        )

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()
