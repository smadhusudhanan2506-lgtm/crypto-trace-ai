"""
CryptoTrace AI — Known Entity Attribution Database
Publicly documented exchange addresses, protocols, and service labels.
Supports Ethereum, EVM chains, Bitcoin, Tron, and Solana.
"""
from typing import Dict, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.tracing import Entity, EntityAddress

# Publicly labeled addresses (from Etherscan labels, TronScan, SolScan, public documentation)
KNOWN_ENTITIES = [
    # =========================================================================
    # Binance (Global)
    # =========================================================================
    {
        "name": "Binance",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0x28c6c06298d514db089934071355e5743bf21d60", "chain": "ethereum", "label": "Binance 14 (Hot Wallet)", "source": "Etherscan public label"},
            {"address": "0x21a31ee1afc51d94c2efccaa2092ad1028285549", "chain": "ethereum", "label": "Binance 15 (Deposit Wallet)", "source": "Etherscan public label"},
            {"address": "0xdfd5293d8e347dfe59e90efd55b2956a1343963d", "chain": "ethereum", "label": "Binance 16", "source": "Etherscan public label"},
            {"address": "0x56eddb7aa87536c09ccc2793473599fd21a8b17f", "chain": "ethereum", "label": "Binance Hot Wallet 4", "source": "Etherscan public label"},
            {"address": "0xf977814e90da44bfa03b6295a0616a897441acec", "chain": "ethereum", "label": "Binance Cold Storage", "source": "Etherscan public label"},
            {"address": "0x8894e0a0c962cb723c1976a4421c95949be2d4e3", "chain": "bnb", "label": "Binance Hot Wallet BSC", "source": "BscScan verified"},
            {"address": "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo", "chain": "bitcoin", "label": "Binance BTC Cold Storage", "source": "BitInfoCharts / Mempool"},
            {"address": "bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h", "chain": "bitcoin", "label": "Binance BTC Hot Wallet", "source": "Mempool.space"},
            {"address": "TPYSmva97u7gs3X658tN8dK642xZpTfh9t", "chain": "tron", "label": "Binance Tron Hot Wallet 1", "source": "TronScan verified"},
            {"address": "TNDc5k2mfLvyvVw8E18x5HqXmH8zF3zMps", "chain": "tron", "label": "Binance Tron Hot Wallet 2", "source": "TronScan verified"},
            {"address": "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mB726oWokFmcKK", "chain": "solana", "label": "Binance Solana Hot Wallet 1", "source": "Solscan verified"},
            {"address": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", "chain": "solana", "label": "Binance Solana Hot Wallet 2", "source": "Solscan verified"},
        ],
        "confidence": 0.98,
        "source": "Etherscan, TronScan, Solscan & Mempool verified labels",
    },

    # =========================================================================
    # Coinbase
    # =========================================================================
    {
        "name": "Coinbase",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0x71660c4005ba85c37ccec55d0c4493e66fe775d3", "chain": "ethereum", "label": "Coinbase 1", "source": "Etherscan public label"},
            {"address": "0x503828976d22510aad0201ac7ec88293211d23da", "chain": "ethereum", "label": "Coinbase 2", "source": "Etherscan public label"},
            {"address": "0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740", "chain": "ethereum", "label": "Coinbase 3", "source": "Etherscan public label"},
            {"address": "0x3cd751e6b0078be393132286c442345e5dc49699", "chain": "ethereum", "label": "Coinbase 4", "source": "Etherscan public label"},
            {"address": "0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43", "chain": "ethereum", "label": "Coinbase Prime", "source": "Etherscan public label"},
            {"address": "GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE", "chain": "solana", "label": "Coinbase Solana Hot Wallet 1", "source": "Solscan verified"},
            {"address": "H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS", "chain": "solana", "label": "Coinbase Solana Hot Wallet 2", "source": "Solscan verified"},
        ],
        "confidence": 0.98,
        "source": "Etherscan & Solscan verified labels",
    },

    # =========================================================================
    # OKX
    # =========================================================================
    {
        "name": "OKX",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0x6cc5f688a315f3dc28a7781717a9a798a59fda7b", "chain": "ethereum", "label": "OKX 1", "source": "Etherscan public label"},
            {"address": "0xa7efae728d2936e78bda97dc267687568dd593f3", "chain": "ethereum", "label": "OKX 2", "source": "Etherscan public label"},
            {"address": "TV6MuMXWWmbtBhyLtfTTgEQnGofVCrStBi", "chain": "tron", "label": "OKX Tron Hot Wallet", "source": "TronScan verified"},
        ],
        "confidence": 0.97,
        "source": "Etherscan & TronScan verified labels",
    },

    # =========================================================================
    # Bybit
    # =========================================================================
    {
        "name": "Bybit",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0xf89d7b9c864f589bbf53a82105107622b35eaa40", "chain": "ethereum", "label": "Bybit 1", "source": "Etherscan public label"},
            {"address": "0x1db3439a222c519ab44bb1144fc28167b4fa6ee6", "chain": "ethereum", "label": "Bybit Hot Wallet", "source": "Etherscan public label"},
        ],
        "confidence": 0.96,
        "source": "Etherscan verified labels",
    },

    # =========================================================================
    # Indian Registered Exchanges (FIU-IND)
    # =========================================================================
    {
        "name": "CoinDCX India",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0xa090e606e30bd747d4e6245a1517ebe430f0057e", "chain": "ethereum", "label": "CoinDCX Hot Wallet 1", "source": "Indian VASP Directory"},
            {"address": "0x74de5d4fcbf63e00296fb95dc77023cdac114eb5", "chain": "ethereum", "label": "CoinDCX Custody", "source": "Indian VASP Directory"},
        ],
        "confidence": 0.96,
        "source": "FIU-IND Registered VASP Registry",
    },
    {
        "name": "WazirX India",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0x5bdf85216ec1e38d6458c870992a69e38e03f7ef", "chain": "ethereum", "label": "WazirX Hot Wallet 1", "source": "Indian VASP Directory"},
            {"address": "0x2055ba2e0618eb738f65584556f8f17eb289a04e", "chain": "ethereum", "label": "WazirX Settlement", "source": "Indian VASP Directory"},
            {"address": "0x35feb3215ff1c7e1a2718f382e805f0e5e263d14", "chain": "ethereum", "label": "WazirX 3", "source": "Indian VASP Directory"},
        ],
        "confidence": 0.95,
        "source": "FIU-IND Registered VASP Registry",
    },
    {
        "name": "Bitbns India",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0x3d35a0f5f84d6dd2bbcf5d92e863da8e9e1fca94", "chain": "ethereum", "label": "Bitbns Hot Wallet", "source": "Indian VASP Directory"},
        ],
        "confidence": 0.93,
        "source": "FIU-IND Registered VASP Registry",
    },
    {
        "name": "ZebPay India",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0x098b716b8aaf21512996dc57eb0615e2383e2f96", "chain": "ethereum", "label": "ZebPay Custody", "source": "Indian VASP Directory"},
        ],
        "confidence": 0.93,
        "source": "FIU-IND Registered VASP Registry",
    },

    # =========================================================================
    # Kraken
    # =========================================================================
    {
        "name": "Kraken",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0x2910543af39aba0cd09dbb2d50200b3e800a63d2", "chain": "ethereum", "label": "Kraken Hot Wallet 1", "source": "Etherscan public label"},
            {"address": "0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0", "chain": "ethereum", "label": "Kraken 4", "source": "Etherscan public label"},
            {"address": "0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13", "chain": "ethereum", "label": "Kraken 2", "source": "Etherscan public label"},
        ],
        "confidence": 0.97,
        "source": "Etherscan verified labels",
    },

    # =========================================================================
    # Mixers & Privacy Protocols
    # =========================================================================
    {
        "name": "Tornado Cash",
        "entity_type": "mixer",
        "addresses": [
            {"address": "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b", "chain": "ethereum", "label": "Tornado Cash Router", "source": "OFAC Sanction List"},
            {"address": "0x722122df12d4e14e13ac3b6895a86e84145b6967", "chain": "ethereum", "label": "Tornado Cash Proxy", "source": "OFAC Sanction List"},
            {"address": "0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc", "chain": "ethereum", "label": "Tornado 0.1 ETH Pool", "source": "OFAC Sanction List"},
            {"address": "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936", "chain": "ethereum", "label": "Tornado 1 ETH Pool", "source": "OFAC Sanction List"},
            {"address": "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf", "chain": "ethereum", "label": "Tornado 10 ETH Pool", "source": "OFAC Sanction List"},
        ],
        "confidence": 0.99,
        "source": "OFAC Sanctions & Etherscan verified labels",
    },

    # =========================================================================
    # DEXs & AMMs (Uniswap, Raydium, SunSwap, PancakeSwap)
    # =========================================================================
    {
        "name": "Uniswap",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0xe592427a0aece92de3edee1f18e0157c05861564", "chain": "ethereum", "label": "Uniswap V3 Router", "source": "Uniswap official deployment"},
            {"address": "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45", "chain": "ethereum", "label": "Uniswap V3 SwapRouter02", "source": "Uniswap official deployment"},
            {"address": "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad", "chain": "ethereum", "label": "Uniswap Universal Router (Mainnet)", "source": "Uniswap official deployment"},
            {"address": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", "chain": "ethereum", "label": "Uniswap V2 Router02", "source": "Uniswap official deployment"},
            {"address": "0x3bfa4769fb09eefc5a80d6e87c3b9c650f7ae48e", "chain": "sepolia", "label": "Uniswap V3 SwapRouter02 (Sepolia)", "source": "Uniswap official deployment"},
            {"address": "0x7dfd4f31be6814d2906bde155c3e1b146eac1468", "chain": "sepolia", "label": "Uniswap Universal Router (Sepolia)", "source": "Uniswap official deployment"},
            {"address": "0xc532a74256d3db42d0bf7a0400fefdbad7694008", "chain": "sepolia", "label": "Uniswap V2 Router (Sepolia)", "source": "Uniswap official deployment"},
        ],
        "confidence": 0.98,
        "source": "Verified smart contracts",
    },
    {
        "name": "Raydium",
        "entity_type": "exchange",
        "addresses": [
            {"address": "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", "chain": "solana", "label": "Raydium Liquidity Pool V4", "source": "Solana Program Registry"},
        ],
        "confidence": 0.98,
        "source": "Solscan verified program",
    },
    {
        "name": "SunSwap",
        "entity_type": "exchange",
        "addresses": [
            {"address": "TKzxdSv2xMmAQZFeqQnMsgXKGznfSdv11S", "chain": "tron", "label": "SunSwap V2 Router", "source": "TronScan verified contract"},
        ],
        "confidence": 0.98,
        "source": "TronScan verified contract",
    },
    {
        "name": "PancakeSwap",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0x10ed43c718714eb63d5aa57b78b54704e256024e", "chain": "bnb", "label": "PancakeSwap Router v2", "source": "PancakeSwap official"},
            {"address": "0x13f4ea83d0bd40e75c8222255bc855a974568dd4", "chain": "bnb", "label": "PancakeSwap V3 Router", "source": "PancakeSwap official"},
        ],
        "confidence": 0.98,
        "source": "Verified smart contract",
    },
]

