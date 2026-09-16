"""
CryptoTrace AI — Scam Pattern Analyzer Coordinator
Orchestrates graph feature extraction, previous case cross-correlation,
explainable scoring, human-readable evidence synthesis, and persistence.
"""
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.scam_detection.feature_extractor import extract_features
from app.scam_detection.scoring_engine import score_patterns
from app.scam_detection.explanation_engine import generate_explanation
from app.scam_detection.case_correlator import correlate_with_previous_cases
from app.scam_detection.models import ScamAnalysisRecord

logger = logging.getLogger(__name__)


class ScamAnalyzer:
    """Core coordinator for Scam Pattern Intelligence."""

    async def analyze_graph(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        chain: str = "ethereum",
        start_address: str = "",
        start_tx_hash: str = "",
        case_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        db: Optional[AsyncSession] = None,
        persist: bool = True,
    ) -> Dict[str, Any]:
        """
        Executes end-to-end Scam Pattern Intelligence evaluation on a transaction graph.
        """
        # 1. Feature Extraction
        features = extract_features(
            nodes=nodes,
            edges=edges,
            chain=chain,
            start_address=start_address,
            start_tx_hash=start_tx_hash,
        )

        # 2. Case Correlation
        wallets = [str(n.get("id", "")) for n in nodes if n.get("id")]
        tx_hashes = [str(e.get("tx_hash", "")) for e in edges if e.get("tx_hash")]
        if start_address and start_address not in wallets:
            wallets.append(start_address)
        if start_tx_hash and start_tx_hash not in tx_hashes:
            tx_hashes.append(start_tx_hash)

        correlations: List[Dict[str, Any]] = []
        if db:
            correlations = await correlate_with_previous_cases(
                db=db,
                wallets=wallets,
                tx_hashes=tx_hashes,
                current_case_id=case_id,
            )

        # 3. Explainable Scoring Engine
        scoring_result = score_patterns(
            features=features,
            case_correlations_count=len(correlations),
        )

        primary_pattern = scoring_result["primary_pattern"]
        alternative_patterns = scoring_result["alternative_patterns"]
        all_scores = scoring_result["all_scores"]
        signals_map = scoring_result.get("signals_map", {})

        # 4. Human-Readable Evidence & Explanations
        top_signals = signals_map.get(primary_pattern.get("id", ""), [])
        explanation = generate_explanation(
            primary_pattern=primary_pattern,
            features=features,
            signals=top_signals,
            nodes=nodes,
            edges=edges,
            case_correlations=correlations,
        )

        result_payload = {
            "success": True,
            "case_id": case_id,
            "trace_id": trace_id,
            "chain": chain,
            "txid": start_tx_hash,
            "wallet": start_address,
            "primary_pattern": primary_pattern,
            "alternative_patterns": alternative_patterns,
            "all_scores": all_scores,
            "features": features,
            "evidence": explanation["evidence"],
            "graph_signals": explanation["graph_signals"],
            "node_roles": explanation["node_roles"],
            "limitations": explanation["limitations"],
            "summary_narrative": explanation["summary_narrative"],
            "correlated_cases": correlations,
        }

        # 5. Persistence
        if persist and db:
            try:
                record = ScamAnalysisRecord(
                    case_id=case_id,
                    trace_id=trace_id,
                    txid=start_tx_hash,
                    wallet=start_address,
                    chain=chain,
                    primary_pattern_id=primary_pattern.get("id", ""),
                    primary_pattern_name=primary_pattern.get("name", ""),
                    primary_score=float(primary_pattern.get("score", 0)),
                    confidence_label=primary_pattern.get("confidence_label", ""),
                    evidence_strength=primary_pattern.get("evidence_strength", "Low"),
                    primary_pattern=primary_pattern,
                    alternative_patterns=alternative_patterns,
                    all_scores=all_scores,
                    features=features,
                    evidence=explanation["evidence"],
                    graph_signals=explanation["graph_signals"],
                    node_roles=explanation["node_roles"],
                    limitations=explanation["limitations"],
                    correlated_cases=correlations,
                    summary_narrative=explanation["summary_narrative"],
                )
                db.add(record)
                await db.commit()
                result_payload["analysis_id"] = record.id
            except Exception as e:
                logger.warning(f"Failed to persist scam analysis: {e}")

        return result_payload


scam_analyzer = ScamAnalyzer()
