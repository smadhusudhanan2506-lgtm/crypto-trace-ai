/**
 * CryptoTrace AI — TypeScript Type Definitions
 * Mirrors the backend Pydantic schemas.
 */

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization: string;
  badge_number: string;
  is_active: boolean;
  created_at: string | null;
  last_login: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  full_name: string;
  password: string;
  role?: string;
  organization?: string;
  badge_number?: string;
}

// ─── Cases ───────────────────────────────────────────────────────────────────
export interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  investigator_id: string | null;
  organization: string;
  complaint_source: string;
  reported_amount: number;
  currency: string;
  cryptocurrency: string;
  blockchain: string;
  suspect_wallet: string;
  initial_txid: string;
  risk_score: number;
  priority_score: number;
  victim_count: number;
  wallet_count: number;
  transaction_count: number;
  funds_traced: number;
  vasp_identified: boolean;
  vasp_name: string;
  vasp_confidence: number;
  is_demo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface CaseCreate {
  title: string;
  case_number?: string;
  description?: string;
  complaint_source?: string;
  victim_count?: number;
  reported_amount?: number;
  currency?: string;
  cryptocurrency?: string;
  blockchain?: string;
  suspect_wallet?: string;
  initial_txid?: string;
  organization?: string;
}

export interface CaseListResponse {
  cases: Case[];
  total: number;
}

export interface CaseNote {
  id: string;
  case_id: string;
  author_id: string | null;
  content: string;
  created_at: string | null;
}

// ─── Victims ─────────────────────────────────────────────────────────────────
export interface Victim {
  id: string;
  case_id: string;
  victim_name: string;
  victim_id_type: string;
  victim_id_number: string;
  contact_email: string;
  contact_phone: string;
  wallet_address: string;
  tx_hash: string;
  amount_lost: number;
  currency: string;
  date_reported: string | null;
  complaint_reference: string;
  description: string;
  created_at: string | null;
}

export interface VictimCreate {
  victim_name: string;
  victim_id_type?: string;
  victim_id_number?: string;
  contact_email?: string;
  contact_phone?: string;
  wallet_address?: string;
  tx_hash?: string;
  amount_lost?: number;
  currency?: string;
  complaint_reference?: string;
  description?: string;
}

// ─── Tracing ─────────────────────────────────────────────────────────────────
export interface TraceRequest {
  tx_hash?: string;
  address?: string;
  chain?: string;
  max_hops?: number;
  direction?: string;
  case_id?: string;
}

export interface TraceResponse {
  trace_id: string;
  status: string;
  message: string;
}

export interface TraceDetail {
  id: string;
  case_id: string | null;
  start_tx_hash: string;
  start_address: string;
  chain: string;
  direction: string;
  max_hops: number;
  status: string;
  progress: number;
  progress_message: string;
  hops_completed: number;
  total_transactions: number;
  total_wallets: number;
  total_value: number;
  risk_score: number;
  vasp_detected: boolean;
  vasp_name: string;
  vasp_confidence: number;
  graph_data: GraphData;
  error_message: string;
  created_at: string | null;
  completed_at: string | null;
}

export interface TraceHop {
  id: string;
  hop_number: number;
  source_address: string;
  destination_address: string;
  tx_hash: string;
  amount: number;
  asset: string;
  timestamp: string | null;
  chain: string;
  is_vasp_endpoint: boolean;
  vasp_name: string;
}

export interface TraceStatus {
  trace_id?: string;
  status: string;
  progress: number;
  message: string;
  hops_completed?: number;
  total_wallets?: number;
  total_transactions?: number;
  total_value?: number;
  vasp_detected?: boolean;
}

// ─── Graph ───────────────────────────────────────────────────────────────────
export interface GraphNode {
  id: string;
  type: string; // 'address' | 'vasp' | 'contract' | 'victim' | 'suspect'
  chain: string;
  label: string;
  hop?: number;
  entity?: string;
  entity_type?: string;
  confidence?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  tx_hash: string;
  amount: number;
  asset: string;
  timestamp: string;
}

