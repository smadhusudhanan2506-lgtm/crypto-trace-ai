/**
 * CryptoTrace AI — Client-Side Scam Pattern Intelligence Engine
 * Provides explainable scoring, feature extraction, and hybrid fallback
 * ensuring seamless execution on Vercel deployments and offline modes.
 */
import type {
  GraphNode,
  GraphEdge,
  ScamPatternAnalysisResult,
  ScamPatternFeatures,
  ScamPatternPrimary,
  ScamPatternAlternative,
  ScamGraphSignal,
  ScamNodeRole,
} from '@/types';
import api from '@/lib/api';

export const SCAM_CATEGORIES: Record<string, {
  id: string;
  name: string;
  badge: string;
  description: string;
  threshold: number;
}> = {
  investment_ponzi: {
    id: 'investment_ponzi',
    name: 'Investment / Ponzi-type Pattern',
    badge: 'High Yield / Pooling Pattern',
    description: 'Multiple independent source wallets send funds into common collection addresses followed by consolidation and onward movement.',
    threshold: 35,
  },
  phishing_drainer: {
    id: 'phishing_drainer',
    name: 'Phishing / Wallet Drain Pattern',
    badge: 'Automated Unauthorized Drain',
    description: 'Rapid, high-velocity movement of victim assets followed by multi-wallet dispersal or immediate decentralized token swapping.',
    threshold: 35,
  },
  fake_exchange: {
    id: 'fake_exchange',
    name: 'Fake Exchange / Platform Deposit Nexus',
    badge: 'Synthetic Deposit Gate',
    description: 'Multiple unrelated wallets appear to send funds through a common collection/deposit infrastructure masquerading as an exchange.',
    threshold: 35,
  },
  giveaway: {
    id: 'giveaway',
    name: 'Giveaway / Doubling Scam Pattern',
    badge: 'Multi-Inflow Ingestion',
    description: 'Multiple unrelated wallets transfer similar round amounts toward a single address with zero return distributions.',
    threshold: 40,
  },
  romance_payment: {
    id: 'romance_payment',
    name: 'Repeated Single-Source Payment Pattern (Romance / Pig-Butchering Archetype)',
    badge: 'Sequential Single-Victim Payments',
    description: 'Individual victim wallet makes repeated progressive transfers over an extended timeline to the same recipient nexus.',
    threshold: 30,
  },
  job_task: {
    id: 'job_task',
    name: 'Task / Job Commission Scam Pattern',
    badge: 'Structured Micro-Deposits',
    description: 'Multiple source wallets submit repeated structured micro-deposits into a common collection nexus with tiered threshold escalation.',
    threshold: 30,
  },
  rug_pull: {
    id: 'rug_pull',
    name: 'Token Liquidity Siphoning (Rug Pull Archetype)',
    badge: 'Liquidity Pool Removal',
    description: 'Sudden large-scale extraction of pooled assets or liquidity tokens from a decentralized trading pair after accumulation.',
    threshold: 35,
  },
  extortion_blackmail: {
    id: 'extortion_blackmail',
    name: 'Coercive / Ransom Payment Pattern',
    badge: 'Direct Demand Flow',
    description: 'Direct urgent transfer from victim wallet followed by immediate peeling or mixer routing without commercial counterparty context.',
    threshold: 45,
  },
  cross_chain_movement: {
    id: 'cross_chain_movement',
    name: 'Cross-Chain Asset Hopping Indicator',
    badge: 'Bridge Obfuscation',
    description: 'Assets routed through decentralized cross-chain bridge protocols to sever direct single-ledger tracing continuity.',
    threshold: 25,
  },
  insufficient_evidence: {
    id: 'insufficient_evidence',
    name: 'Insufficient Evidence / Unclassified Behavior',
    badge: 'Inconclusive Ledger Telemetry',
    description: 'Available transaction graph data does not exhibit distinctive clustering or topological signatures of known scam archetypes.',
    threshold: 0,
  },
};

const STANDARD_LIMITATIONS = [
  'Blockchain transaction patterns indicate structural behavior consistent with known scam archetypes; on-chain data alone cannot establish off-chain intent, real-world identity, or legal culpability.',
  'Interaction with bridges, DEXs, or custodial exchanges is not standalone proof of criminal misconduct.',
  'Classification reflects behavioral consistency, not absolute judicial certainty.',
];