# In-memory lookup for fast matching
_ADDRESS_LOOKUP: Dict[str, dict] = {}


def _build_lookup():
    """Build address lookup table."""
    global _ADDRESS_LOOKUP
    for entity in KNOWN_ENTITIES:
        for addr_info in entity["addresses"]:
            _ADDRESS_LOOKUP[addr_info["address"].lower()] = {
                "name": entity["name"],
                "entity_type": entity["entity_type"],
                "confidence": entity["confidence"],
                "source": entity["source"],
                "label": addr_info.get("label", ""),
                "address_source": addr_info.get("source", ""),
                "chain": addr_info.get("chain", ""),
            }

_build_lookup()


async def check_address(address: str) -> Optional[dict]:
    """Check if an address belongs to a known entity."""
    return _ADDRESS_LOOKUP.get(address.strip().lower())


async def check_addresses(db: AsyncSession, addresses: List[str]) -> Dict[str, dict]:
    """Check multiple addresses for entity attribution."""
    results = {}

    for addr in addresses:
        clean_addr = addr.strip().lower()
        entity = _ADDRESS_LOOKUP.get(clean_addr)
        if entity:
            results[addr] = entity
            continue

        result = await db.execute(
            select(EntityAddress).where(EntityAddress.address == clean_addr)
        )
        db_entity = result.scalar_one_or_none()
        if db_entity:
            ent_result = await db.execute(
                select(Entity).where(Entity.id == db_entity.entity_id)
            )
            ent = ent_result.scalar_one_or_none()
            if ent:
                results[addr] = {
                    "name": ent.name,
                    "entity_type": ent.entity_type,
                    "confidence": db_entity.confidence,
                    "source": db_entity.source,
                    "label": db_entity.label,
                    "chain": db_entity.chain,
                }

    return results


async def seed_entities(db: AsyncSession):
    """Seed the database with known entities."""
    for entity_data in KNOWN_ENTITIES:
        result = await db.execute(select(Entity).where(Entity.name == entity_data["name"]))
        existing = result.scalar_one_or_none()

        if not existing:
            entity = Entity(
                name=entity_data["name"],
                entity_type=entity_data["entity_type"],
                confidence=entity_data["confidence"],
                source=entity_data["source"],
            )
            db.add(entity)
            await db.flush()

            for addr_info in entity_data["addresses"]:
                addr = EntityAddress(
                    entity_id=entity.id,
                    address=addr_info["address"].lower(),
                    chain=addr_info.get("chain", ""),
                    label=addr_info.get("label", ""),
                    source=addr_info.get("source", ""),
                    confidence=entity_data["confidence"],
                )
                db.add(addr)

    await db.flush()
