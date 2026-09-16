"""
CryptoTrace AI — Unit Tests for Scam Pattern Intelligence Engine
Validates topological feature extraction, explainable scoring,
pattern classification, limitations, and edge-case handling.
"""
import unittest
import sys
import os

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.scam_detection.feature_extractor import extract_features
from app.scam_detection.scoring_engine import score_patterns
from app.scam_detection.explanation_engine import generate_explanation


class TestScamDetectionEngine(unittest.TestCase):

    def test_fan_in_detection(self):
        """Test detection of many source wallets converging into one collector (Fan-In)."""
        nodes = [
            {"id": "0xvictim1", "type": "victim"},
            {"id": "0xvictim2", "type": "victim"},
            {"id": "0xvictim3", "type": "victim"},
            {"id": "0xvictim4", "type": "victim"},
            {"id": "0xcollector", "type": "suspect"},
        ]
        edges = [
            {"source": "0xvictim1", "target": "0xcollector", "amount": 1.0, "asset": "ETH"},
            {"source": "0xvictim2", "target": "0xcollector", "amount": 1.0, "asset": "ETH"},
            {"source": "0xvictim3", "target": "0xcollector", "amount": 1.0, "asset": "ETH"},
            {"source": "0xvictim4", "target": "0xcollector", "amount": 1.0, "asset": "ETH"},
        ]
        features = extract_features(nodes, edges)
        self.assertTrue(features["has_fan_in"], "Fan-in should be detected for 4-to-1 convergence")
        self.assertEqual(features["unique_senders"], 4)
        self.assertEqual(features["unique_receivers"], 1)

    def test_fan_out_detection(self):
        """Test detection of one wallet dispersing funds across many burner wallets (Fan-Out)."""
        nodes = [
            {"id": "0xattacker", "type": "suspect"},
            {"id": "0xmule1", "type": "mule"},
            {"id": "0xmule2", "type": "mule"},
            {"id": "0xmule3", "type": "mule"},
            {"id": "0xmule4", "type": "mule"},
        ]
        edges = [
            {"source": "0xattacker", "target": "0xmule1", "amount": 0.5, "asset": "ETH"},
            {"source": "0xattacker", "target": "0xmule2", "amount": 0.5, "asset": "ETH"},
            {"source": "0xattacker", "target": "0xmule3", "amount": 0.5, "asset": "ETH"},
            {"source": "0xattacker", "target": "0xmule4", "amount": 0.5, "asset": "ETH"},
        ]
        features = extract_features(nodes, edges)
        self.assertTrue(features["has_fan_out"], "Fan-out should be detected for 1-to-4 dispersal")
        self.assertGreaterEqual(features["wallet_splitting_events"], 1)

    def test_consolidation_detection(self):
        """Test detection of multi-source inflows being aggregated and swept downstream."""
        nodes = [
            {"id": "0xs1", "type": "victim"},
            {"id": "0xs2", "type": "victim"},
            {"id": "0xhub", "type": "suspect"},
            {"id": "0xexit", "type": "mule"},
        ]
        edges = [
            {"source": "0xs1", "target": "0xhub", "amount": 2.0, "asset": "ETH"},
            {"source": "0xs2", "target": "0xhub", "amount": 3.0, "asset": "ETH"},
            {"source": "0xhub", "target": "0xexit", "amount": 4.8, "asset": "ETH"},
        ]
        features = extract_features(nodes, edges)
        self.assertTrue(features["has_consolidation"], "Consolidation should be detected when hub forwards aggregated sum")

    def test_rapid_forwarding_detection(self):
        """Test detection of automated bot transfers executing in sub-minute intervals."""
        nodes = [
            {"id": "0xvictim", "type": "victim"},
            {"id": "0xsuspect", "type": "suspect"},
            {"id": "0xmule", "type": "mule"},
        ]
        edges = [
            {"source": "0xvictim", "target": "0xsuspect", "amount": 10.0, "timestamp": "2026-09-16T08:00:00Z"},
            {"source": "0xsuspect", "target": "0xmule", "amount": 9.9, "timestamp": "2026-09-16T08:00:45Z"},
        ]
        features = extract_features(nodes, edges)
        self.assertTrue(features["has_rapid_forwarding"], "Rapid forwarding must trigger for 45s transfer delta")
        self.assertLessEqual(features["time_between_transactions_avg"], 60)

    def test_multi_hop_depth_detection(self):
        """Test multi-hop sequential layering depth calculation."""
        nodes = [
            {"id": "0x0", "hop": 0},
            {"id": "0x1", "hop": 1},
            {"id": "0x2", "hop": 2},
            {"id": "0x3", "hop": 3},
            {"id": "0x4", "hop": 4},
        ]
        edges = [
            {"source": "0x0", "target": "0x1", "amount": 1.0},
            {"source": "0x1", "target": "0x2", "amount": 0.95},
            {"source": "0x2", "target": "0x3", "amount": 0.90},
            {"source": "0x3", "target": "0x4", "amount": 0.85},
        ]
        features = extract_features(nodes, edges)
        self.assertEqual(features["max_hop_depth"], 4)
        self.assertEqual(features["total_edges"], 4)

    def test_cross_chain_indicator(self):
        """Test cross-chain bridge interaction detection."""
        nodes = [
            {"id": "0xsrc", "chain": "ethereum"},
            {"id": "0xbridge", "chain": "ethereum", "entity": "Stargate Cross-Chain Bridge"},
            {"id": "0xdest", "chain": "polygon"},
        ]
        edges = [
            {"source": "0xsrc", "target": "0xbridge", "amount": 2.0, "chain": "ethereum"},
            {"source": "0xbridge", "target": "0xdest", "amount": 2.0, "chain": "polygon"},
        ]
        features = extract_features(nodes, edges, chain="ethereum")
        self.assertTrue(features["is_cross_chain"])
        self.assertTrue(features["bridge_detected"])

    def test_investment_ponzi_scoring(self):
        """Test that multi-inflow consolidation with similar amounts scores highest for Investment/Ponzi."""
        nodes = [
            {"id": f"0xvictim{i}", "type": "victim"} for i in range(5)
        ] + [
            {"id": "0xcollector", "type": "suspect"},
            {"id": "0xforward", "type": "mule"}
        ]
        edges = [
            {"source": f"0xvictim{i}", "target": "0xcollector", "amount": 1.0, "asset": "ETH"} for i in range(5)
        ] + [
            {"source": "0xcollector", "target": "0xforward", "amount": 4.9, "asset": "ETH"}
        ]
        features = extract_features(nodes, edges)
        res = score_patterns(features, case_correlations_count=1)
        primary = res["primary_pattern"]
        self.assertEqual(primary["id"], "investment_ponzi")
        self.assertGreaterEqual(primary["score"], 60)
        self.assertIn("High", primary["confidence_label"] or primary["evidence_strength"])

    def test_phishing_drainer_scoring(self):
        """Test that high concentration rapid drain with fan-out scores highest for Phishing Drainer."""
        nodes = [
            {"id": "0xvictim", "type": "victim"},
            {"id": "0xdrainer", "type": "suspect"},
            {"id": "0xmule1", "type": "mule"},
            {"id": "0xmule2", "type": "mule"},
            {"id": "0xdex", "label": "Uniswap V3 Router", "type": "vasp"},
        ]
        edges = [
            {"source": "0xvictim", "target": "0xdrainer", "amount": 15.0, "timestamp": "2026-09-16T10:00:00Z"},
            {"source": "0xdrainer", "target": "0xmule1", "amount": 5.0, "timestamp": "2026-09-16T10:00:30Z"},
            {"source": "0xdrainer", "target": "0xmule2", "amount": 5.0, "timestamp": "2026-09-16T10:00:45Z"},
            {"source": "0xdrainer", "target": "0xdex", "amount": 5.0, "timestamp": "2026-09-16T10:01:00Z"},
        ]
        features = extract_features(nodes, edges)
        res = score_patterns(features)
        primary = res["primary_pattern"]
        self.assertEqual(primary["id"], "phishing_drainer")
        self.assertGreaterEqual(primary["score"], 60)

    def test_fake_exchange_scoring(self):
        """Test scoring for multiple victims depositing into unhosted collection infrastructure."""
        nodes = [
            {"id": "0xv1"}, {"id": "0xv2"}, {"id": "0xv3"},
            {"id": "0xplatform", "type": "suspect"},
            {"id": "0xsweep"}
        ]
        edges = [
            {"source": "0xv1", "target": "0xplatform", "amount": 5.0, "timestamp": "2026-09-15T00:00:00Z"},
            {"source": "0xv2", "target": "0xplatform", "amount": 8.0, "timestamp": "2026-09-15T04:00:00Z"},
            {"source": "0xv3", "target": "0xplatform", "amount": 12.0, "timestamp": "2026-09-15T08:00:00Z"},
            {"source": "0xplatform", "target": "0xsweep", "amount": 24.5, "timestamp": "2026-09-15T12:00:00Z"},
        ]
        features = extract_features(nodes, edges)
        res = score_patterns(features, case_correlations_count=1)
        self.assertIn(res["primary_pattern"]["id"], ["fake_exchange", "investment_ponzi"])
        self.assertGreaterEqual(res["primary_pattern"]["score"], 50)

    def test_giveaway_scoring(self):
        """Test giveaway scam scoring (many unrelated inflows into dead-end single address)."""
        nodes = [
            {"id": "0xuser1"}, {"id": "0xuser2"}, {"id": "0xuser3"}, {"id": "0xuser4"},
            {"id": "0xgiveaway_trap"}
        ]
        edges = [
            {"source": f"0xuser{i}", "target": "0xgiveaway_trap", "amount": 0.5, "asset": "ETH"}
            for i in range(1, 5)
        ]
        features = extract_features(nodes, edges)
        res = score_patterns(features)
        self.assertIn(res["primary_pattern"]["id"], ["giveaway", "investment_ponzi"])
        self.assertGreaterEqual(res["primary_pattern"]["score"], 45)

    def test_unknown_and_insufficient_evidence(self):
        """Test that sparse, ambiguous graphs return Insufficient Evidence with low confidence."""
        nodes = [
            {"id": "0xa"},
            {"id": "0xb"},
        ]
        edges = [
            {"source": "0xa", "target": "0xb", "amount": 0.05, "asset": "ETH"}
        ]
        features = extract_features(nodes, edges)
        res = score_patterns(features)
        self.assertEqual(res["primary_pattern"]["id"], "insufficient_evidence")
        self.assertIn("Insufficient", res["primary_pattern"]["confidence_label"])

    def test_empty_transaction_graph(self):
        """Test that an empty graph returns Insufficient Evidence gracefully without exceptions."""
        features = extract_features([], [])
        res = score_patterns(features)
        self.assertEqual(res["primary_pattern"]["id"], "insufficient_evidence")
        self.assertEqual(res["primary_pattern"]["score"], 15)

    def test_large_graph_handling(self):
        """Test performance and consistency on large transaction graph (100 nodes, 150 edges)."""
        nodes = [{"id": f"0xwallet_{i}", "hop": i % 5} for i in range(100)]
        edges = []
        for i in range(99):
            edges.append({
                "source": f"0xwallet_{i}",
                "target": f"0xwallet_{i+1}",
                "amount": 100.0 / (i + 1),
                "asset": "ETH",
                "timestamp": f"2026-09-16T10:{i%60:02d}:00Z"
            })
        features = extract_features(nodes, edges)
        self.assertEqual(features["total_nodes"], 100)
        self.assertEqual(features["total_edges"], 99)
        res = score_patterns(features)
        self.assertIsNotNone(res["primary_pattern"])
        self.assertIn("score", res["primary_pattern"])

    def test_neutral_explanation_limitations(self):
        """Test that generated explanations contain standard disclaimers and neutral phrasing."""
        primary_pattern = {
            "id": "romance_payment",
            "name": "Repeated Single-Source Payment Pattern (Romance / Pig-Butchering Archetype)",
            "score": 65,
            "confidence_label": "Moderate pattern consistency",
        }
        features = {
            "total_nodes": 4,
            "total_edges": 3,
            "unique_senders": 1,
            "unique_receivers": 1,
            "max_hop_depth": 2,
            "time_between_transactions_avg": 86400,
            "total_amount_received": 5.0,
            "source_chain": "ethereum",
        }
        explanation = generate_explanation(
            primary_pattern=primary_pattern,
            features=features,
            signals=["Single victim wallet sending repeated sequential installments"],
            nodes=[{"id": "0xv", "type": "victim"}, {"id": "0xs", "type": "suspect"}],
            edges=[{"source": "0xv", "target": "0xs", "amount": 2.5}],
        )
        self.assertGreater(len(explanation["evidence"]), 0)
        self.assertGreater(len(explanation["limitations"]), 0)
        # Check romance-specific disclaimer is present
        self.assertTrue(any("social pretext" in lim for lim in explanation["limitations"]))
        # Verify narrative uses neutral phrasing
        self.assertIn("consistent with", explanation["summary_narrative"])
        self.assertNotIn("definitely a scam", explanation["summary_narrative"])

    def test_job_scam_scoring(self):
        """Test structured task scam pattern with small repeated deposits."""
        nodes = [
            {"id": "0xworker1"}, {"id": "0xworker2"}, {"id": "0xworker3"},
            {"id": "0xtask_hub", "type": "suspect"}
        ]
        edges = [
            {"source": "0xworker1", "target": "0xtask_hub", "amount": 0.02, "asset": "ETH"},
            {"source": "0xworker2", "target": "0xtask_hub", "amount": 0.05, "asset": "ETH"},
            {"source": "0xworker3", "target": "0xtask_hub", "amount": 0.08, "asset": "ETH"},
        ]
        features = extract_features(nodes, edges)
        res = score_patterns(features)
        self.assertIn("job_task", res["all_scores"])
        self.assertGreaterEqual(res["all_scores"]["job_task"], 40)

    def test_invalid_and_corrupt_inputs(self):
        """Test resilience to malformed nodes, missing keys, and invalid types."""
        nodes = [{"id": None}, {"label": 12345}, {}]
        edges = [{"source": None, "target": None, "amount": "invalid_amount"}, {}]
        features = extract_features(nodes, edges)
        self.assertIsInstance(features, dict)
        self.assertGreaterEqual(features["total_nodes"], 0)
        res = score_patterns(features)
        self.assertEqual(res["primary_pattern"]["id"], "insufficient_evidence")


if __name__ == "__main__":
    unittest.main()