export interface AIAssessment {
  timestamp: string;
  chain: string;
  is_sepolia: boolean;
  is_demo: boolean;
  environment_badge: {
    label: string;
    type: 'testnet' | 'mainnet';
    is_real_loss: boolean;
    disclaimer: string;
  };
  verdict: {
    is_scam: boolean;
    fraud_type: string;
    risk_level: 'critical' | 'high' | 'medium' | 'low';
    confidence_score: number;
    confidence_percentage: string;
  };
  executive_summary: string;
  modus_operandi: {
    is_scam_likely: boolean;
    primary_typology: string;
    summary: string;
    intents: Array<{
      category: string;
      detected: boolean;
      description: string;
      evidence: string;
    }>;
    layering_hops_count: number;
    vasp_identified: boolean;
    vasp_names: string[];
  };
  amount_analysis: {
    total_value: number;
    asset: string;
    tier: string;
    tier_description: string;
    is_whale_movement: boolean;
    structuring_detected: boolean;
    average_hop_amount: number;
    max_single_transfer: number;
    transfer_count?: number;
  };
  victim_correlations: {
    total_matches: number;
    matched_victims: Array<{
      victim_id: string;
      case_number: string;
      case_title: string;
      matched_address: string;
      amount_lost: number;
      currency: string;
      cryptocurrency: string;
      complaint_date: string | null;
      complaint_description: string;
      match_type: string;
    }>;
    has_cross_victim_link: boolean;
    summary: string;
  };
  behavioral_patterns: Array<{
    pattern_type: string;
    description: string;
    severity: string;
    confidence: number;
    evidence: Record<string, unknown>;
    risk_points: number;
  }>;
  topology_analysis?: GraphTopologyAnalysis;
  police_action_plan: Array<{
    priority: string;
    title: string;
    purpose: string;
    details: string[];
    legal_basis: string;
  }>;
  advisory_disclaimer: string;
}

export interface GraphTopologyAnalysis {
  primary_topology: string;
  topology_label: string;
  predicted_purpose: string;
  confidence: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  structural_metrics: {
    max_in_degree: number;
    max_out_degree: number;
    average_time_delta_seconds: number;
    amount_decay_percentage: number;
    bridge_hops_count: number;
    is_bot_automated: boolean;
    total_nodes: number;
    total_edges: number;
  };
  detected_patterns: Array<{
    pattern_type: string;
    name: string;
    code: string;
    description: string;
    severity: string;
    confidence: number;
    risk_points: number;
    evidence: Record<string, unknown>;
    predicted_purpose?: string;
  }>;
  investigator_explanation: string;
  white_money_contrast: {
    is_likely_legitimate: boolean;
    commercial_indicators: string[];
    illicit_indicators: string[];
  };
  scam_category?: string;
  scam_category_description?: string;
  pattern_flow_summary?: string;
  flow_stages?: Array<{
    stage: number;
    title: string;
    role: string;
    description: string;
    badge: string;
    color: string;
    wallets_count?: number;
    amount?: string;
  }>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats?: {
    total_nodes: number;
    total_edges: number;
    hops_traced: number;
    visited_addresses: number;
    visited_transactions: number;
  };
  ai_analysis?: AIAssessment;
}

// ─── Blockchain ──────────────────────────────────────────────────────────────
export interface ChainIdentification {
  chain: string;
  type: string;
  confidence: number;
}

export interface NormalizedTransaction {
  tx_hash: string;
  chain: string;
  block_number: number;
  block_timestamp: string;
  status: string;
  from_address: string;
  to_address: string;
  amount: number;
  asset: string;
  fee: number;
  gas_used: number;
  gas_price: number;
  is_contract_interaction: boolean;
  token_transfers: TokenTransfer[];
  provider: string;
  retrieved_at: string;
}