const CATEGORY_LIMITATIONS: Record<string, string> = {
  romance_payment: 'Payment behavior is consistent with a repeated-payment pattern; blockchain ledger data alone cannot establish the personal or social pretext.',
  job_task: 'Deposit cadence is consistent with task/job commission structures; off-chain communications are required to verify the employer/recruiter relationship.',
  extortion_blackmail: 'Observed fund flow matches single-source coercive payment mechanics; blockchain records cannot independently verify the existence of off-chain extortion threats.',
  rug_pull: 'Token liquidity movements are consistent with developer withdrawal patterns; independent smart contract audit and tokenomics review are recommended.',
};

/**
 * Extracts quantitative features from transaction graph data.
 */
export function extractClientFeatures(
  nodes: GraphNode[],
  edges: GraphEdge[],
  chain: string = 'ethereum'
): ScamPatternFeatures {
  const total_nodes = nodes.length;
  const total_edges = edges.length;

  if (total_nodes === 0 && total_edges === 0) {
    return _emptyFeatures(chain);
  }

  const in_degrees: Record<string, number> = {};
  const out_degrees: Record<string, number> = {};
  const inflow_amounts: Record<string, number> = {};
  const outflow_amounts: Record<string, number> = {};
  const senders = new Set<string>();
  const receivers = new Set<string>();
  const dest_counts: Record<string, number> = {};
  const source_counts: Record<string, number> = {};

  const amounts: number[] = [];
  const timestamps: number[] = [];
  const tokens = new Set<string>();
  let token_tx_count = 0;
  let native_tx_count = 0;
  const chains_seen = new Set<string>([chain.toLowerCase()]);
  let has_bridge = false;
  let has_dex = false;
  let has_mixer = false;
  const vasp_names = new Set<string>();

  for (const n of nodes) {
    const nchain = (n.chain || '').toLowerCase();
    if (nchain) chains_seen.add(nchain);
    const label = (n.label || '').toLowerCase();
    const entity = (n.entity || '').toLowerCase();
    const ntype = (n.type || '').toLowerCase();

    if (ntype === 'vasp' || label.includes('exchange') || label.includes('vasp') || entity.includes('binance') || entity.includes('coinbase')) {
      vasp_names.add(n.entity || n.label || 'Known VASP');
    }
    if (label.includes('bridge') || entity.includes('bridge') || label.includes('wormhole') || label.includes('stargate')) {
      has_bridge = true;
    }
    if (label.includes('uniswap') || label.includes('swap') || label.includes('dex') || label.includes('router') || entity.includes('uniswap')) {
      has_dex = true;
    }
    if (label.includes('tornado') || label.includes('mixer') || label.includes('tumbler')) {
      has_mixer = true;
    }
  }

  for (const e of edges) {
    const src = (e.source || '').toLowerCase();
    const tgt = (e.target || '').toLowerCase();
    const val = Number(e.amount || 0);
    const asset = (e.asset || '').toUpperCase();
    const echain = ((e as any).chain || '').toLowerCase();
    if (echain) chains_seen.add(echain);

    if (src) {
      senders.add(src);
      out_degrees[src] = (out_degrees[src] || 0) + 1;
      outflow_amounts[src] = (outflow_amounts[src] || 0) + val;
      source_counts[src] = (source_counts[src] || 0) + 1;
    }
    if (tgt) {
      receivers.add(tgt);
      in_degrees[tgt] = (in_degrees[tgt] || 0) + 1;
      inflow_amounts[tgt] = (inflow_amounts[tgt] || 0) + val;
      dest_counts[tgt] = (dest_counts[tgt] || 0) + 1;
    }

    if (val > 0) amounts.push(val);

    if (asset && !['ETH', 'BTC', 'SOL', 'TRX', 'MATIC', 'BNB'].includes(asset)) {
      tokens.add(asset);
      token_tx_count++;
    } else {
      native_tx_count++;
    }

    const tsStr = e.timestamp || '';
    if (tsStr) {
      const tParsed = Date.parse(tsStr);
      if (!isNaN(tParsed)) timestamps.push(tParsed);
    }
  }

  const wallet_splitting_events = Object.values(out_degrees).filter(d => d >= 2).length;
  const wallet_merging_events = Object.values(in_degrees).filter(d => d >= 2).length;
  const max_in_degree = Math.max(0, ...Object.values(in_degrees));
  const max_out_degree = Math.max(0, ...Object.values(out_degrees));
  const branching_factor = Number((total_edges / Math.max(1, total_nodes)).toFixed(2));

  const has_fan_out = max_out_degree >= 3 || wallet_splitting_events >= 2;
  const has_fan_in = max_in_degree >= 3 || (senders.size >= 3 && receivers.size <= 2);

  let has_consolidation = false;
  for (const [nid, in_deg] of Object.entries(in_degrees)) {
    if (in_deg >= 2 && (out_degrees[nid] || 0) >= 1) {
      const in_tot = inflow_amounts[nid] || 0;
      const out_tot = outflow_amounts[nid] || 0;
      if (in_tot > 0 && (out_tot / in_tot) >= 0.5) {
        has_consolidation = true;
        break;
      }
    }
  }

  let max_hop_depth = 0;
  for (const n of nodes) {
    if (typeof n.hop === 'number') max_hop_depth = Math.max(max_hop_depth, n.hop);
  }
  if (max_hop_depth === 0 && total_edges > 0) {
    max_hop_depth = Math.min(total_edges, 5);
  }

  const total_amount_received = Number(amounts.reduce((a, b) => a + b, 0).toFixed(4));
  const total_amount_sent = Number(Object.values(outflow_amounts).reduce((a, b) => a + b, 0).toFixed(4));
  const largest_dest_val = Math.max(0, ...Object.values(inflow_amounts));
  const largest_dest_pct = total_amount_received > 0 ? Number(((largest_dest_val / total_amount_received) * 100).toFixed(1)) : 0;
  const largest_src_val = Math.max(0, ...Object.values(outflow_amounts));
  const largest_src_pct = total_amount_sent > 0 ? Number(((largest_src_val / total_amount_sent) * 100).toFixed(1)) : 0;
  const amount_concentration = total_amount_received > 0 ? Number((Math.max(0, ...amounts) / total_amount_received).toFixed(2)) : 0;

  let similar_amounts_count = 0;
  if (amounts.length >= 3) {
    for (let i = 0; i < amounts.length; i++) {
      for (let j = i + 1; j < amounts.length; j++) {
        if (amounts[i] > 0 && Math.abs(amounts[i] - amounts[j]) / amounts[i] < 0.05) {
          similar_amounts_count++;
          break;
        }
      }
    }
  }
  const transaction_amount_similarity = Number((similar_amounts_count / Math.max(1, amounts.length)).toFixed(2));

  timestamps.sort((a, b) => a - b);
  const time_deltas_seconds: number[] = [];
  for (let k = 0; k < timestamps.length - 1; k++) {
    const delta = (timestamps[k + 1] - timestamps[k]) / 1000;
    if (delta >= 0) time_deltas_seconds.push(delta);
  }

  const time_between_transactions_avg = time_deltas_seconds.length > 0
    ? Number((time_deltas_seconds.reduce((a, b) => a + b, 0) / time_deltas_seconds.length).toFixed(1))
    : 0;
  const rapid_transfer_count = time_deltas_seconds.filter(d => d <= 300).length;
  const has_rapid_forwarding = time_deltas_seconds.length >= 1 && (rapid_transfer_count >= 1 || time_between_transactions_avg < 180);

  const is_cross_chain = chains_seen.size > 1 || has_bridge;

  return {
    total_nodes,
    total_edges,
    number_of_hops: max_hop_depth,
    max_hop_depth,
    incoming_tx_count: total_edges,
    outgoing_tx_count: total_edges,
    unique_senders: senders.size,
    unique_receivers: receivers.size,
    source_wallet_count: senders.size,
    destination_wallet_count: receivers.size,
    wallet_splitting_events,
    wallet_merging_events,
    max_in_degree,
    max_out_degree,
    branching_factor,
    has_fan_in,
    has_fan_out,
    has_consolidation,
    repeated_destinations: Object.values(dest_counts).filter(c => c >= 2).length,
    repeated_sources: Object.values(source_counts).filter(c => c >= 2).length,
    total_amount_received,
    total_amount_sent,
    amount_concentration,
    largest_destination_pct: largest_dest_pct,
    largest_source_pct: largest_src_pct,
    small_repeated_txs_count: amounts.filter(a => a < 0.1).length,
    large_transfers_count: amounts.filter(a => a >= 1.0).length,
    transaction_amount_similarity,
    fund_consolidation_ratio: Number((largest_dest_pct / 100).toFixed(2)),
    first_timestamp: timestamps.length > 0 ? new Date(timestamps[0]).toISOString() : '',
    last_timestamp: timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1]).toISOString() : '',
    time_between_transactions_avg,
    rapid_transfer_count,
    has_rapid_forwarding,
    burst_activity_detected: rapid_transfer_count >= 2,
    distinct_tokens_count: tokens.size,
    token_transfer_count: token_tx_count,
    native_transfers_count: native_tx_count,
    token_swap_detected: has_dex,
    approval_interaction_detected: false,
    is_cross_chain,
    bridge_detected: has_bridge,
    source_chain: chain,
    dest_chain: Array.from(chains_seen)[chains_seen.size - 1] || chain,
    chain_switches_count: Math.max(0, chains_seen.size - 1),
    vasp_exchange_detected: vasp_names.size > 0,
    vasp_names: Array.from(vasp_names),
    dex_detected: has_dex,
    mixer_detected: has_mixer,
  };
}

