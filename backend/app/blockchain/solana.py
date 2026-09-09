"""
CryptoTrace AI — Solana Blockchain Adapter (SOL & SPL Tokens)
Real Solana data via high-speed Solana JSON-RPC endpoints.
Supports SOL native transfers and SPL tokens (USDC, USDT, Raydium, memecoins).
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

# Base58 regex patterns
SOLANA_ADDRESS_REGEX = re.compile(r'^[1-9A-HJ-NP-Za-km-z]{32,44}$')
SOLANA_TX_REGEX = re.compile(r'^[1-9A-HJ-NP-Za-km-z]{87,88}$')


class SolanaAdapter(BlockchainAdapter):
    """
    Solana adapter querying Solana JSON-RPC with automatic endpoint failover.
    Supports parsed transaction inspection and SPL token transfer extraction.
    """

    def __init__(self, rpc_url: str = ""):
        self.rpc_url = rpc_url
        self.rpc_endpoints = [
            rpc_url,
            "https://api.mainnet-beta.solana.com",
            "https://solana-rpc.publicnode.com",
            "https://rpc.ankr.com/solana",
        ]
        self.rpc_endpoints = [u for u in self.rpc_endpoints if u]
        self._client = None
        self._rate_limiter = asyncio.Semaphore(settings.BLOCKCHAIN_MAX_REQUESTS_PER_SECOND)

    @property
    def chain_name(self) -> str:
        return "solana"

    @property
    def native_asset(self) -> str:
        return "SOL"

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
        """Validate Solana address (Base58, 32-44 chars)."""
        return bool(SOLANA_ADDRESS_REGEX.match(address.strip()))

    async def validate_transaction(self, tx_hash: str) -> bool:
        """Validate Solana transaction signature (Base58, 87-88 chars)."""
        return bool(SOLANA_TX_REGEX.match(tx_hash.strip()))

    async def _rpc_call(self, method: str, params: list) -> Optional[Any]:
        """Make JSON-RPC call with endpoint fallbacks."""
        async with self._rate_limiter:
            client = await self._get_client()
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": method,
                "params": params,
            }
            for url in self.rpc_endpoints:
                try:
                    res = await client.post(url, json=payload, timeout=10.0)
                    if res.status_code == 200:
                        data = res.json()
                        if "error" in data:
                            continue
                        return data.get("result")
                except Exception as e:
                    logger.debug(f"Solana RPC fallback error on {url}: {e}")
            return None

    async def get_transaction(self, tx_hash: str) -> Optional[NormalizedTransaction]:
        """Fetch and normalize a parsed Solana transaction."""
        sig = tx_hash.strip()
        result = await self._rpc_call("getTransaction", [
            sig,
            {
                "encoding": "jsonParsed",
                "maxSupportedTransactionVersion": 0,
            }
        ])

        if not result or not isinstance(result, dict):
            return None

        slot = result.get("slot", 0)
        block_time = result.get("blockTime")
        timestamp = datetime.fromtimestamp(block_time, tz=timezone.utc) if block_time else None

        meta = result.get("meta", {})
        err = meta.get("err")
        status = "failed" if err else "confirmed"

        fee_lamports = meta.get("fee", 0)
        fee_sol = fee_lamports / 1e9

        tx = result.get("transaction", {})
        message = tx.get("message", {})
        account_keys = message.get("accountKeys", [])

        # Find primary signer / sender
        from_address = ""
        for acc in account_keys:
            if isinstance(acc, dict) and acc.get("signer"):
                from_address = acc.get("pubkey", "")
                break
            elif isinstance(acc, str) and not from_address:
                from_address = acc

        to_address = ""
        amount = 0.0
        asset = "SOL"
        token_transfers: List[TokenTransfer] = []

        # Parse instructions for SOL transfers and SPL Token transfers
        instructions = message.get("instructions", [])
        for ix in instructions:
            parsed = ix.get("parsed") if isinstance(ix, dict) else None
            program = ix.get("program") if isinstance(ix, dict) else ""
            
            if parsed and isinstance(parsed, dict):
                info = parsed.get("info", {})
                p_type = parsed.get("type", "")

                if program == "system" and p_type == "transfer":
                    # SOL transfer
                    lamports = float(info.get("lamports", 0))
                    amt_sol = lamports / 1e9
                    src = info.get("source", from_address)
                    dst = info.get("destination", "")
                    if amt_sol > amount:
                        amount = amt_sol
                        from_address = src
                        to_address = dst
                        asset = "SOL"

                elif program == "spl-token" and p_type in ["transfer", "transferChecked"]:
                    # SPL Token transfer
                    tok_amt_info = info.get("tokenAmount", {})
                    if tok_amt_info:
                        ui_amt = float(tok_amt_info.get("uiAmount", 0) or 0)
                        decimals = int(tok_amt_info.get("decimals", 6))
                    else:
                        ui_amt = float(info.get("amount", 0))
                        decimals = 6

                    mint = info.get("mint", "")
                    tok_sym = get_token_symbol("solana", mint, default="SPL")
                    src = info.get("source", from_address)
                    dst = info.get("destination", "")
                    authority = info.get("authority", from_address)

                    token_transfers.append(TokenTransfer(
                        token_address=mint,
                        token_name=tok_sym,
                        token_symbol=tok_sym,
                        token_decimals=decimals,
                        from_address=authority or src,
                        to_address=dst,
                        value=ui_amt,
                    ))

        # Check pre / post token balances if no parsed instruction caught it
        if not token_transfers:
            pre_tok = meta.get("preTokenBalances", [])
            post_tok = meta.get("postTokenBalances", [])
            if pre_tok and post_tok:
                # Compare deltas
                pass

        if token_transfers:
            first_tt = token_transfers[0]
            if amount == 0.0:
                amount = first_tt.value
                asset = first_tt.token_symbol
                from_address = first_tt.from_address
                to_address = first_tt.to_address

        return NormalizedTransaction(
            tx_hash=sig,
            chain="solana",
            block_number=slot,
            block_timestamp=timestamp,
            status=status,
            from_address=from_address,
            to_address=to_address,
            amount=amount,
            asset=asset,
            fee=fee_sol,
            is_contract_interaction=bool(token_transfers),
            token_transfers=token_transfers,
            raw_data=result,
            provider="solana_rpc",
            provider_url=f"https://solscan.io/tx/{sig}",
            retrieved_at=datetime.now(timezone.utc),
        )

    async def get_transactions_for_address(
        self, address: str, limit: int = 50
    ) -> List[NormalizedTransaction]:
        """Fetch transactions for a Solana address."""
        address = address.strip()
        sigs = await self._rpc_call("getSignaturesForAddress", [
            address,
            {"limit": min(limit, 20)}
        ])

        if not sigs or not isinstance(sigs, list):
            return []

        transactions: List[NormalizedTransaction] = []
        for s in sigs[:limit]:
            sig_hash = s.get("signature", "")
            if sig_hash:
                try:
                    norm_tx = await self.get_transaction(sig_hash)
                    if norm_tx:
                        transactions.append(norm_tx)
                except Exception as e:
                    logger.debug(f"Error parsing solana tx {sig_hash}: {e}")
                    continue

        return transactions

    async def get_address_info(self, address: str) -> Optional[AddressInfo]:
        """Get Solana address info: SOL balance and account existence."""
        address = address.strip()
        bal_res = await self._rpc_call("getBalance", [address])
        if bal_res is None:
            return None

        lamports = bal_res.get("value", 0) if isinstance(bal_res, dict) else bal_res
        sol_balance = float(lamports) / 1e9

        acc_res = await self._rpc_call("getAccountInfo", [address, {"encoding": "jsonParsed"}])
        is_program = False
        if acc_res and isinstance(acc_res, dict):
            val = acc_res.get("value")
            if val and val.get("executable"):
                is_program = True

        return AddressInfo(
            address=address,
            chain="solana",
            balance=sol_balance,
            asset="SOL",
            tx_count=0,
            is_contract=is_program,
            provider="solana_rpc",
            retrieved_at=datetime.now(timezone.utc),
        )

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()
