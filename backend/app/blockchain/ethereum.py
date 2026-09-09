"""
CryptoTrace AI — Ethereum/EVM Blockchain Adapter
Real Ethereum & EVM data via JSON-RPC + Etherscan / Blockscout APIs.
Supports Ethereum, Sepolia, Polygon, BNB Chain, Arbitrum, Base, Optimism, Avalanche,
along with ERC-20/BEP-20 altcoins and stablecoins (USDT, USDC, DAI, etc.).
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
from app.blockchain.tokens import get_token_decimals, get_token_symbol, lookup_token_info
from app.core.config import settings

logger = logging.getLogger(__name__)

ETH_ADDRESS_REGEX = re.compile(r'^0x[a-fA-F0-9]{40}$')
ETH_TX_REGEX = re.compile(r'^0x[a-fA-F0-9]{64}$')


class EthereumAdapter(BlockchainAdapter):
    """
    Ethereum and EVM adapter using JSON-RPC + Etherscan / Blockscout for token transfers.
    """

    def __init__(self, rpc_url: str = "", explorer_api_key: str = "",
                 chain: str = "ethereum", asset: str = "ETH",
                 explorer_url: str = "https://api.etherscan.io/api"):
        self._chain = chain.lower()
        self._asset = asset.upper()
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
            self._client = httpx.AsyncClient(
                timeout=30.0,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CryptoTrace/1.0"}
            )
        return self._client

    async def _rpc_call(self, method: str, params: list) -> Optional[dict]:
        """Make JSON-RPC call to EVM node with automatic endpoint fallbacks."""
        fallback_map = {
            "sepolia": [
                self.rpc_url,
                "https://ethereum-sepolia-rpc.publicnode.com",
                "https://1rpc.io/sepolia",
                "https://sepolia.drpc.org",
            ],
            "ethereum": [
                self.rpc_url,
                "https://1rpc.io/eth",
                "https://cloudflare-eth.com",
                "https://ethereum-rpc.publicnode.com",
            ],
            "polygon": [
                self.rpc_url,
                "https://1rpc.io/matic",
                "https://polygon-bor-rpc.publicnode.com",
                "https://polygon-rpc.com",
            ],
            "bnb": [
                self.rpc_url,
                "https://bsc-dataseed.binance.org",
                "https://1rpc.io/bnb",
                "https://bsc-rpc.publicnode.com",
            ],
            "arbitrum": [
                self.rpc_url,
                "https://arb1.arbitrum.io/rpc",
                "https://1rpc.io/arb",
            ],
            "base": [
                self.rpc_url,
                "https://mainnet.base.org",
                "https://1rpc.io/base",
            ],
            "optimism": [
                self.rpc_url,
                "https://mainnet.optimism.io",
                "https://1rpc.io/op",
            ],
            "avalanche": [
                self.rpc_url,
                "https://api.avax.network/ext/bc/C/rpc",
                "https://1rpc.io/avax/c",
            ],
        }

        urls = [u for u in fallback_map.get(self._chain, [self.rpc_url]) if u]
        if self.rpc_url and self.rpc_url not in urls:
            urls.insert(0, self.rpc_url)

        async with self._rate_limiter:
            client = await self._get_client()
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": method,
                "params": params,
            }
            for url in urls:
                try:
                    response = await client.post(url, json=payload, timeout=8.0)
                    if response.status_code == 200:
                        data = response.json()
                        if "error" in data:
                            continue
                        if data.get("result") is not None:
                            return data.get("result")
                except Exception as e:
                    logger.debug(f"RPC fallback error on {url}: {e}")
            return None

    async def _etherscan_call(self, params: dict) -> Optional[dict]:
        """Make Explorer API call (Etherscan V2 if API key is set, or Blockscout public open API)."""
        async with self._rate_limiter:
            client = await self._get_client()
            req_params = dict(params)

            chain_id_map = {
                "ethereum": 1,
                "sepolia": 11155111,
                "polygon": 137,
                "bnb": 56,
                "arbitrum": 42161,
                "optimism": 10,
                "base": 8453,
                "avalanche": 43114,
            }

            urls_to_try = []
            if self.explorer_api_key:
                urls_to_try.append(("https://api.etherscan.io/v2/api", True))

            # Blockscout public open API fallbacks (zero-key required)
            blockscout_map = {
                "ethereum": "https://eth.blockscout.com/api",
                "sepolia": "https://eth-sepolia.blockscout.com/api",
                "polygon": "https://polygon.blockscout.com/api",
                "bnb": "https://bscscan.com/api",
                "arbitrum": "https://arbitrum.blockscout.com/api",
                "base": "https://base.blockscout.com/api",
                "optimism": "https://optimism.blockscout.com/api",
            }
            if self._chain in blockscout_map:
                urls_to_try.append((blockscout_map[self._chain], False))

            for url, use_v2 in urls_to_try:
                curr_params = dict(req_params)
                if use_v2 and self.explorer_api_key:
                    curr_params["apikey"] = self.explorer_api_key
                    curr_params["chainid"] = chain_id_map.get(self._chain, 1)

                try:
                    response = await client.get(url, params=curr_params, timeout=12.0)
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("status") == "1" or data.get("message") == "OK" or isinstance(data.get("result"), (list, dict)):
                            return data.get("result")
                        elif data.get("message") == "No transactions found":
                            return []
                except Exception as e:
                    logger.debug(f"Explorer API error ({url}): {e}")

            return None

    async def validate_address(self, address: str) -> bool:
        return bool(ETH_ADDRESS_REGEX.match(address.strip()))

    async def validate_transaction(self, tx_hash: str) -> bool:
        return bool(ETH_TX_REGEX.match(tx_hash.strip()))

    async def get_transaction(self, tx_hash: str) -> Optional[NormalizedTransaction]:
        """Fetch real EVM transaction via RPC with Etherscan proxy fallback."""
        tx_hash = tx_hash.strip()

        # Get transaction via RPC first, then Etherscan proxy
        tx_data = await self._rpc_call("eth_getTransactionByHash", [tx_hash])
        if not tx_data:
            tx_data = await self._etherscan_call({"module": "proxy", "action": "eth_getTransactionByHash", "txhash": tx_hash})
        if not tx_data or not isinstance(tx_data, dict):
            return None

        # Get receipt for status and gas used
        receipt = await self._rpc_call("eth_getTransactionReceipt", [tx_hash])
        if not receipt:
            receipt = await self._etherscan_call({"module": "proxy", "action": "eth_getTransactionReceipt", "txhash": tx_hash})

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

        # Determine primary amount and asset
        primary_amount = value_eth
        primary_asset = self._asset
        primary_from = from_addr.lower() if from_addr else ""
        primary_to = to_addr.lower() if to_addr else ""

        # If native transfer value is 0 and ERC-20 token transfer exists, use token details as primary
        if primary_amount == 0.0 and token_transfers:
            first_tt = token_transfers[0]
            primary_amount = first_tt.value
            primary_asset = first_tt.token_symbol
            primary_from = first_tt.from_address
            primary_to = first_tt.to_address

        return NormalizedTransaction(
            tx_hash=tx_hash,
            chain=self._chain,
            block_number=block_number,
            block_hash=block_hash,
            block_timestamp=timestamp,
            status=tx_status,
            from_address=primary_from,
            to_address=primary_to,
            amount=primary_amount,
            asset=primary_asset,
            fee=fee_eth,
            gas_used=gas_used,
            gas_price=gas_price_wei / 1e9,  # in Gwei
            is_contract_interaction=is_contract or bool(tx_data.get("input", "0x") != "0x") or bool(token_transfers),
            contract_address=contract_addr or (to_addr if token_transfers else ""),
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
        """Parse ERC-20 Transfer events from transaction receipt logs with accurate decimals."""
        TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
        transfers = []

        for log in logs:
            topics = log.get("topics", [])
            if len(topics) >= 3 and topics[0].lower() == TRANSFER_TOPIC.lower():
                try:
                    from_addr = "0x" + topics[1][-40:]
                    to_addr = "0x" + topics[2][-40:]
                    contract_addr = log.get("address", "")
                    
                    # Decimal and Symbol Resolution from registry
                    decimals = get_token_decimals(self._chain, contract_addr, default=18)
                    symbol = get_token_symbol(self._chain, contract_addr, default="ERC20")
                    token_info = lookup_token_info(self._chain, contract_addr)
                    token_name = token_info.name if token_info else symbol

                    value_hex = log.get("data", "0x0")
                    value_raw = int(value_hex, 16) if value_hex != "0x" else 0
                    value = value_raw / (10 ** decimals)

                    transfers.append(TokenTransfer(
                        token_address=contract_addr.lower(),
                        token_name=token_name,
                        token_symbol=symbol,
                        token_decimals=decimals,
                        from_address=from_addr.lower(),
                        to_address=to_addr.lower(),
                        value=value,
                        log_index=int(log.get("logIndex", "0x0"), 16),
                    ))
                except (ValueError, IndexError) as e:
                    logger.debug(f"Error parsing log topic: {e}")
                    continue

        return transfers

    async def _alchemy_get_transfers(self, address: str, limit: int = 50) -> List[NormalizedTransaction]:
        """Fetch real-time asset transfers via Alchemy Asset Transfers API."""
        alchemy_key = settings.ALCHEMY_API_KEY
        if not alchemy_key:
            return []

        alchemy_chain_map = {
            "ethereum": f"https://eth-mainnet.g.alchemy.com/v2/{alchemy_key}",
            "sepolia": f"https://eth-sepolia.g.alchemy.com/v2/{alchemy_key}",
            "polygon": f"https://polygon-mainnet.g.alchemy.com/v2/{alchemy_key}",
            "arbitrum": f"https://arb-mainnet.g.alchemy.com/v2/{alchemy_key}",
            "base": f"https://base-mainnet.g.alchemy.com/v2/{alchemy_key}",
            "optimism": f"https://opt-mainnet.g.alchemy.com/v2/{alchemy_key}",
        }
        url = alchemy_chain_map.get(self._chain)
        if not url:
            return []

        txs = []
        try:
            client = await self._get_client()
            for direction_field in ["fromAddress", "toAddress"]:
                payload = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "alchemy_getAssetTransfers",
                    "params": [{
                        "fromBlock": "0x0",
                        "toBlock": "latest",
                        "category": ["external", "erc20"],
                        "maxCount": hex(min(limit, 25)),
                        "order": "desc",
                        direction_field: address,
                    }]
                }
                res = await client.post(url, json=payload, timeout=8.0)
                if res.status_code == 200:
                    data = res.json()
                    transfers = data.get("result", {}).get("transfers", [])
                    for t in transfers:
                        tx_hash = t.get("hash", "")
                        if not tx_hash:
                            continue
                        block_hex = t.get("blockNum", "0x0")
                        block_num = int(block_hex, 16) if block_hex.startswith("0x") else 0
                        val = float(t.get("value") or 0.0)
                        sym = t.get("asset") or self._asset
                        from_a = (t.get("from") or "").lower()
                        to_a = (t.get("to") or "").lower()
                        cat = t.get("category", "")
                        contract_addr = (t.get("rawContract", {}).get("address") or "").lower()

                        token_transfers = []
                        if cat == "erc20":
                            token_transfers.append(TokenTransfer(
                                token_address=contract_addr,
                                token_name=sym,
                                token_symbol=sym,
                                from_address=from_a,
                                to_address=to_a,
                                value=val,
                            ))

                        txs.append(NormalizedTransaction(
                            tx_hash=tx_hash,
                            chain=self._chain,
                            block_number=block_num,
                            status="confirmed",
                            from_address=from_a,
                            to_address=to_a,
                            amount=val,
                            asset=sym,
                            is_contract_interaction=cat == "erc20",
                            contract_address=contract_addr,
                            token_transfers=token_transfers,
                            raw_data=t,
                            provider="alchemy_asset_transfers",
                            retrieved_at=datetime.now(timezone.utc),
                        ))
        except Exception as e:
            logger.debug(f"Alchemy asset transfers error on {self._chain}: {e}")

        return txs

    async def get_transactions_for_address(
        self, address: str, limit: int = 50
    ) -> List[NormalizedTransaction]:
        """Fetch transactions and ERC-20 token transfers for an address via Alchemy / Etherscan / Blockscout."""
        address = address.strip()

        # Try high-speed Alchemy Asset Transfers API first
        alchemy_txs = await self._alchemy_get_transfers(address, limit=limit)
        if alchemy_txs:
            return alchemy_txs[:limit]

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

        transactions: List[NormalizedTransaction] = []
        seen_hashes = set()

        if result and isinstance(result, list):
            for tx in result[:limit]:
                try:
                    thash = tx.get("hash", "")
                    if thash:
                        seen_hashes.add(thash)

                    block_time = int(tx.get("timeStamp", "0"))
                    timestamp = datetime.fromtimestamp(block_time, tz=timezone.utc) if block_time else None
                    value_eth = int(tx.get("value", "0")) / 1e18
                    gas_used = int(tx.get("gasUsed", "0"))
                    gas_price = int(tx.get("gasPrice", "0"))
                    fee = (gas_used * gas_price) / 1e18

                    transactions.append(NormalizedTransaction(
                        tx_hash=thash,
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
                    logger.debug(f"Error parsing Explorer tx: {e}")
                    continue

        # Also fetch ERC-20 Token Transfers (USDT, USDC, DAI, Altcoins)
        try:
            token_txs = await self._etherscan_call({
                "module": "account",
                "action": "tokentx",
                "address": address,
                "page": 1,
                "offset": limit,
                "sort": "desc",
            })
            if token_txs and isinstance(token_txs, list):
                for ttx in token_txs[:limit]:
                    try:
                        thash = ttx.get("hash", "")
                        contract_addr = ttx.get("contractAddress", "").lower()
                        decimals = int(ttx.get("tokenDecimal") or get_token_decimals(self._chain, contract_addr, default=18))
                        val = int(ttx.get("value", "0")) / (10 ** decimals)
                        sym = ttx.get("tokenSymbol") or get_token_symbol(self._chain, contract_addr, default="ERC20")
                        name = ttx.get("tokenName") or sym
                        btime = int(ttx.get("timeStamp", "0"))
                        ttime = datetime.fromtimestamp(btime, tz=timezone.utc) if btime else None
                        from_a = ttx.get("from", "").lower()
                        to_a = ttx.get("to", "").lower()

                        if thash in seen_hashes:
                            for tx in transactions:
                                if tx.tx_hash == thash:
                                    tx.token_transfers.append(TokenTransfer(
                                        token_address=contract_addr,
                                        token_name=name,
                                        token_symbol=sym,
                                        token_decimals=decimals,
                                        from_address=from_a,
                                        to_address=to_a,
                                        value=val,
                                    ))
                                    if tx.amount == 0.0:
                                        tx.amount = val
                                        tx.asset = sym
                        else:
                            seen_hashes.add(thash)
                            transactions.append(NormalizedTransaction(
                                tx_hash=thash,
                                chain=self._chain,
                                block_number=int(ttx.get("blockNumber", "0")),
                                block_timestamp=ttime,
                                status="confirmed",
                                from_address=from_a,
                                to_address=to_a,
                                amount=val,
                                asset=sym,
                                is_contract_interaction=True,
                                token_transfers=[TokenTransfer(
                                    token_address=contract_addr,
                                    token_name=name,
                                    token_symbol=sym,
                                    token_decimals=decimals,
                                    from_address=from_a,
                                    to_address=to_a,
                                    value=val,
                                )],
                                raw_data=ttx,
                                provider="etherscan_tokentx",
                                retrieved_at=datetime.now(timezone.utc),
                            ))
                    except Exception as e:
                        logger.debug(f"Error parsing tokentx item: {e}")
                        continue
        except Exception as e:
            logger.debug(f"Error fetching token transfers for {address}: {e}")

        transactions.sort(key=lambda t: t.block_timestamp or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
        return transactions[:limit]

    async def get_token_transfers(
        self, address: str, limit: int = 50
    ) -> List[TokenTransfer]:
        """Get ERC-20 token transfers from Etherscan / Blockscout."""
        result = await self._etherscan_call({
            "module": "account",
            "action": "tokentx",
            "address": address.strip(),
            "page": 1,
            "offset": limit,
            "sort": "desc",
        })

        if not result or not isinstance(result, list):
            return []

        transfers = []
        for tx in result[:limit]:
            try:
                contract_addr = tx.get("contractAddress", "").lower()
                decimals = int(tx.get("tokenDecimal") or get_token_decimals(self._chain, contract_addr, default=18))
                value = int(tx.get("value", "0")) / (10 ** decimals)
                sym = tx.get("tokenSymbol") or get_token_symbol(self._chain, contract_addr, default="ERC20")
                transfers.append(TokenTransfer(
                    token_address=contract_addr,
                    token_name=tx.get("tokenName", sym),
                    token_symbol=sym,
                    token_decimals=decimals,
                    from_address=tx.get("from", "").lower(),
                    to_address=tx.get("to", "").lower(),
                    value=value,
                ))
            except (ValueError, KeyError):
                continue

        return transfers

    async def get_address_info(self, address: str) -> Optional[AddressInfo]:
        """Get EVM address balance via RPC."""
        address = address.strip()
        balance_hex = await self._rpc_call("eth_getBalance", [address, "latest"])
        if balance_hex is None:
            return None

        balance_wei = int(balance_hex, 16)
        balance_eth = balance_wei / 1e18

        code = await self._rpc_call("eth_getCode", [address, "latest"])
        is_contract = code is not None and code != "0x"

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