function _emptyFeatures(chain: string): ScamPatternFeatures {
  return {
    total_nodes: 0,
    total_edges: 0,
    number_of_hops: 0,
    max_hop_depth: 0,
    incoming_tx_count: 0,
    outgoing_tx_count: 0,
    unique_senders: 0,
    unique_receivers: 0,
    source_wallet_count: 0,
    destination_wallet_count: 0,
    wallet_splitting_events: 0,
    wallet_merging_events: 0,
    max_in_degree: 0,
    max_out_degree: 0,
    branching_factor: 0,
    has_fan_in: false,
    has_fan_out: false,
    has_consolidation: false,
    repeated_destinations: 0,
    repeated_sources: 0,
    total_amount_received: 0,
    total_amount_sent: 0,
    amount_concentration: 0,
    largest_destination_pct: 0,
    largest_source_pct: 0,
    small_repeated_txs_count: 0,
    large_transfers_count: 0,
    transaction_amount_similarity: 0,
    fund_consolidation_ratio: 0,
    first_timestamp: '',
    last_timestamp: '',
    time_between_transactions_avg: 0,
    rapid_transfer_count: 0,
    has_rapid_forwarding: false,
    burst_activity_detected: false,
    distinct_tokens_count: 0,
    token_transfer_count: 0,
    native_transfers_count: 0,
    token_swap_detected: false,
    approval_interaction_detected: false,
    is_cross_chain: false,
    bridge_detected: false,
    source_chain: chain,
    dest_chain: chain,
    chain_switches_count: 0,
    vasp_exchange_detected: false,
    vasp_names: [],
    dex_detected: false,
    mixer_detected: false,
  };
}

