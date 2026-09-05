"""
CryptoTrace AI — Known Entity Attribution Database
Publicly documented exchange addresses and service labels.
Every attribution includes source and confidence.
"""
from typing import Dict, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.tracing import Entity, EntityAddress

# Publicly labeled addresses (from Etherscan labels, public documentation)
# Source: Etherscan public labels, official documentation
KNOWN_ENTITIES = [
    # Major global and Indian exchanges — publicly labeled hot wallets & custody
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
        ],
        "confidence": 0.98,
        "source": "Etherscan & BscScan verified labels",
    },
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
    {
        "name": "Coinbase",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0x71660c4005ba85c37ccec55d0c4493e66fe775d3", "chain": "ethereum", "label": "Coinbase 1", "source": "Etherscan public label"},
            {"address": "0x503828976d22510aad0201ac7ec88293211d23da", "chain": "ethereum", "label": "Coinbase 2", "source": "Etherscan public label"},
            {"address": "0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740", "chain": "ethereum", "label": "Coinbase 3", "source": "Etherscan public label"},
            {"address": "0x3cd751e6b0078be393132286c442345e5dc49699", "chain": "ethereum", "label": "Coinbase 4", "source": "Etherscan public label"},
            {"address": "0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43", "chain": "ethereum", "label": "Coinbase Prime", "source": "Etherscan public label"},
        ],
        "confidence": 0.98,
        "source": "Etherscan verified labels",
    },
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
    {
        "name": "OKX",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0x6cc5f688a315f3dc28a7781717a9a798a59fda7b", "chain": "ethereum", "label": "OKX 1", "source": "Etherscan public label"},
            {"address": "0xa7efae728d2936e78bda97dc267687568dd593f3", "chain": "ethereum", "label": "OKX 2", "source": "Etherscan public label"},
        ],
        "confidence": 0.96,
        "source": "Etherscan verified labels",
    },
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
    {
        "name": "KuCoin",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0xd6216fc19db775df9774a6e33526131da7d19a2c", "chain": "ethereum", "label": "KuCoin 1", "source": "Etherscan public label"},
            {"address": "0xeb97063d33246399a9b7ffabf1b88e174eb6a5f2", "chain": "ethereum", "label": "KuCoin 2", "source": "Etherscan public label"},
        ],
        "confidence": 0.95,
        "source": "Etherscan verified labels",
    },
    {
        "name": "MEXC",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0x75e89d5979e4f6fba9f97c104c22d23fbab17244", "chain": "ethereum", "label": "MEXC Hot Wallet", "source": "Etherscan public label"},
        ],
        "confidence": 0.94,
        "source": "Etherscan verified labels",
    },
    {
        "name": "Gate.io",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0x0d0707963952f2fba59dd06f2b425ace40b492fe", "chain": "ethereum", "label": "Gate.io 1", "source": "Etherscan public label"},
        ],
        "confidence": 0.94,
        "source": "Etherscan verified labels",
    },
    {
        "name": "FixedFloat (Instant Swap)",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0x4e5b2e1dc63f6b91cb6cd759936495434c7e972f", "chain": "ethereum", "label": "FixedFloat Hot Wallet", "source": "Verified DEX/Instant"},
        ],
        "confidence": 0.95,
        "source": "Publicly flagged instant exchanger",
    },
    {
        "name": "Bitfinex",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0x1151314c646ce4e0efd76d1af4760ae66a9fe30f", "chain": "ethereum", "label": "Bitfinex 1", "source": "Etherscan public label"},
            {"address": "0x742d35cc6634c0532925a3b844bc9e7595f2bd1e", "chain": "ethereum", "label": "Bitfinex 2", "source": "Etherscan public label"},
        ],
        "confidence": 0.92,
        "source": "Etherscan verified labels",
    },
    # Mixers & Privacy Protocols
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
    # DeFi & Decentralized Exchanges (Mainnet, Sepolia, Polygon, BSC)
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
        "name": "PancakeSwap",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0x10ed43c718714eb63d5aa57b78b54704e256024e", "chain": "bnb", "label": "PancakeSwap Router v2", "source": "PancakeSwap official"},
            {"address": "0x13f4ea83d0bd40e75c8222255bc855a974568dd4", "chain": "bnb", "label": "PancakeSwap V3 Router", "source": "PancakeSwap official"},
        ],
        "confidence": 0.98,
        "source": "Verified smart contract",
    },
    {
        "name": "Aave V3 Protocol",
        "entity_type": "defi_protocol",
        "addresses": [
            {"address": "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2", "chain": "ethereum", "label": "Aave V3 Pool (Mainnet)", "source": "Aave official"},
            {"address": "0x6ae43d3271ff6888e7fc43fd7321a503ff738951", "chain": "sepolia", "label": "Aave V3 Pool (Sepolia)", "source": "Aave official"},
        ],
        "confidence": 0.95,
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
            }

_build_lookup()


async def check_address(address: str) -> Optional[dict]:
    """Check if an address belongs to a known entity."""
    return _ADDRESS_LOOKUP.get(address.lower())


async def check_addresses(db: AsyncSession, addresses: List[str]) -> Dict[str, dict]:
    """Check multiple addresses for entity attribution."""
    results = {}

    for addr in addresses:
        # Check in-memory first
        entity = _ADDRESS_LOOKUP.get(addr.lower())
        if entity:
            results[addr] = entity
            continue

        # Check database
        result = await db.execute(
            select(EntityAddress).where(EntityAddress.address == addr.lower())
        )
        db_entity = result.scalar_one_or_none()
        if db_entity:
            # Get entity details
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
                }

    return results


async def seed_entities(db: AsyncSession):
    """Seed the database with known entities."""
    for entity_data in KNOWN_ENTITIES:
        # Check if entity already exists
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
