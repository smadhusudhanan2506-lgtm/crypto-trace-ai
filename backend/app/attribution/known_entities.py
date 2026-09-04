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
    # Major exchanges — publicly labeled hot wallets
    {
        "name": "Binance",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0x28c6c06298d514db089934071355e5743bf21d60", "chain": "ethereum", "label": "Binance Hot Wallet", "source": "Etherscan public label"},
            {"address": "0x21a31ee1afc51d94c2efccaa2092ad1028285549", "chain": "ethereum", "label": "Binance Hot Wallet 2", "source": "Etherscan public label"},
            {"address": "0xdfd5293d8e347dfe59e90efd55b2956a1343963d", "chain": "ethereum", "label": "Binance Hot Wallet 3", "source": "Etherscan public label"},
            {"address": "0x56eddb7aa87536c09ccc2793473599fd21a8b17f", "chain": "ethereum", "label": "Binance Hot Wallet 4", "source": "Etherscan public label"},
            {"address": "0xf977814e90da44bfa03b6295a0616a897441acec", "chain": "ethereum", "label": "Binance Cold Wallet", "source": "Etherscan public label"},
        ],
        "confidence": 0.95,
        "source": "Etherscan verified labels",
    },
    {
        "name": "Coinbase",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0x71660c4005ba85c37ccec55d0c4493e66fe775d3", "chain": "ethereum", "label": "Coinbase", "source": "Etherscan public label"},
            {"address": "0x503828976d22510aad0201ac7ec88293211d23da", "chain": "ethereum", "label": "Coinbase 2", "source": "Etherscan public label"},
            {"address": "0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740", "chain": "ethereum", "label": "Coinbase 3", "source": "Etherscan public label"},
            {"address": "0x3cd751e6b0078be393132286c442345e5dc49699", "chain": "ethereum", "label": "Coinbase 4", "source": "Etherscan public label"},
        ],
        "confidence": 0.95,
        "source": "Etherscan verified labels",
    },
    {
        "name": "Kraken",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0x2910543af39aba0cd09dbb2d50200b3e800a63d2", "chain": "ethereum", "label": "Kraken", "source": "Etherscan public label"},
            {"address": "0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0", "chain": "ethereum", "label": "Kraken 4", "source": "Etherscan public label"},
        ],
        "confidence": 0.92,
        "source": "Etherscan verified labels",
    },
    {
        "name": "Bitfinex",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0x1151314c646ce4e0efd76d1af4760ae66a9fe30f", "chain": "ethereum", "label": "Bitfinex", "source": "Etherscan public label"},
            {"address": "0x742d35cc6634c0532925a3b844bc9e7595f2bd1e", "chain": "ethereum", "label": "Bitfinex 2", "source": "Etherscan public label"},
        ],
        "confidence": 0.90,
        "source": "Etherscan verified labels",
    },
    {
        "name": "WazirX",
        "entity_type": "exchange",
        "addresses": [
            {"address": "0x35feb3215ff1c7e1a2718f382e805f0e5e263d14", "chain": "ethereum", "label": "WazirX", "source": "Public documentation"},
        ],
        "confidence": 0.85,
        "source": "Public documentation",
    },
    # Bridges
    {
        "name": "Tornado Cash",
        "entity_type": "mixer",
        "addresses": [
            {"address": "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b", "chain": "ethereum", "label": "Tornado Cash Router", "source": "Etherscan public label"},
            {"address": "0x722122df12d4e14e13ac3b6895a86e84145b6967", "chain": "ethereum", "label": "Tornado Cash Proxy", "source": "Etherscan public label"},
        ],
        "confidence": 0.95,
        "source": "Etherscan verified labels",
    },
    # DeFi
    {
        "name": "Uniswap V3",
        "entity_type": "defi_protocol",
        "addresses": [
            {"address": "0xe592427a0aece92de3edee1f18e0157c05861564", "chain": "ethereum", "label": "Uniswap V3 Router", "source": "Etherscan verified contract"},
            {"address": "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45", "chain": "ethereum", "label": "Uniswap V3 Router 2", "source": "Etherscan verified contract"},
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