/**
 * Computes scores for all supported scam categories.
 */
export function scoreClientPatterns(
  features: ScamPatternFeatures,
  nodes: GraphNode[],
  edges: GraphEdge[]
): {
  primary_pattern: ScamPatternPrimary;
  alternative_patterns: ScamPatternAlternative[];
  all_scores: Record<string, number>;
  evidence: string[];
  graph_signals: ScamGraphSignal[];
  node_roles: Record<string, ScamNodeRole>;
  limitations: string[];
  summary_narrative: string;
} {
  const scores: Record<string, number> = {};
  const signals_map: Record<string, string[]> = {};

  if (features.total_nodes <= 1 || features.total_edges === 0) {
    const insufficientCat = SCAM_CATEGORIES.insufficient_evidence;
    return {
      primary_pattern: {
        id: insufficientCat.id,
        name: insufficientCat.name,
        badge: insufficientCat.badge,
        description: insufficientCat.description,
        score: 15,
        confidence_label: 'Insufficient evidence',
        evidence_strength: 'Low',
        signals: ['Sparse or solitary transaction telemetry insufficient for behavioral clustering.'],
      },
      alternative_patterns: [],
      all_scores: { [insufficientCat.id]: 15 },
      evidence: ['✓ Single-node or zero-edge transaction query.'],
      graph_signals: [],
      node_roles: {},
      limitations: STANDARD_LIMITATIONS,
      summary_narrative: 'Insufficient transaction graph telemetry to reliably categorize transaction behavior into a known scam pattern.',
    };
  }

  // 1. Investment / Ponzi
  let ponzi = 0;
  const ponzi_sig: string[] = [];
  if (features.has_fan_in || features.unique_senders >= 3) {
    ponzi += 25;
    ponzi_sig.push(`${features.unique_senders} independent source wallets send funds inward (Fan-In)`);
  }
  if (features.max_in_degree >= 2 || features.repeated_destinations >= 1) {
    ponzi += 20;
    ponzi_sig.push('Central collection address identified receiving multi-source inflows');
  }
  if (features.has_consolidation) {
    ponzi += 15;
    ponzi_sig.push('Fund consolidation detected: incoming funds aggregated before downstream transfer');
  }
  if (features.max_hop_depth >= 2 || features.total_edges >= 3) {
    ponzi += 15;
    ponzi_sig.push(`Collected assets forwarded across ${features.max_hop_depth} subsequent hops`);
  }
  if (features.transaction_amount_similarity >= 0.25) {
    ponzi += 10;
    ponzi_sig.push('Clustered deposit amounts observed across independent source transactions');
  }
  scores.investment_ponzi = Math.min(100, ponzi);
  signals_map.investment_ponzi = ponzi_sig;

  // 2. Phishing Drainer
  let drain = 0;
  const drain_sig: string[] = [];
  if (features.has_rapid_forwarding) {
    drain += 25;
    drain_sig.push(`Sub-minute rapid forwarding detected (avg latency ${features.time_between_transactions_avg}s)`);
  }
  if (features.has_fan_out || features.wallet_splitting_events >= 1) {
    drain += 25;
    drain_sig.push('Multi-wallet fan-out dispersal across intermediary burner addresses');
  }
  if (features.amount_concentration >= 0.7 || features.largest_destination_pct >= 70) {
    drain += 20;
    drain_sig.push('Bulk drain of available balance (> 70% concentration) in singular transfer burst');
  }
  if (features.token_swap_detected || features.distinct_tokens_count >= 1) {
    drain += 15;
    drain_sig.push('Automated DEX token swap or smart contract router execution');
  }
  scores.phishing_drainer = Math.min(100, drain);
  signals_map.phishing_drainer = drain_sig;

  // 3. Fake Exchange
  let fake_ex = 0;
  const fake_sig: string[] = [];
  if (features.unique_senders >= 2) {
    fake_ex += 25;
    fake_sig.push(`${features.unique_senders} unrelated victim deposit streams`);
  }
  if (features.repeated_destinations >= 1 && !features.vasp_exchange_detected) {
    fake_ex += 20;
    fake_sig.push('Synthetic deposit-like address functioning without recognized VASP licensing');
  }
  if (features.total_amount_received >= 1.0 || features.large_transfers_count >= 2) {
    fake_ex += 20;
    fake_sig.push('High-volume aggregation hub accumulating multi-source victim assets');
  }
  if (features.time_between_transactions_avg >= 300 && features.max_hop_depth >= 2) {
    fake_ex += 15;
    fake_sig.push('Delayed structured forwarding consistent with scheduled platform sweeps');
  }
  scores.fake_exchange = Math.min(100, fake_ex);
  signals_map.fake_exchange = fake_sig;

  // 4. Giveaway
  let giveaway = 0;
  const giveaway_sig: string[] = [];
  if (features.unique_senders >= 3) {
    giveaway += 30;
    giveaway_sig.push(`${features.unique_senders} sources sending unidirectional transfers to common target`);
    if (features.unique_receivers <= 2) {
      giveaway += 25;
      giveaway_sig.push('Strict single-destination absorption sink with zero disbursement');
    }
    if (features.transaction_amount_similarity >= 0.35) {
      giveaway += 25;
      giveaway_sig.push('Repetitive round amount deposits matching public promotion tiers');
    }
    if (features.outgoing_tx_count <= 1) {
      giveaway += 20;
      giveaway_sig.push('Zero counterparty return transfers observed (one-way trap)');
    }
  }
  scores.giveaway = Math.min(100, giveaway);
  signals_map.giveaway = giveaway_sig;

  // 5. Romance Scam (Repeated Payments)
  let romance = 0;
  const romance_sig: string[] = [];
  if (features.unique_senders === 1 && features.total_edges >= 2) {
    romance += 35;
    romance_sig.push('Single victim wallet sending repeated sequential installments');
  }
  if (features.repeated_destinations >= 1) {
    romance += 30;
    romance_sig.push('Multi-stage payments directed to identical beneficiary entity');
  }
  if (features.large_transfers_count >= 1 && features.small_repeated_txs_count >= 1) {
    romance += 20;
    romance_sig.push('Progressive transfer value escalation over transaction history');
  }
  if (features.max_hop_depth >= 2) {
    romance += 15;
    romance_sig.push('Subsequent hop movement distancing funds from originating victim');
  }
  scores.romance_payment = Math.min(100, romance);
  signals_map.romance_payment = romance_sig;

  // 6. Job / Task Scam
  let job = 0;
  const job_sig: string[] = [];
  if (features.unique_senders >= 2) {
    job += 25;
    job_sig.push(`${features.unique_senders} multi-source victim deposits`);
  }
  if (features.small_repeated_txs_count >= 2) {
    job += 25;
    job_sig.push(`${features.small_repeated_txs_count} small structured task-like deposit tiers`);
  }
  if (features.max_in_degree >= 2) {
    job += 25;
    job_sig.push('Common collection address ingesting participant task payments');
  }
  if (features.has_consolidation || features.has_rapid_forwarding) {
    job += 15;
    job_sig.push('Rapid downstream sweep into master aggregation account');
  }
  scores.job_task = Math.min(100, job);
  signals_map.job_task = job_sig;

  // 7. Rug Pull
  let rug = 0;
  const rug_sig: string[] = [];
  if (features.dex_detected || features.token_swap_detected) {
    rug += 35;
    rug_sig.push('Direct interaction with decentralized liquidity pool / DEX router');
  }
  if (features.largest_destination_pct >= 80 && features.total_amount_received > 0.5) {
    rug += 30;
    rug_sig.push('Lump-sum single withdrawal siphoning > 80% of accumulated balance');
  }
  if (features.distinct_tokens_count >= 1) {
    rug += 20;
    rug_sig.push('Custom token asset extraction and immediate swap into native/stablecoin');
  }
  if (!features.vasp_exchange_detected && features.total_edges >= 2) {
    rug += 15;
    rug_sig.push('Withdrawal routed directly into private unhosted developer wallet');
  }
  scores.rug_pull = Math.min(100, rug);
  signals_map.rug_pull = rug_sig;

  // 8. Extortion / Blackmail
  let extortion = 0;
  const extortion_sig: string[] = [];
  if (features.total_edges >= 2) {
    if (features.unique_senders === 1 && features.unique_receivers >= 1 && (features.has_rapid_forwarding || features.mixer_detected || features.max_hop_depth >= 2)) {
      extortion += 20;
      extortion_sig.push('Direct transfer from victim wallet into suspect address followed by rapid onward movement');
    }
    if (features.has_rapid_forwarding || features.mixer_detected) {
      extortion += 30;
      extortion_sig.push('Immediate onward transfer or privacy mixer routing upon fund arrival');
    }
    if (features.amount_concentration >= 0.9) {
      extortion += 25;
      extortion_sig.push('Exact lump-sum payment matching single demanded ransom amount');
    }
    if (features.has_rapid_forwarding && features.time_between_transactions_avg < 300) {
      extortion += 25;
      extortion_sig.push('High velocity automated forwarding post-receipt');
    }
  }
  scores.extortion_blackmail = Math.min(100, extortion);
  signals_map.extortion_blackmail = extortion_sig;

  // Candidate evaluation
  const candidateIds = [
    'investment_ponzi', 'phishing_drainer', 'fake_exchange',
    'giveaway', 'romance_payment', 'job_task', 'rug_pull', 'extortion_blackmail',
  ];

  const ranked = candidateIds
    .map(id => ({ id, score: scores[id] || 0 }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  const catConfig = SCAM_CATEGORIES[top.id] || SCAM_CATEGORIES.insufficient_evidence;

  if (top.score < catConfig.threshold) {
    const insufficientCat = SCAM_CATEGORIES.insufficient_evidence;
    return {
      primary_pattern: {
        id: insufficientCat.id,
        name: insufficientCat.name,
        badge: insufficientCat.badge,
        description: insufficientCat.description,
        score: 20,
        confidence_label: 'Insufficient evidence',
        evidence_strength: 'Low',
        signals: ['Pattern signals fell below analytical confidence threshold.'],
      },
      alternative_patterns: [],
      all_scores: scores,
      evidence: ['✓ Observed transactions show low risk or standard counterparty transfer velocity.'],
      graph_signals: [],
      node_roles: {},
      limitations: STANDARD_LIMITATIONS,
      summary_narrative: 'Observed fund movements exhibit normal transaction patterns without distinctive fraud indicators.',
    };
  }

  const confidence_label = top.score >= 75 ? 'High pattern consistency' :
                           top.score >= 50 ? 'Moderate pattern consistency' : 'Low pattern consistency';
  const evidence_strength = top.score >= 70 ? 'High' : top.score >= 45 ? 'Medium' : 'Low';

  const primary_pattern: ScamPatternPrimary = {
    id: top.id,
    name: catConfig.name,
    badge: catConfig.badge,
    description: catConfig.description,
    score: top.score,
    confidence_label,
    evidence_strength,
    signals: signals_map[top.id] || [],
  };

  const alternative_patterns: ScamPatternAlternative[] = ranked
    .slice(1)
    .filter(r => r.score >= 20)
    .map(r => ({
      id: r.id,
      name: SCAM_CATEGORIES[r.id]?.name || r.id,
      score: r.score,
      signals_count: (signals_map[r.id] || []).length,
    }));

  // Generate evidence
  const evidence: string[] = [
    `✓ Traced ${features.total_nodes} unique wallets across ${features.total_edges} transaction hops on ${features.source_chain.toUpperCase()} (depth ${features.max_hop_depth}).`,
  ];
  if (features.unique_senders >= 2) {
    evidence.push(`✓ ${features.unique_senders} distinct source wallets identified feeding into downstream counterparties.`);
  }
  if (features.has_fan_in) {
    evidence.push('✓ Multi-inflow fan-in convergence detected: multiple tributary wallets funneled into common address.');
  }
  if (features.has_fan_out) {
    evidence.push(`✓ Fan-out asset splitting detected: funds fractured across ${features.unique_receivers} downstream beneficiary wallets.`);
  }
  if (features.has_consolidation) {
    evidence.push('✓ Fund consolidation confirmed: > 60% of aggregated tributary funds merged before onward transfer.');
  }
  if (features.has_rapid_forwarding) {
    evidence.push(`✓ High-velocity rapid forwarding observed: average hop interval of ${features.time_between_transactions_avg}s (sub-minute bot execution).`);
  }
  if (features.is_cross_chain || features.bridge_detected) {
    evidence.push('✓ Cross-chain bridge interaction detected: assets transitioned across independent blockchain ledgers.');
  }
  if (features.vasp_exchange_detected) {
    const vasps = features.vasp_names.join(', ') || 'Identified VASP';
    evidence.push(`✓ Terminal exit into centralized exchange endpoint (${vasps}) — Subpoenable under Section 91 CrPC.`);
  }
  for (const s of primary_pattern.signals) {
    const formatted = `✓ ${s}`;
    if (!evidence.includes(formatted)) evidence.push(formatted);
  }

  // Graph signals
  const graph_signals: ScamGraphSignal[] = [
    { name: 'Fan-In Convergence', detected: features.has_fan_in, severity: features.has_fan_in ? 'high' : 'neutral' },
    { name: 'Fan-Out Splitting', detected: features.has_fan_out, severity: features.has_fan_out ? 'high' : 'neutral' },
    { name: 'Fund Consolidation', detected: features.has_consolidation, severity: features.has_consolidation ? 'high' : 'neutral' },
    { name: 'Rapid Forwarding (< 120s)', detected: features.has_rapid_forwarding, severity: features.has_rapid_forwarding ? 'high' : 'neutral' },
    { name: 'Multi-Hop Layering', detected: features.max_hop_depth >= 2, severity: features.max_hop_depth >= 2 ? 'medium' : 'neutral' },
    { name: 'Cross-Chain Movement', detected: features.is_cross_chain, severity: features.is_cross_chain ? 'medium' : 'neutral' },
    { name: 'VASP Exchange Off-Ramp', detected: features.vasp_exchange_detected, severity: features.vasp_exchange_detected ? 'actionable' : 'neutral' },
  ];

  // Node roles
  const in_counts: Record<string, number> = {};
  const out_counts: Record<string, number> = {};
  for (const e of edges) {
    const src = (e.source || '').toLowerCase();
    const tgt = (e.target || '').toLowerCase();
    if (src) out_counts[src] = (out_counts[src] || 0) + 1;
    if (tgt) in_counts[tgt] = (in_counts[tgt] || 0) + 1;
  }

  const node_roles: Record<string, ScamNodeRole> = {};
  nodes.forEach((n, idx) => {
    const nid = (n.id || '').toLowerCase();
    const ntype = (n.type || '').toLowerCase();
    const in_c = in_counts[nid] || 0;
    const out_c = out_counts[nid] || 0;
    const label = (n.label || '').toLowerCase();

    let role = 'Intermediate Wallet';
    let reason = 'Relays transactions through sequential hops.';

    if (ntype === 'victim' || idx === 0 || (in_c === 0 && out_c >= 1)) {
      role = 'Victim / Origin Wallet';
      reason = 'Initial originating point of traced funds.';
    } else if (ntype === 'vasp' || label.includes('vasp') || label.includes('exchange')) {
      role = 'VASP Exchange Exit';
      reason = 'Custodial off-ramp / deposit destination for fiat liquidation.';
    } else if (in_c >= 2 && out_c >= 1) {
      role = 'Consolidation Hub';
      reason = `Aggregates incoming funds from ${in_c} sources before downstream forwarding.`;
    } else if (in_c >= 2 && out_c === 0) {
      role = 'Collection Wallet';
      reason = `Ingestion sink receiving transfers from ${in_c} independent sources.`;
    } else if (out_c >= 2) {
      role = 'Splitting / Fan-Out Nexus';
      reason = `Disperses single balance into ${out_c} downstream burner wallets.`;
    } else if (label.includes('bridge')) {
      role = 'Cross-Chain Bridge';
      reason = 'Smart contract protocol facilitating cross-chain asset transfers.';
    }

    node_roles[nid] = {
      address: n.id,
      role,
      reason,
      chain: n.chain || features.source_chain,
      in_degree: in_c,
      out_degree: out_c,
    };
  });

  const limitations = [...STANDARD_LIMITATIONS];
  if (CATEGORY_LIMITATIONS[primary_pattern.id]) {
    limitations.unshift(CATEGORY_LIMITATIONS[primary_pattern.id]);
  }

  const summary_narrative = `Transaction behavior is consistent with an ${primary_pattern.name}. ` +
    `Structural indicators show ${features.unique_senders} senders and ${features.unique_receivers} receivers ` +
    `with a pattern consistency score of ${primary_pattern.score}/100 (${primary_pattern.confidence_label}).`;

  return {
    primary_pattern,
    alternative_patterns,
    all_scores: scores,
    evidence,
    graph_signals,
    node_roles,
    limitations,
    summary_narrative,
  };
}

/**
 * High-level evaluator that tries backend evaluate endpoint first,
 * and gracefully falls back to client evaluation if backend is unreachable.
 */
export async function evaluateScamIntelligence(
  nodes: GraphNode[],
  edges: GraphEdge[],
  chain: string = 'ethereum',
  start_address: string = '',
  start_tx_hash: string = '',
  case_id?: string
): Promise<ScamPatternAnalysisResult> {
  // 1. Try Backend API
  try {
    const res = await api.post<ScamPatternAnalysisResult>('/api/scam-analysis/evaluate', {
      nodes,
      edges,
      chain,
      start_address,
      start_tx_hash,
      case_id,
    }, {
      timeout: 3000,
    });
    if (res.data && res.data.primary_pattern) {
      return res.data;
    }
  } catch {
    // Graceful fallback to client evaluation
  }

  // 2. Client-Side Evaluation
  const features = extractClientFeatures(nodes, edges, chain);
  const scored = scoreClientPatterns(features, nodes, edges);

  return {
    success: true,
    chain,
    txid: start_tx_hash,
    wallet: start_address,
    case_id: case_id || null,
    primary_pattern: scored.primary_pattern,
    alternative_patterns: scored.alternative_patterns,
    all_scores: scored.all_scores,
    features,
    evidence: scored.evidence,
    graph_signals: scored.graph_signals,
    node_roles: scored.node_roles,
    limitations: scored.limitations,
    summary_narrative: scored.summary_narrative,
    correlated_cases: [],
  };
}
