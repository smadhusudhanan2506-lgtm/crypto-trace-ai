"""
CryptoTrace AI — Demo Seed Data
Creates realistic demo data with pre-seeded multi-hop traces and AI forensic assessments.
"""
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.auth.models import User
from app.cases.models import Case
from app.victims.models import Victim
from app.tracing import Trace, TraceHop, Transaction, Wallet, Alert, Evidence, FraudPattern
from app.core.security import hash_password, compute_sha256
from app.analytics.ai_investigator import run_ai_investigation


async def seed_demo_data(db: AsyncSession):
    """Seed realistic demo data. Idempotent — skips if data exists."""
    # Check if demo trace already seeded
    result = await db.execute(select(Trace).where(Trace.id == "trace-demo-multihop-case1"))
    if result.scalar_one_or_none():
        return

    now = datetime.now(timezone.utc)

    # 1. Users
    user_res = await db.execute(select(User).where(User.email == "investigator@cryptotrace.ai"))
    investigator = user_res.scalar_one_or_none()

    if not investigator:
        admin = User(
            id=str(uuid.uuid4()),
            email="admin@cryptotrace.ai",
            full_name="System Administrator",
            hashed_password=hash_password("admin123"),
            role="admin",
            organization="Cyber Crime Investigation Cell",
            badge_number="ADMIN-001",
        )
        investigator = User(
            id=str(uuid.uuid4()),
            email="investigator@cryptotrace.ai",
            full_name="Inspector Raj Kumar",
            hashed_password=hash_password("demo123"),
            role="investigator",
            organization="Cyber Crime Investigation Cell",
            badge_number="INV-2026-001",
        )
        analyst = User(
            id=str(uuid.uuid4()),
            email="analyst@cryptotrace.ai",
            full_name="Analyst Priya Sharma",
            hashed_password=hash_password("demo123"),
            role="analyst",
            organization="Cyber Crime Investigation Cell",
            badge_number="ANL-2026-001",
        )
        db.add_all([admin, investigator, analyst])
        await db.flush()

    # 2. Wallets
    demo_wallets = [
        Wallet(address="0xv1ct1m001aaa2222333344445555666677778888", chain="ethereum", label="Victim 1 Wallet", risk_score=0, tx_count=5, total_sent=2.5, balance=0.001),
        Wallet(address="0xv1ct1m002bbb3333444455556666777788889999", chain="ethereum", label="Victim 2 Wallet", risk_score=0, tx_count=3, total_sent=1.8, balance=0.002),
        Wallet(address="0xv1ct1m003ccc4444555566667777888899990000", chain="ethereum", label="Victim 3 Wallet", risk_score=0, tx_count=2, total_sent=3.2, balance=0.0005),
        Wallet(address="0xv1ct1m004ddd5555666677778888999900001111", chain="ethereum", label="Victim 4 Wallet", risk_score=0, tx_count=1, total_sent=0.5, balance=0.001),
        Wallet(address="0x5u5pect01eee6666777788889999000011112222", chain="ethereum", label="Suspect Primary", risk_score=87, tx_count=45, total_received=8.0, total_sent=7.95, balance=0.05),
        Wallet(address="0x1nterm01fff7777888899990000111122223333", chain="ethereum", label="Intermediary 1", risk_score=65, tx_count=20, total_received=7.5, total_sent=7.45),
        Wallet(address="0x1nterm02aaa8888999900001111222233334444", chain="ethereum", label="Intermediary 2", risk_score=55, tx_count=12, total_received=5.0, total_sent=4.98),
        Wallet(address="0x1nterm03bbb9999000011112222333344445555", chain="ethereum", label="Intermediary 3", risk_score=45, tx_count=8, total_received=4.5, total_sent=4.48),
        Wallet(address="0x28c6c06298d514db089934071355e5743bf21d60", chain="ethereum", label="Binance Hot Wallet", entity_name="Binance", entity_type="exchange", risk_score=10, tx_count=500000),
    ]
    for w in demo_wallets:
        w_res = await db.execute(select(Wallet).where(Wallet.address == w.address))
        if not w_res.scalar_one_or_none():
            db.add(w)
    await db.flush()

    # 3. Cases
    case1_res = await db.execute(select(Case).where(Case.case_number == "CASE-2026-001"))
    case1 = case1_res.scalar_one_or_none()

    if not case1:
        case1 = Case(
            id=str(uuid.uuid4()),
            case_number="CASE-2026-001",
            title="Multi-Victim Crypto Investment Fraud — ETH",
            description="Investigation into a crypto investment scam where victims were lured through social media ads promising 200% returns.",
            status="under_investigation",
            priority="critical",
            investigator_id=investigator.id,
            organization="Cyber Crime Cell, Delhi",
            complaint_source="National Cyber Crime Reporting Portal",
            reported_amount=840000,
            currency="INR",
            cryptocurrency="ETH",
            blockchain="ethereum",
            suspect_wallet="0x5u5pect01eee6666777788889999000011112222",
            initial_txid="0xdemo_tx_001_initial_victim_deposit",
            risk_score=92,
            priority_score=92,
            victim_count=4,
            wallet_count=9,
            transaction_count=23,
            funds_traced=8.0,
            vasp_identified=True,
            vasp_name="Binance",
            vasp_confidence=0.95,
            is_demo=True,
            created_at=now - timedelta(days=5),
        )

        case2 = Case(
            id=str(uuid.uuid4()),
            case_number="CASE-2026-002",
            title="Romance Scam — Bitcoin Fraud",
            description="Victim met suspect on dating app. Suspect convinced victim to invest in crypto platform.",
            status="new",
            priority="high",
            investigator_id=investigator.id,
            organization="Cyber Crime Cell, Mumbai",
            complaint_source="FIR",
            reported_amount=350000,
            currency="INR",
            cryptocurrency="BTC",
            blockchain="bitcoin",
            suspect_wallet="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            risk_score=45,
            priority_score=55,
            victim_count=1,
            wallet_count=3,
            transaction_count=5,
            is_demo=True,
            created_at=now - timedelta(days=2),
        )

        case3 = Case(
            id=str(uuid.uuid4()),
            case_number="CASE-2026-003",
            title="Sepolia Phishing Drainer Prototype Simulation",
            description="Demonstration case on Sepolia testnet showcasing multi-hop money mule laundering for police training.",
            status="evidence_collected",
            priority="medium",
            investigator_id=investigator.id,
            reported_amount=120000,
            currency="INR",
            cryptocurrency="ETH",
            blockchain="sepolia",
            suspect_wallet="0x5u5pect01eee6666777788889999000011112222",
            initial_txid="0xdemo_sepolia_phishing_drainer_test",
            risk_score=78,
            priority_score=40,
            victim_count=1,
            wallet_count=5,
            transaction_count=4,
            is_demo=True,
            created_at=now - timedelta(days=10),
        )

        db.add_all([case1, case2, case3])
        await db.flush()

        victims = [
            Victim(case_id=case1.id, victim_identifier="V-2026-001", amount_lost=250000, currency="INR",
                   cryptocurrency="ETH", wallet_address="0xv1ct1m001aaa2222333344445555666677778888",
                   tx_hash="0xdemo_tx_001_initial_victim_deposit", chain="ethereum",
                   complaint_date=now - timedelta(days=6), complaint_description="Lost 2.5 ETH to investment scam"),
            Victim(case_id=case1.id, victim_identifier="V-2026-002", amount_lost=180000, currency="INR",
                   cryptocurrency="ETH", wallet_address="0xv1ct1m002bbb3333444455556666777788889999",
                   tx_hash="0xdemo_tx_002_victim2_deposit", chain="ethereum",
                   complaint_date=now - timedelta(days=5), complaint_description="Lost 1.8 ETH to same scheme"),
            Victim(case_id=case1.id, victim_identifier="V-2026-003", amount_lost=320000, currency="INR",
                   cryptocurrency="ETH", wallet_address="0xv1ct1m003ccc4444555566667777888899990000",
                   tx_hash="0xdemo_tx_003_victim3_deposit", chain="ethereum",
                   complaint_date=now - timedelta(days=4), complaint_description="Lost 3.2 ETH through fake trading platform"),
            Victim(case_id=case1.id, victim_identifier="V-2026-004", amount_lost=90000, currency="INR",
                   cryptocurrency="ETH", wallet_address="0xv1ct1m004ddd5555666677778888999900001111",
                   tx_hash="0xdemo_tx_004_victim4_deposit", chain="ethereum",
                   complaint_date=now - timedelta(days=3), complaint_description="Lost 0.5 ETH to investment scam"),
        ]
        db.add_all(victims)
        await db.flush()

    # 4. Pre-seeded Traces
    trace1_id = "trace-demo-multihop-case1"
    trace1_hops = [
        # Stage 1: Victim -> Primary Suspect Collection Hub (A)
        TraceHop(trace_id=trace1_id, hop_number=1, source_address="0xv1ct1m001aaa2222333344445555666677778888",
                 destination_address="0x5u5pect_A_nexus1111222233334444555566667777", amount=10.0000, asset="ETH",
                 tx_hash="0xdemo_tx_001_victim_to_suspect_A", timestamp=now - timedelta(hours=48), chain="ethereum",
                 direction="forward", is_vasp_endpoint=False),
        # Stage 2: Split A -> Mule B & A -> Mule C (Branching ↙ ↘)
        TraceHop(trace_id=trace1_id, hop_number=2, source_address="0x5u5pect_A_nexus1111222233334444555566667777",
                 destination_address="0xmule_B_branch1_2222333344445555666677778888", amount=6.0000, asset="ETH",
                 tx_hash="0xdemo_tx_002_split_A_to_mule_B", timestamp=now - timedelta(hours=46), chain="ethereum",
                 direction="forward", is_vasp_endpoint=False),
        TraceHop(trace_id=trace1_id, hop_number=2, source_address="0x5u5pect_A_nexus1111222233334444555566667777",
                 destination_address="0xmule_C_branch2_3333444455556666777788889999", amount=4.0000, asset="ETH",
                 tx_hash="0xdemo_tx_003_split_A_to_mule_C", timestamp=now - timedelta(hours=45), chain="ethereum",
                 direction="forward", is_vasp_endpoint=False),
        # Stage 3: Merge Mule B -> D & Mule C -> D (Consolidation ↘ ↙)
        TraceHop(trace_id=trace1_id, hop_number=3, source_address="0xmule_B_branch1_2222333344445555666677778888",
                 destination_address="0xconsolidation_D_4444555566667777888899990000", amount=5.9500, asset="ETH",
                 tx_hash="0xdemo_tx_004_merge_mule_B_to_D", timestamp=now - timedelta(hours=43), chain="ethereum",
                 direction="forward", is_vasp_endpoint=False),
        TraceHop(trace_id=trace1_id, hop_number=3, source_address="0xmule_C_branch2_3333444455556666777788889999",
                 destination_address="0xconsolidation_D_4444555566667777888899990000", amount=3.9500, asset="ETH",
                 tx_hash="0xdemo_tx_005_merge_mule_C_to_D", timestamp=now - timedelta(hours=42), chain="ethereum",
                 direction="forward", is_vasp_endpoint=False),
        # Stage 4: Exit Consolidation D -> VASP (Binance Cashout)
        TraceHop(trace_id=trace1_id, hop_number=4, source_address="0xconsolidation_D_4444555566667777888899990000",
                 destination_address="0x28c6c06298d514db089934071355e5743bf21d60", amount=9.8800, asset="ETH",
                 tx_hash="0xdemo_tx_006_cashout_D_to_Binance", timestamp=now - timedelta(hours=40), chain="ethereum",
                 direction="forward", is_vasp_endpoint=True, vasp_name="Binance"),
    ]
    db.add_all(trace1_hops)

    graph_nodes_1 = [
        {"id": "0xv1ct1m001aaa2222333344445555666677778888", "type": "victim", "chain": "ethereum", "label": "Victim (0xv1ct1m...)", "hop": 0},
        {"id": "0x5u5pect_A_nexus1111222233334444555566667777", "type": "suspect", "chain": "ethereum", "label": "Suspect A (0x5u5pec...)", "hop": 1},
        {"id": "0xmule_B_branch1_2222333344445555666677778888", "type": "address", "chain": "ethereum", "label": "Mule B (0xmule_B...)", "hop": 2},
        {"id": "0xmule_C_branch2_3333444455556666777788889999", "type": "address", "chain": "ethereum", "label": "Mule C (0xmule_C...)", "hop": 2},
        {"id": "0xconsolidation_D_4444555566667777888899990000", "type": "address", "chain": "ethereum", "label": "Consolidator D (0xconsol...)", "hop": 3},
        {"id": "0x28c6c06298d514db089934071355e5743bf21d60", "type": "vasp", "chain": "ethereum", "label": "Binance VASP", "hop": 4, "entity": "Binance", "entity_type": "exchange", "confidence": 0.95},
    ]

    graph_edges_1 = [
        {"source": "0xv1ct1m001aaa2222333344445555666677778888", "target": "0x5u5pect_A_nexus1111222233334444555566667777", "tx_hash": "0xdemo_tx_001_victim_to_suspect_A", "amount": 10.0000, "asset": "ETH", "timestamp": (now - timedelta(hours=48)).isoformat()},
        {"source": "0x5u5pect_A_nexus1111222233334444555566667777", "target": "0xmule_B_branch1_2222333344445555666677778888", "tx_hash": "0xdemo_tx_002_split_A_to_mule_B", "amount": 6.0000, "asset": "ETH", "timestamp": (now - timedelta(hours=46)).isoformat()},
        {"source": "0x5u5pect_A_nexus1111222233334444555566667777", "target": "0xmule_C_branch2_3333444455556666777788889999", "tx_hash": "0xdemo_tx_003_split_A_to_mule_C", "amount": 4.0000, "asset": "ETH", "timestamp": (now - timedelta(hours=45)).isoformat()},
        {"source": "0xmule_B_branch1_2222333344445555666677778888", "target": "0xconsolidation_D_4444555566667777888899990000", "tx_hash": "0xdemo_tx_004_merge_mule_B_to_D", "amount": 5.9500, "asset": "ETH", "timestamp": (now - timedelta(hours=43)).isoformat()},
        {"source": "0xmule_C_branch2_3333444455556666777788889999", "target": "0xconsolidation_D_4444555566667777888899990000", "tx_hash": "0xdemo_tx_005_merge_mule_C_to_D", "amount": 3.9500, "asset": "ETH", "timestamp": (now - timedelta(hours=42)).isoformat()},
        {"source": "0xconsolidation_D_4444555566667777888899990000", "target": "0x28c6c06298d514db089934071355e5743bf21d60", "tx_hash": "0xdemo_tx_006_cashout_D_to_Binance", "amount": 9.8800, "asset": "ETH", "timestamp": (now - timedelta(hours=40)).isoformat()},
    ]

    graph_data_1 = {
        "nodes": graph_nodes_1,
        "edges": graph_edges_1,
        "stats": {
            "total_nodes": len(graph_nodes_1),
            "total_edges": len(graph_edges_1),
            "hops_traced": 4,
            "visited_addresses": 6,
            "visited_transactions": 6,
        }
    }

    ai_assessment_1 = await run_ai_investigation(
        db=db,
        graph_data=graph_data_1,
        chain="ethereum",
        total_value=39.78,
        hops=[{
            "hop_number": h.hop_number,
            "source_address": h.source_address,
            "destination_address": h.destination_address,
            "tx_hash": h.tx_hash,
            "amount": h.amount,
            "asset": h.asset,
            "timestamp": h.timestamp,
            "chain": h.chain,
            "is_vasp_endpoint": h.is_vasp_endpoint,
            "vasp_name": h.vasp_name,
        } for h in trace1_hops]
    )
    graph_data_1["ai_analysis"] = ai_assessment_1

    trace1 = Trace(
        id=trace1_id,
        case_id=case1.id,
        start_tx_hash="0xdemo_tx_001_victim_to_suspect_A",
        start_address="0xv1ct1m001aaa2222333344445555666677778888",
        chain="ethereum",
        direction="forward",
        max_hops=5,
        status="completed",
        progress=100,
        hops_completed=4,
        total_transactions=6,
        total_wallets=6,
        total_value=39.78,
        risk_score=92.0,
        vasp_detected=True,
        vasp_name="Binance",
        vasp_confidence=0.95,
        graph_data=graph_data_1,
        started_at=now - timedelta(hours=48),
        completed_at=now - timedelta(hours=40),
        investigator_id=investigator.id,
    )
    db.add(trace1)

    # Trace 2: Sepolia Testnet Demonstration Prototype (4 Hops)
    trace2_id = "trace-demo-sepolia-prototype"
    trace2_hops = [
        TraceHop(trace_id=trace2_id, hop_number=1, source_address="0x7114b30129c5123456789abcdef0123456789abc",
                 destination_address="0x5u5pect01eee6666777788889999000011112222", amount=0.5000, asset="ETH",
                 tx_hash="0xdemo_sepolia_phishing_drainer_test", timestamp=now - timedelta(hours=12), chain="sepolia",
                 direction="forward", is_vasp_endpoint=False),
        TraceHop(trace_id=trace2_id, hop_number=2, source_address="0x5u5pect01eee6666777788889999000011112222",
                 destination_address="0x1nterm01fff7777888899990000111122223333", amount=0.4800, asset="ETH",
                 tx_hash="0xdemo_sepolia_hop2_forwarding", timestamp=now - timedelta(hours=11), chain="sepolia",
                 direction="forward", is_vasp_endpoint=False),
        TraceHop(trace_id=trace2_id, hop_number=3, source_address="0x1nterm01fff7777888899990000111122223333",
                 destination_address="0x1nterm02aaa8888999900001111222233334444", amount=0.4500, asset="ETH",
                 tx_hash="0xdemo_sepolia_hop3_layering", timestamp=now - timedelta(hours=10), chain="sepolia",
                 direction="forward", is_vasp_endpoint=False),
        TraceHop(trace_id=trace2_id, hop_number=4, source_address="0x1nterm02aaa8888999900001111222233334444",
                 destination_address="0x28c6c06298d514db089934071355e5743bf21d60", amount=0.4400, asset="ETH",
                 tx_hash="0xdemo_sepolia_hop4_exit", timestamp=now - timedelta(hours=9), chain="sepolia",
                 direction="forward", is_vasp_endpoint=True, vasp_name="Binance"),
    ]
    db.add_all(trace2_hops)

    graph_nodes_2 = [
        {"id": "0x7114b30129c5123456789abcdef0123456789abc", "type": "victim", "chain": "sepolia", "label": "0x7114b3...", "hop": 0},
        {"id": "0x5u5pect01eee6666777788889999000011112222", "type": "suspect", "chain": "sepolia", "label": "0x5u5pec...", "hop": 1},
        {"id": "0x1nterm01fff7777888899990000111122223333", "type": "address", "chain": "sepolia", "label": "0x1nterm...", "hop": 2},
        {"id": "0x1nterm02aaa8888999900001111222233334444", "type": "address", "chain": "sepolia", "label": "0x1nterm...", "hop": 3},
        {"id": "0x28c6c06298d514db089934071355e5743bf21d60", "type": "vasp", "chain": "sepolia", "label": "Binance...", "hop": 4, "entity": "Binance", "entity_type": "exchange", "confidence": 0.95},
    ]

    graph_edges_2 = [
        {"source": "0x7114b30129c5123456789abcdef0123456789abc", "target": "0x5u5pect01eee6666777788889999000011112222", "tx_hash": "0xdemo_sepolia_phishing_drainer_test", "amount": 0.5000, "asset": "ETH", "timestamp": (now - timedelta(hours=12)).isoformat()},
        {"source": "0x5u5pect01eee6666777788889999000011112222", "target": "0x1nterm01fff7777888899990000111122223333", "tx_hash": "0xdemo_sepolia_hop2_forwarding", "amount": 0.4800, "asset": "ETH", "timestamp": (now - timedelta(hours=11)).isoformat()},
        {"source": "0x1nterm01fff7777888899990000111122223333", "target": "0x1nterm02aaa8888999900001111222233334444", "tx_hash": "0xdemo_sepolia_hop3_layering", "amount": 0.4500, "asset": "ETH", "timestamp": (now - timedelta(hours=10)).isoformat()},
        {"source": "0x1nterm02aaa8888999900001111222233334444", "target": "0x28c6c06298d514db089934071355e5743bf21d60", "tx_hash": "0xdemo_sepolia_hop4_exit", "amount": 0.4400, "asset": "ETH", "timestamp": (now - timedelta(hours=9)).isoformat()},
    ]

    graph_data_2 = {
        "nodes": graph_nodes_2,
        "edges": graph_edges_2,
        "stats": {
            "total_nodes": len(graph_nodes_2),
            "total_edges": len(graph_edges_2),
            "hops_traced": 4,
            "visited_addresses": 5,
            "visited_transactions": 4,
        }
    }

    ai_assessment_2 = await run_ai_investigation(
        db=db,
        graph_data=graph_data_2,
        chain="sepolia",
        total_value=1.87,
        hops=[{
            "hop_number": h.hop_number,
            "source_address": h.source_address,
            "destination_address": h.destination_address,
            "tx_hash": h.tx_hash,
            "amount": h.amount,
            "asset": h.asset,
            "timestamp": h.timestamp,
            "chain": h.chain,
            "is_vasp_endpoint": h.is_vasp_endpoint,
            "vasp_name": h.vasp_name,
        } for h in trace2_hops]
    )
    graph_data_2["ai_analysis"] = ai_assessment_2

    trace2 = Trace(
        id=trace2_id,
        case_id="case-sepolia-003",
        start_tx_hash="0xdemo_sepolia_phishing_drainer_test",
        start_address="0x7114b30129c5123456789abcdef0123456789abc",
        chain="sepolia",
        direction="forward",
        max_hops=4,
        status="completed",
        progress=100,
        hops_completed=4,
        total_transactions=4,
        total_wallets=5,
        total_value=1.87,
        risk_score=78.0,
        vasp_detected=True,
        vasp_name="Binance",
        vasp_confidence=0.95,
        graph_data=graph_data_2,
        started_at=now - timedelta(hours=12),
        completed_at=now - timedelta(hours=9),
        investigator_id=investigator.id,
    )
    db.add(trace2)
    await db.flush()
