"""
CryptoTrace AI — Token Registry & Decimals Resolver
Accurate metadata, symbols, and decimals for Stablecoins & Altcoins across multiple blockchains.
Prevents precision errors in token fund flow tracing.
"""
from typing import Optional, Dict, Tuple
from pydantic import BaseModel


class TokenInfo(BaseModel):
    symbol: str
    name: str
    decimals: int
    chain: str
    contract_address: str
    is_stablecoin: bool = False
    coingecko_id: Optional[str] = None


# Registry of major stablecoins and altcoins across supported blockchains
# Key: (chain_name, contract_address_lowercase)
KNOWN_TOKENS: Dict[Tuple[str, str], TokenInfo] = {
    # =========================================================================
    # Ethereum Mainnet
    # =========================================================================
    ("ethereum", "0xdac17f958d2ee523a2206206994597c13d831ec7"): TokenInfo(
        symbol="USDT",
        name="Tether USD",
        decimals=6,
        chain="ethereum",
        contract_address="0xdac17f958d2ee523a2206206994597c13d831ec7",
        is_stablecoin=True,
        coingecko_id="tether",
    ),
    ("ethereum", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"): TokenInfo(
        symbol="USDC",
        name="USD Coin",
        decimals=6,
        chain="ethereum",
        contract_address="0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        is_stablecoin=True,
        coingecko_id="usd-coin",
    ),
    ("ethereum", "0x6b175474e89094c44da98b954eedeac495271d0f"): TokenInfo(
        symbol="DAI",
        name="Dai Stablecoin",
        decimals=18,
        chain="ethereum",
        contract_address="0x6b175474e89094c44da98b954eedeac495271d0f",
        is_stablecoin=True,
        coingecko_id="dai",
    ),
    ("ethereum", "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599"): TokenInfo(
        symbol="WBTC",
        name="Wrapped BTC",
        decimals=8,
        chain="ethereum",
        contract_address="0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
        is_stablecoin=False,
        coingecko_id="wrapped-bitcoin",
    ),
    ("ethereum", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"): TokenInfo(
        symbol="WETH",
        name="Wrapped Ether",
        decimals=18,
        chain="ethereum",
        contract_address="0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        is_stablecoin=False,
        coingecko_id="weth",
    ),
    ("ethereum", "0x514910771af9ca656af840dff83e8264ecf986ca"): TokenInfo(
        symbol="LINK",
        name="Chainlink",
        decimals=18,
        chain="ethereum",
        contract_address="0x514910771af9ca656af840dff83e8264ecf986ca",
        is_stablecoin=False,
        coingecko_id="chainlink",
    ),
    ("ethereum", "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984"): TokenInfo(
        symbol="UNI",
        name="Uniswap",
        decimals=18,
        chain="ethereum",
        contract_address="0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
        is_stablecoin=False,
        coingecko_id="uniswap",
    ),
    ("ethereum", "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce"): TokenInfo(
        symbol="SHIB",
        name="Shiba Inu",
        decimals=18,
        chain="ethereum",
        contract_address="0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce",
        is_stablecoin=False,
        coingecko_id="shiba-inu",
    ),
    ("ethereum", "0x6982508145454ce325ddbe47a25d4ec3d2311933"): TokenInfo(
        symbol="PEPE",
        name="Pepe",
        decimals=18,
        chain="ethereum",
        contract_address="0x6982508145454ce325ddbe47a25d4ec3d2311933",
        is_stablecoin=False,
        coingecko_id="pepe",
    ),
    ("ethereum", "0x4c9edd5852cd905f086c759e8383e09bff1e68b3"): TokenInfo(
        symbol="USDe",
        name="Ethena USDe",
        decimals=18,
        chain="ethereum",
        contract_address="0x4c9edd5852cd905f086c759e8383e09bff1e68b3",
        is_stablecoin=True,
        coingecko_id="ethena-usde",
    ),
    ("ethereum", "0x6c3ea9036406852006290770bedfcaba0e23a0e8"): TokenInfo(
        symbol="PYUSD",
        name="PayPal USD",
        decimals=6,
        chain="ethereum",
        contract_address="0x6c3ea9036406852006290770bedfcaba0e23a0e8",
        is_stablecoin=True,
        coingecko_id="paypal-usd",
    ),
    ("ethereum", "0x0000000000085d4780b73119b644ae5ecd22b376"): TokenInfo(
        symbol="TUSD",
        name="TrueUSD",
        decimals=18,
        chain="ethereum",
        contract_address="0x0000000000085d4780b73119b644ae5ecd22b376",
        is_stablecoin=True,
        coingecko_id="true-usd",
    ),

    # =========================================================================
    # Tron (TRC-20)
    # =========================================================================
    ("tron", "tr7nhqjekqxgtci8q8zy4pl8otszgjlj6t"): TokenInfo(
        symbol="USDT",
        name="Tether USD (TRC-20)",
        decimals=6,
        chain="tron",
        contract_address="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        is_stablecoin=True,
        coingecko_id="tether",
    ),
    ("tron", "te7vmw15y5d4ff36k64x4b4eb4r2wcvh7e"): TokenInfo(
        symbol="USDC",
        name="USD Coin (TRC-20)",
        decimals=6,
        chain="tron",
        contract_address="TE7VmW15y5d4FF36k64x4b4eb4r2wcvh7e",
        is_stablecoin=True,
        coingecko_id="usd-coin",
    ),
    ("tron", "tpysc67v8d2xstvdnvz6fgg7y44c2k2mnh1"): TokenInfo(
        symbol="USDD",
        name="Decentralized USD (TRC-20)",
        decimals=18,
        chain="tron",
        contract_address="TPYSc67v8d2xstVDnvz6fgg7y44c2K2mNh1",
        is_stablecoin=True,
        coingecko_id="usdd",
    ),
    ("tron", "taffkbtayyylzbmithwntmdbm3xv2nvmj7a"): TokenInfo(
        symbol="BTT",
        name="BitTorrent",
        decimals=18,
        chain="tron",
        contract_address="TAFFkbTaYYLZBMiThWntmdBm3xV2nvmj7A",
        is_stablecoin=False,
        coingecko_id="bittorrent",
    ),

    # =========================================================================
    # BNB Smart Chain (BEP-20)
    # =========================================================================
    ("bnb", "0x55d398326f99059ff775485246999027b3197955"): TokenInfo(
        symbol="USDT",
        name="Tether USD (BSC)",
        decimals=18,
        chain="bnb",
        contract_address="0x55d398326f99059ff775485246999027b3197955",
        is_stablecoin=True,
        coingecko_id="tether",
    ),
    ("bnb", "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"): TokenInfo(
        symbol="USDC",
        name="USD Coin (BSC)",
        decimals=18,
        chain="bnb",
        contract_address="0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        is_stablecoin=True,
        coingecko_id="usd-coin",
    ),
    ("bnb", "0xe9e7cea3dedca5984780bafc599bd69add087d56"): TokenInfo(
        symbol="BUSD",
        name="Binance USD",
        decimals=18,
        chain="bnb",
        contract_address="0xe9e7cea3dedca5984780bafc599bd69add087d56",
        is_stablecoin=True,
        coingecko_id="binance-usd",
    ),
    ("bnb", "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c"): TokenInfo(
        symbol="BTCB",
        name="Binance-Peg BTC",
        decimals=18,
        chain="bnb",
        contract_address="0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
        is_stablecoin=False,
        coingecko_id="binance-bitcoin",
    ),

    # =========================================================================
    # Polygon (PoS)
    # =========================================================================
    ("polygon", "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"): TokenInfo(
        symbol="USDT",
        name="Tether USD (PoS)",
        decimals=6,
        chain="polygon",
        contract_address="0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
        is_stablecoin=True,
        coingecko_id="tether",
    ),
    ("polygon", "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359"): TokenInfo(
        symbol="USDC",
        name="USD Coin (Native)",
        decimals=6,
        chain="polygon",
        contract_address="0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
        is_stablecoin=True,
        coingecko_id="usd-coin",
    ),
    ("polygon", "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"): TokenInfo(
        symbol="USDC.e",
        name="Bridged USDC",
        decimals=6,
        chain="polygon",
        contract_address="0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        is_stablecoin=True,
        coingecko_id="usd-coin",
    ),
    ("polygon", "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"): TokenInfo(
        symbol="WETH",
        name="Wrapped Ether (Polygon)",
        decimals=18,
        chain="polygon",
        contract_address="0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
        is_stablecoin=False,
        coingecko_id="weth",
    ),

    # =========================================================================
    # Arbitrum One
    # =========================================================================
    ("arbitrum", "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"): TokenInfo(
        symbol="USDT",
        name="Tether USD (Arbitrum)",
        decimals=6,
        chain="arbitrum",
        contract_address="0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
        is_stablecoin=True,
        coingecko_id="tether",
    ),
    ("arbitrum", "0xaf88d065e77c8cc2239327c5edb3a432268e5831"): TokenInfo(
        symbol="USDC",
        name="USD Coin (Arbitrum)",
        decimals=6,
        chain="arbitrum",
        contract_address="0xaf88d065e77c8cc2239327c5edb3a432268e5831",
        is_stablecoin=True,
        coingecko_id="usd-coin",
    ),
    ("arbitrum", "0x912ce59144191c1204e64559fe8253a0e49e6548"): TokenInfo(
        symbol="ARB",
        name="Arbitrum",
        decimals=18,
        chain="arbitrum",
        contract_address="0x912ce59144191c1204e64559fe8253a0e49e6548",
        is_stablecoin=False,
        coingecko_id="arbitrum",
    ),

    # =========================================================================
    # Base
    # =========================================================================
    ("base", "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"): TokenInfo(
        symbol="USDC",
        name="USD Coin (Base)",
        decimals=6,
        chain="base",
        contract_address="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        is_stablecoin=True,
        coingecko_id="usd-coin",
    ),
    ("base", "0x50c5725949a6f0c72e6c4a641f24049a917db0cb"): TokenInfo(
        symbol="DAI",
        name="Dai (Base)",
        decimals=18,
        chain="base",
        contract_address="0x50c5725949a6f0c72e6c4a641f24049a917db0cb",
        is_stablecoin=True,
        coingecko_id="dai",
    ),

    # =========================================================================
    # Solana (SPL Tokens - Mint Addresses)
    # =========================================================================
    ("solana", "es9vmfrzacxpst84ak7mt6tt2on56w981q98upwe8w1"): TokenInfo(
        symbol="USDT",
        name="Tether USD (Solana)",
        decimals=6,
        chain="solana",
        contract_address="Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        is_stablecoin=True,
        coingecko_id="tether",
    ),
    ("solana", "epjfwdd5aufqssqem2qn1xzybapc8g4weggkznwytdt"): TokenInfo(
        symbol="USDC",
        name="USD Coin (Solana)",
        decimals=6,
        chain="solana",
        contract_address="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        is_stablecoin=True,
        coingecko_id="usd-coin",
    ),
    ("solana", "dezxdshwzgv003eec9esf9u637s89l1p10gfv7lknz4s"): TokenInfo(
        symbol="BONK",
        name="Bonk",
        decimals=5,
        chain="solana",
        contract_address="DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        is_stablecoin=False,
        coingecko_id="bonk",
    ),
}


def lookup_token_info(chain: str, contract_or_mint: str) -> Optional[TokenInfo]:
    """Look up token metadata by chain and contract address."""
    key = (chain.lower(), contract_or_mint.lower().strip())
    return KNOWN_TOKENS.get(key)


def get_token_decimals(chain: str, contract_or_mint: str, default: int = 18) -> int:
    """Get decimal precision for a token, defaulting to 18 (or 6 for common stablecoins)."""
    info = lookup_token_info(chain, contract_or_mint)
    if info:
        return info.decimals
    
    # Common symbol / pattern heuristic
    c_lower = contract_or_mint.lower()
    if "usdt" in c_lower or "usdc" in c_lower:
        return 6
    if "wbtc" in c_lower:
        return 8

    return default


def get_token_symbol(chain: str, contract_or_mint: str, default: str = "TOKEN") -> str:
    """Get token symbol, defaulting to provided value."""
    info = lookup_token_info(chain, contract_or_mint)
    if info:
        return info.symbol
    return default