export interface TokenTransfer {
  from_address: string;
  to_address: string;
  token_address: string;
  token_symbol: string;
  value: number;
  decimals: number;
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export interface RiskAnalysis {
  risk: {
    score: number;
    level: string;
    factors: RiskFactor[];
  };
  priority: {
    score: number;
    level: string;
    factors: string[];
  };
  patterns: FraudPattern[];
}

export interface RiskFactor {
  name: string;
  points: number;
  max_points: number;
  description: string;
}

export interface FraudPattern {
  pattern_type: string;
  description: string;
  severity: string;
  confidence: number;
  evidence: Record<string, unknown>;
  risk_points: number;
}

// ─── Evidence ────────────────────────────────────────────────────────────────
export interface Evidence {
  id: string;
  case_id: string;
  evidence_type: string;
  title: string;
  description: string;
  source: string;
  sha256_hash: string;
  created_at: string | null;
}

// ─── Audit ───────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, unknown>;
  previous_hash: string;
  current_hash: string;
  created_at: string | null;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────
export interface Alert {
  id: string;
  case_id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  wallet_address: string;
  tx_hash: string;
  status: string;
  created_at: string | null;
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────
export interface DashboardStats {
  total_cases: number;
  active_cases: number;
  total_victims: number;
  total_amount_reported: number;
  total_funds_traced: number;
  vasp_identified_count: number;
  cases_by_status: Record<string, number>;
  cases_by_priority: Record<string, number>;
  recent_cases: Case[];
}

// ─── App Config ──────────────────────────────────────────────────────────────
export interface AppConfig {
  app_name: string;
  mode: string;
  supported_chains: Record<string, unknown>[];
  features: {
    live_blockchain: boolean;
    demo_mode: boolean;
    ai_assistant: boolean;
    eth_explorer: boolean;
  };
}

// ─── Scam Pattern Intelligence ──────────────────────────────────────────────
export interface ScamPatternPrimary {
  id: string;
  name: string;
  badge: string;
  description: string;
  score: number;
  confidence_label: string;
  evidence_strength: string;
  signals: string[];
}

export interface ScamPatternAlternative {
  id: string;
  name: string;
  score: number;
  signals_count?: number;
}

export interface ScamPatternFeatures {
  total_nodes: number;
  total_edges: number;
  number_of_hops: number;
  max_hop_depth: number;
  incoming_tx_count: number;
  outgoing_tx_count: number;
  unique_senders: number;
  unique_receivers: number;
  source_wallet_count: number;
  destination_wallet_count: number;
  wallet_splitting_events: number;
  wallet_merging_events: number;
  max_in_degree: number;
  max_out_degree: number;
  branching_factor: number;
  has_fan_in: boolean;
  has_fan_out: boolean;
  has_consolidation: boolean;
  repeated_destinations: number;
  repeated_sources: number;
  total_amount_received: number;
  total_amount_sent: number;
  amount_concentration: number;
  largest_destination_pct: number;
  largest_source_pct: number;
  small_repeated_txs_count: number;
  large_transfers_count: number;
  transaction_amount_similarity: number;
  fund_consolidation_ratio: number;
  first_timestamp: string;
  last_timestamp: string;
  time_between_transactions_avg: number;
  rapid_transfer_count: number;
  has_rapid_forwarding: boolean;
  burst_activity_detected: boolean;
  distinct_tokens_count: number;
  token_transfer_count: number;
  native_transfers_count: number;
  token_swap_detected: boolean;
  approval_interaction_detected: boolean;
  is_cross_chain: boolean;
  bridge_detected: boolean;
  source_chain: string;
  dest_chain: string;
  chain_switches_count: number;
  vasp_exchange_detected: boolean;
  vasp_names: string[];
  dex_detected: boolean;
  mixer_detected: boolean;
}

export interface ScamGraphSignal {
  name: string;
  detected: boolean;
  severity: 'high' | 'medium' | 'neutral' | 'actionable';
}

export interface ScamNodeRole {
  address: string;
  role: string;
  reason: string;
  chain: string;
  in_degree: number;
  out_degree: number;
}

export interface ScamPatternAnalysisResult {
  success: boolean;
  analysis_id?: string;
  case_id?: string | null;
  trace_id?: string | null;
  chain: string;
  txid: string;
  wallet: string;
  primary_pattern: ScamPatternPrimary;
  alternative_patterns: ScamPatternAlternative[];
  all_scores: Record<string, number>;
  features: ScamPatternFeatures;
  evidence: string[];
  graph_signals: ScamGraphSignal[];
  node_roles: Record<string, ScamNodeRole>;
  limitations: string[];
  summary_narrative: string;
  correlated_cases: Array<{
    type: string;
    case_id?: string;
    case_number?: string;
    title?: string;
    wallet?: string;
    txid?: string;
    status?: string;
    priority?: string;
    reported_amount?: number;
    amount_lost?: number;
    cryptocurrency?: string;
  }>;
}
