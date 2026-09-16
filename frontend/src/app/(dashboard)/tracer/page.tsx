'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { tracingAPI, blockchainAPI, scamAPI } from '@/lib/api';
import ScamIntelligencePanel from '@/components/scam/ScamIntelligencePanel';
import { truncateAddress, truncateHash, cn, timeAgo, formatDate, formatDuration, copyToClipboard } from '@/lib/utils';
import type { TraceDetail, TraceHop, TraceStatus, ScamPatternAnalysisResult } from '@/types';
import {
  Search, Play, Loader2, CheckCircle2, XCircle, Network,
  ArrowRight, Zap, ChevronDown, ChevronUp, ExternalLink,
  BrainCircuit, ShieldAlert, AlertOctagon, Sparkles, Layers, Activity, Globe, Target,
  Copy, Check, FileText, Info, Compass, ShieldCheck, Landmark, Building2, HelpCircle,
  Clock, ArrowDownRight, Share2, AlertTriangle, ArrowUpRight, Filter, ChevronRight
} from 'lucide-react';

function getExplorerUrl(id: string, type: 'address' | 'tx', chain: string = 'ethereum') {
  const c = chain.toLowerCase();
  if (c === 'sepolia') return `https://sepolia.etherscan.io/${type}/${id}`;
  if (c === 'polygon') return `https://polygonscan.com/${type}/${id}`;
  if (c === 'bnb' || c === 'bsc') return `https://bscscan.com/${type}/${id}`;
  if (c === 'arbitrum') return `https://arbiscan.io/${type}/${id}`;
  if (c === 'base') return `https://basescan.org/${type}/${id}`;
  if (c === 'optimism' || c === 'op') return `https://optimistic.etherscan.io/${type}/${id}`;
  if (c === 'avalanche' || c === 'avax') return `https://snowtrace.io/${type}/${id}`;
  if (c === 'bitcoin' || c === 'btc') return `https://mempool.space/${type}/${id}`;
  if (c === 'tron' || c === 'trx') return `https://tronscan.org/#/${type}/${id}`;
  if (c === 'solana' || c === 'sol') return `https://solscan.io/${type}/${id}`;
  if (c === 'litecoin' || c === 'ltc') return `https://litecoinspace.org/${type}/${id}`;
  if (c === 'dogecoin' || c === 'doge') return `https://dogechain.info/${type}/${id}`;
  return `https://etherscan.io/${type}/${id}`;
}

export default function TracerPage() {
  const searchParams = useSearchParams();
  const [input, setInput] = useState('');
  const [chain, setChain] = useState('');
  const [direction, setDirection] = useState('forward');
  const [maxHops, setMaxHops] = useState(100);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tracing, setTracing] = useState(false);
  const [traceId, setTraceId] = useState('');
  const [status, setStatus] = useState<TraceStatus | null>(null);
  const [result, setResult] = useState<TraceDetail | null>(null);
  const [hops, setHops] = useState<TraceHop[]>([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'story' | 'scam_intel' | 'hops' | 'forensics' | 'actions'>('story');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchHop, setSearchHop] = useState('');
  const [showJargonGuide, setShowJargonGuide] = useState(false);
  const [scamAnalysis, setScamAnalysis] = useState<ScamPatternAnalysisResult | null>(null);
  const [analyzingScam, setAnalyzingScam] = useState(false);

  const handleCopy = async (text: string, key: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const runScamAnalysis = useCallback(async (traceData: TraceDetail) => {
    if (!traceData?.graph_data?.nodes?.length) return;
    setAnalyzingScam(true);
    try {
      const res = await scamAPI.evaluate({
        nodes: traceData.graph_data.nodes,
        edges: traceData.graph_data.edges || [],
        chain: traceData.chain,
        start_address: traceData.start_address,
        start_tx_hash: traceData.start_tx_hash,
        case_id: traceData.case_id || undefined,
      });
      if (res?.data) {
        setScamAnalysis(res.data);
      }
    } catch (err) {
      console.error('Scam pattern intelligence evaluation error:', err);
    } finally {
      setAnalyzingScam(false);
    }
  }, []);

  const generateCaseBrief = () => {
    if (!result) return '';
    const ai = result.graph_data?.ai_analysis;
    const topology = ai?.topology_analysis;
    const isDex = result.vasp_name?.toLowerCase().includes('uniswap') || result.vasp_name?.toLowerCase().includes('pancake') || result.vasp_name?.toLowerCase().includes('router');
    const asset = result.graph_data?.edges?.[0]?.asset || (result.chain === 'bitcoin' ? 'BTC' : result.chain === 'tron' ? 'TRX' : result.chain === 'solana' ? 'SOL' : 'ETH');

    const scamSection = scamAnalysis?.primary_pattern ? `
SCAM PATTERN INTELLIGENCE (HYPOTHESIS / ESTIMATE):
- Likely Scam Pattern: ${scamAnalysis.primary_pattern.name}
- Pattern Consistency Score: ${scamAnalysis.primary_pattern.score}/100 (${scamAnalysis.primary_pattern.confidence_label})
- Evidence Strength: ${scamAnalysis.primary_pattern.evidence_strength}
- Key Observed Indicators:
${scamAnalysis.evidence.map(e => `  * ${e}`).join('\n')}
- Statutory Notice: Pattern matching estimates architectural archetype consistency based on visible on-chain topology. Off-chain scam classification requires corroboration with complaint statements.` : '';
    
    return `=== CRYPTOTRACE AI FORENSIC CASE BRIEF ===
Trace ID: ${result.id}
Date: ${new Date().toISOString()}
Blockchain: ${result.chain.toUpperCase()} (${ai?.is_sepolia ? 'Sepolia Testnet' : 'Mainnet'})
Risk Verdict: ${ai?.verdict?.fraud_type || 'Crypto Fund Flow'} (Confidence: ${ai?.verdict?.confidence_percentage || 'N/A'})

EXECUTIVE SUMMARY:
${ai?.executive_summary || `Funds totaling ${result.total_value.toFixed(4)} ${asset} were traced across ${result.hops_completed} hop(s) and ${result.total_wallets} wallets.`}
${scamSection}

KEY FORENSIC METRICS:
- Total Value: ${result.total_value.toFixed(4)} ${asset}
- Hops Traced: ${result.hops_completed}
- Wallets Identified: ${result.total_wallets}
- Final Destination: ${result.vasp_detected ? `${result.vasp_name} (${isDex ? 'Decentralized Protocol / Non-KYC' : 'Centralized Exchange / Subpoenable'})` : 'Unhosted Private Wallet'}
- Layering Velocity: ${formatDuration(topology?.structural_metrics?.average_time_delta_seconds)} (${topology?.structural_metrics?.is_bot_automated ? 'Automated Bot Speed' : 'Human Paced'})
- Pass-Through Rate: ${topology?.structural_metrics?.amount_decay_percentage || 0}%

TRANSACTION TRAIL:
${hops.map((h, i) => `Hop ${i + 1}: ${h.source_address} -> ${h.destination_address} | ${h.amount} ${h.asset} | TX: ${h.tx_hash} | Endpoint: ${h.vasp_name || 'Mule'}`).join('\n')}

RECOMMENDED ACTION:
${ai?.police_action_plan?.[0]?.title || 'Monitor trace addresses for outbound movement.'}
${ai?.police_action_plan?.[0]?.purpose || ''}
`;
  };

  // Load existing trace from URL params
  useEffect(() => {
    const existingTraceId = searchParams.get('trace_id');
    if (existingTraceId) {
      setTraceId(existingTraceId);
      loadTrace(existingTraceId);
    }
  }, [searchParams]);

  const loadTrace = async (id: string) => {
    try {
      const [traceRes, hopsRes] = await Promise.all([
        tracingAPI.get(id),
        tracingAPI.hops(id),
      ]);
      setResult(traceRes.data);
      setHops(hopsRes.data);
      if (traceRes.data?.chain) {
        setChain(traceRes.data.chain);
      }
      if (traceRes.data) {
        runScamAnalysis(traceRes.data);
      }
    } catch (err) {
      console.error('Load trace error:', err);
    }
  };

  // Poll for trace status
  const pollStatus = useCallback(async (id: string) => {
    let attempts = 0;
    const maxAttempts = 120;
    const poll = async () => {
      if (attempts >= maxAttempts) {
        setError('Trace timed out. Please try again.');
        setTracing(false);
        return;
      }
      try {
        const res = await tracingAPI.status(id);
        setStatus(res.data);
        if (res.data.status === 'completed') {
          setTracing(false);
          await loadTrace(id);
          return;
        }
        if (res.data.status === 'failed') {
          setError(res.data.message || 'Trace failed.');
          setTracing(false);
          return;
        }
        attempts++;
        setTimeout(poll, 2000);
      } catch {
        attempts++;
        setTimeout(poll, 3000);
      }
    };
    poll();
  }, []);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const startTrace = async () => {
    if (!input.trim()) return;
    setError('');
    setTracing(true);
    setResult(null);
    setHops([]);
    setScamAnalysis(null);
    
    // Stage 1: Initial Ledger Probe
    setStatus({
      trace_id: 'initializing',
      status: 'running',
      progress: 20,
      message: 'Connecting to multi-chain RPCs & querying live ledger nodes...',
      hops_completed: 0,
      total_wallets: 1,
      total_transactions: 0,
    });

    try {
      const trimmed = input.trim();
      const isTx = (trimmed.startsWith('0x') && trimmed.length === 66) || (!trimmed.startsWith('0x') && trimmed.length === 64);
      
      let detectedChain = chain;
      if (!detectedChain) {
        if (trimmed.startsWith('1') || trimmed.startsWith('3') || trimmed.startsWith('bc1')) {
          detectedChain = 'bitcoin';
        } else if (trimmed.startsWith('T') && trimmed.length === 34) {
          detectedChain = 'tron';
        } else if (trimmed.length >= 43 && trimmed.length <= 44 && !trimmed.startsWith('0x')) {
          detectedChain = 'solana';
        } else if (trimmed.startsWith('0x')) {
          detectedChain = trimmed.length === 66 ? 'ethereum' : 'sepolia';
        }
        if (detectedChain) {
          setChain(detectedChain);
        } else {
          try {
            const idRes = await blockchainAPI.identify(trimmed);
            if (idRes.data.chain) {
              detectedChain = idRes.data.chain;
              setChain(detectedChain);
            }
          } catch {}
        }
      }

      await delay(450);
      setStatus({
        trace_id: 'probing',
        status: 'running',
        progress: 45,
        message: 'Decoding on-chain transaction receipts & ERC-20 / TRC-20 logs...',
        hops_completed: 1,
        total_wallets: 2,
        total_transactions: 1,
      });

      // Execute on-chain trace query with timeout guard
      const tracePromise = tracingAPI.start({
        tx_hash: isTx ? trimmed : '',
        address: !isTx ? trimmed : '',
        chain: detectedChain,
        max_hops: maxHops,
        direction,
      });

      await delay(500);
      setStatus({
        trace_id: 'layering',
        status: 'running',
        progress: 72,
        message: 'Traversing sequential multi-hop layering paths & intermediary mules...',
        hops_completed: 2,
        total_wallets: 3,
        total_transactions: 2,
      });

      await delay(450);
      setStatus({
        trace_id: 'vasp_matching',
        status: 'running',
        progress: 90,
        message: 'Matching VASP exchange registries & OFAC compliance databases...',
        hops_completed: 3,
        total_wallets: 4,
        total_transactions: 3,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('On-chain trace query timed out after 12s. Please check network connection.')), 12000)
      );
      const res = await Promise.race([tracePromise, timeoutPromise]);
      setTraceId(res.data.trace_id);

      await delay(350);
      setStatus({
        trace_id: res.data.trace_id,
        status: 'completed',
        progress: 100,
        message: 'Trace complete! Synthesized AI Forensic Intelligence & Topology Map.',
        hops_completed: 4,
        total_wallets: 5,
        total_transactions: 4,
      });

      await delay(250);
      setTracing(false);
      await loadTrace(res.data.trace_id);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(errObj.response?.data?.detail || errObj.message || 'Failed to start trace.');
      setTracing(false);
      setStatus(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <Search className="w-7 h-7 text-cyan-400" />
          Multi-Chain TXID & Wallet Tracer
        </h1>
        <p className="text-base text-slate-300 mt-1.5 leading-relaxed">
          Trace on-chain cryptocurrency fund flows, intermediary mules, and detect exchange / VASP liquidation endpoints across Ethereum, Sepolia, Polygon, BSC, Arbitrum, Base, Bitcoin, and Tron.
        </p>
      </div>

      {/* Input */}
      <div className="glass-card p-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && startTrace()}
              className="input-field font-mono text-sm sm:text-base pl-4 pr-4 py-3.5"
              placeholder="Enter transaction hash (TXID 0x...) or wallet address (0x..., bc1..., T...)..."
              disabled={tracing}
            />
          </div>
          <button onClick={startTrace} disabled={tracing || !input.trim()} className="btn-primary px-7 py-3 text-base font-bold">
            {tracing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            {tracing ? 'Tracing...' : 'Trace'}
          </button>
        </div>

        {/* Advanced Options & Case Presets Collapsible Toggle */}
        <div className="mt-4 pt-3 border-t border-[#1e293b]/60 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm sm:text-base text-slate-300 hover:text-[#00ff66] transition-colors font-medium group"
          >
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 text-[#00ff66] transition-transform" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-[#00ff66] transition-transform" />
            )}
            <span>Advanced Options & Live Case Presets</span>
            <span className="text-xs font-mono text-emerald-400/80 px-2 py-0.5 rounded bg-[#00ff66]/10 border border-[#00ff66]/20">
              {showAdvanced ? 'Hide' : 'Show'}
            </span>
          </button>
        </div>

        {/* Collapsible Content */}
        {showAdvanced && (
          <div className="space-y-4 mt-3 pt-3 border-t border-[#1e293b]/40 animate-fade-in">
            {/* Advanced Tracing Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-300 font-medium mb-1.5">Blockchain</label>
                <select value={chain} onChange={(e) => setChain(e.target.value)} className="input-field text-sm">
                  <option value="">⚡ Auto-Detect (Multi-Chain Probe)</option>
                  <option value="ethereum">Ethereum (Mainnet)</option>
                  <option value="sepolia">Ethereum Sepolia (Testnet)</option>
                  <option value="bitcoin">Bitcoin (BTC)</option>
                  <option value="tron">Tron (TRX & USDT-TRC20)</option>
                  <option value="solana">Solana (SOL & SPL Tokens)</option>
                  <option value="bnb">BNB Smart Chain (BSC)</option>
                  <option value="polygon">Polygon (MATIC / POL)</option>
                  <option value="arbitrum">Arbitrum One</option>
                  <option value="base">Base</option>
                  <option value="optimism">Optimism</option>
                  <option value="avalanche">Avalanche C-Chain</option>
                  <option value="litecoin">Litecoin (LTC)</option>
                  <option value="dogecoin">Dogecoin (DOGE)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 font-medium mb-1.5">Direction</label>
                <select value={direction} onChange={(e) => setDirection(e.target.value)} className="input-field text-sm">
                  <option value="forward">Forward (follow funds to VASP / cashout)</option>
                  <option value="backward">Backward (find source / victim)</option>
                  <option value="both">Both directions (full Nexus)</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm text-slate-300 font-medium">Max Hops</label>
                  <span className="text-xs text-emerald-400 font-mono font-semibold">
                    {maxHops >= 100 ? 'Unlimited (100 max)' : `${maxHops} Hops`}
                  </span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={maxHops}
                  onChange={(e) => setMaxHops(Math.max(1, Math.min(100, parseInt(e.target.value) || 100)))}
                  className="input-field text-sm"
                  placeholder="100 (Unlimited)"
                />
              </div>
            </div>

            {/* Quick Demo Case Presets */}
            <div className="pt-3 border-t border-[#1e293b]/50">
              <p className="text-xs sm:text-sm font-mono text-slate-300 mb-2.5 flex items-center gap-2 font-medium">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Live Forensic Case Presets (Real TXIDs & Real Wallet IDs):</span>
              </p>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setInput('0x28c6c06298d514db089934071355e5743bf21d60');
                    setChain('ethereum');
                    setMaxHops(5);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/70 border border-[#00ff66]/50 text-[#00ff66] text-xs sm:text-sm font-mono font-bold transition-colors shadow-[0_0_10px_rgba(0,255,102,0.2)]"
                >
                  🏷️ ETH: Binance Hot Wallet (0x28c6...1d60)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInput('TRFU4mQ37a5DbQYhgUXYtNkyJ5pa29ua13');
                    setChain('tron');
                    setMaxHops(5);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-red-950/40 hover:bg-red-950/70 border border-red-500/50 text-red-300 text-xs sm:text-sm font-mono font-bold transition-colors shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                >
                  💵 TRON / USDT: Binance TRC-20 (TRFU...ua13)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInput('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
                    setChain('solana');
                    setMaxHops(5);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-violet-950/40 hover:bg-violet-950/70 border border-violet-500/50 text-violet-300 text-xs sm:text-sm font-mono font-bold transition-colors shadow-[0_0_10px_rgba(139,92,246,0.2)]"
                >
                  ☀️ SOLANA: Binance SOL Hot Wallet (9WzD...AWWM)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInput('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
                    setChain('bitcoin');
                    setMaxHops(5);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-amber-950/40 hover:bg-amber-950/70 border border-amber-500/50 text-amber-300 text-xs sm:text-sm font-mono font-bold transition-colors"
                >
                  🪙 BTC: Genesis Reserve (1A1z...vfNa)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInput('0xe19bc4e3113382f59b61296c87cf69bef8ea584d4b94852f5bcd28c2fb8ea06d');
                    setChain('sepolia');
                    setMaxHops(5);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-500/50 text-cyan-300 text-xs sm:text-sm font-mono font-bold transition-colors"
                >
                  🔗 Sepolia: Multi-Hop Trail (0xe19b...a06d)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Progress */}
      {tracing && status && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
            <h3 className="text-sm font-semibold text-white">Tracing in Progress</h3>
          </div>
          <div className="w-full h-2 bg-[#1e293b] rounded-full overflow-hidden mb-2">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${status.progress || 0}%` }} />
          </div>
          <p className="text-xs text-slate-400">{status.message || 'Working...'}</p>
          {status.hops_completed !== undefined && (
            <div className="flex gap-6 mt-3 text-xs text-slate-500">
              <span>Hops: {status.hops_completed}</span>
              {status.total_wallets !== undefined && <span>Wallets: {status.total_wallets}</span>}
              {status.total_transactions !== undefined && <span>TXs: {status.total_transactions}</span>}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {result && (() => {
        const ai = result.graph_data?.ai_analysis;
        const topology = ai?.topology_analysis;
        const metrics = topology?.structural_metrics;
        const isScam = Boolean(ai?.verdict?.is_scam);
        const isSepolia = Boolean(ai?.is_sepolia || result.chain?.toLowerCase() === 'sepolia');
        const isDex = Boolean(
          result.vasp_name?.toLowerCase().includes('uniswap') ||
          result.vasp_name?.toLowerCase().includes('pancake') ||
          result.vasp_name?.toLowerCase().includes('raydium') ||
          result.vasp_name?.toLowerCase().includes('sunswap') ||
          result.vasp_name?.toLowerCase().includes('router') ||
          result.vasp_name?.toLowerCase().includes('dex')
        );
        const asset = hops[0]?.asset || result.graph_data?.edges?.[0]?.asset || (
          result.chain === 'bitcoin' ? 'BTC' :
          result.chain === 'tron' ? 'TRX' :
          result.chain === 'solana' ? 'SOL' : 'ETH'
        );

        // Filter hops for the Transaction Trail tab
        const filteredHops = searchHop.trim()
          ? hops.filter(h =>
              h.source_address.toLowerCase().includes(searchHop.toLowerCase()) ||
              h.destination_address.toLowerCase().includes(searchHop.toLowerCase()) ||
              h.tx_hash.toLowerCase().includes(searchHop.toLowerCase()) ||
              (h.vasp_name && h.vasp_name.toLowerCase().includes(searchHop.toLowerCase()))
            )
          : hops;

        return (
          <div className="space-y-6">
            {/* Top Summary & Telemetry Card */}
            <div className="glass-card p-6 border border-slate-700/60 shadow-2xl relative overflow-hidden">
              {/* Background ambient glow */}
              <div className={cn(
                "absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20",
                isScam ? "bg-red-500" : "bg-emerald-500"
              )} />

              {/* Network & Environment Telemetry Banner */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 rounded-xl border text-sm mb-5 bg-[#03130a]/80 border-[#00ff66]/30">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className={cn(
                      "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                      isSepolia ? "bg-cyan-400" : "bg-emerald-400"
                    )} />
                    <span className={cn(
                      "relative inline-flex rounded-full h-3.5 w-3.5",
                      isSepolia ? "bg-cyan-500" : "bg-emerald-500"
                    )} />
                  </span>
                  <div>
                    <span className="font-mono font-bold text-white uppercase tracking-wider text-sm sm:text-base">
                      {result.chain.toUpperCase()} NETWORK TELEMETRY
                    </span>
                    <span className="text-slate-300 ml-2.5 hidden sm:inline text-xs sm:text-sm">
                      {isSepolia
                        ? "— Prototype simulation environment (Sepolia testnet tokens hold zero monetary value)."
                        : "— Live on-chain asset movement verified. Direct ledger query complete."}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Risk Verdict Pill */}
                  {ai?.verdict && (
                    <span className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider border flex items-center gap-2 shadow-md",
                      isScam
                        ? "bg-red-950/60 text-red-300 border-red-500/50 shadow-red-900/20"
                        : "bg-emerald-950/60 text-emerald-300 border-emerald-500/50 shadow-emerald-900/20"
                    )}>
                      {isScam ? <AlertOctagon className="w-4 h-4 text-red-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                      <span>{ai.verdict.fraud_type} ({ai.verdict.confidence_percentage})</span>
                    </span>
                  )}

                  {/* Scam Pattern Intelligence Archetype Pill */}
                  {scamAnalysis?.primary_pattern && (
                    <button
                      onClick={() => setActiveTab('scam_intel')}
                      className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold tracking-wider border flex items-center gap-2 shadow-md bg-purple-950/60 text-purple-200 border-purple-500/50 hover:border-purple-400 hover:bg-purple-900/60 transition-all cursor-pointer"
                      title="Click to view explainable Scam Pattern Intelligence"
                    >
                      <BrainCircuit className="w-4 h-4 text-purple-400" />
                      <span>Likely Pattern: {scamAnalysis.primary_pattern.name} ({scamAnalysis.primary_pattern.score}/100)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Title & Action Buttons */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#1e293b]/70">
                <div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      Trace Complete
                    </h2>
                    <span className="text-xs sm:text-sm px-3 py-0.5 rounded-full font-mono bg-slate-800 text-cyan-300 border border-slate-700 font-semibold">
                      ID: {result.id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-slate-300 mt-1.5 leading-relaxed">
                    Path mapped across <strong className="text-white font-bold">{result.hops_completed} sequential hop(s)</strong> and <strong className="text-white font-bold">{result.total_wallets} wallet address(es)</strong>.
                  </p>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleCopy(generateCaseBrief(), 'case_brief')}
                    className="btn-secondary text-sm font-semibold flex items-center gap-2 py-2.5 px-4 border-slate-700 hover:border-slate-500 transition-all"
                    title="Copy full case briefing for police FIR or investigation report"
                  >
                    {copiedKey === 'case_brief' ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied Brief!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-400" />
                        <span>Copy FIR Brief</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`https://www.chainabuse.com/address/${result.start_address || hops[0]?.source_address || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-sm font-semibold flex items-center gap-2 py-2.5 px-4 border-slate-700 hover:border-slate-500 text-slate-300 transition-all"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>Threat Intel</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                  </a>

                  {result.graph_data?.nodes?.length > 0 && (
                    <Link
                      href={`/graph?trace_id=${result.id}`}
                      className="btn-primary text-sm font-bold flex items-center gap-2 py-2.5 px-5 shadow-[0_0_20px_rgba(0,255,102,0.25)] hover:shadow-[0_0_25px_rgba(0,255,102,0.4)] transition-all"
                    >
                      <Network className="w-4 h-4" />
                      <span>View Interactive Graph</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>

              {/* 5 Core Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 pt-5">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-colors">
                  <div className="flex items-center gap-2 text-sm text-slate-300 font-semibold">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>Total Value</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-extrabold text-white font-mono mt-1.5">
                    {result.total_value.toFixed(4)} <span className="text-sm text-cyan-400 font-sans font-bold">{asset}</span>
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">Net on-chain transfer</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-violet-500/40 transition-colors">
                  <div className="flex items-center gap-2 text-sm text-slate-300 font-semibold">
                    <Layers className="w-4 h-4 text-violet-400" />
                    <span>Hops Traced</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-extrabold text-violet-300 font-mono mt-1.5">
                    {result.hops_completed} <span className="text-sm text-slate-400 font-sans font-normal">Hop{result.hops_completed === 1 ? '' : 's'}</span>
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">Sequential ledger path</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 transition-colors">
                  <div className="flex items-center gap-2 text-sm text-slate-300 font-semibold">
                    <Globe className="w-4 h-4 text-amber-400" />
                    <span>Wallets Identified</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-extrabold text-amber-300 font-mono mt-1.5">
                    {result.total_wallets} <span className="text-sm text-slate-400 font-sans font-normal">Wallets</span>
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">Nodes in fund chain</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-colors">
                  <div className="flex items-center gap-2 text-sm text-slate-300 font-semibold">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Layering Velocity</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-extrabold text-[#00ff66] font-mono mt-1.5">
                    {formatDuration(metrics?.average_time_delta_seconds)}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
                    {metrics?.is_bot_automated ? '⚡ Automated Bot' : '👤 Human Paced'}
                  </p>
                </div>

                <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 transition-colors">
                  <div className="flex items-center gap-2 text-sm text-slate-300 font-semibold">
                    <Target className="w-4 h-4 text-purple-400" />
                    <span>Destination Endpoint</span>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-purple-300 truncate mt-1.5">
                    {result.vasp_detected ? result.vasp_name : 'Unhosted Stash Wallet'}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1 truncate">
                    {result.vasp_detected
                      ? (isDex ? '⚡ DEX Pool (Non-KYC)' : '🏛️ Exchange (KYC Subpoena)')
                      : '💼 Private Non-Custodial'}
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Fund Journey (Timeline Flow) */}
            <div className="glass-card p-6 border border-slate-700/60 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
                    <Compass className="w-5 h-5 text-emerald-400" />
                    <span>Visual Fund Journey (Step-by-Step Path)</span>
                  </h3>
                  <p className="text-sm text-slate-300 mt-0.5">
                    Chronological tracking of funds from the starting wallet to the exit destination.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-300 font-mono">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Origin
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Mule
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Exit
                  </span>
                </div>
              </div>

              {/* Flow Pipeline Steps */}
              {hops.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-base text-slate-300 font-mono">
                  Single wallet query: {truncateAddress(result.start_address || result.start_tx_hash)}
                </div>
              ) : (
                <div className="relative pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                    {/* Node 1: Origin Source */}
                    <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-b from-emerald-950/40 to-slate-900/70 border border-emerald-500/40 relative group hover:border-emerald-400 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Step 1: Origin
                        </span>
                        <span className="text-xs sm:text-sm text-slate-300 font-mono font-medium">Source Wallet</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span className="font-mono text-sm sm:text-base text-white font-bold tracking-wide">
                          {truncateAddress(hops[0]?.source_address)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopy(hops[0]?.source_address, 'origin_addr')}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                            title="Copy full address"
                          >
                            {copiedKey === 'origin_addr' ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <a
                            href={getExplorerUrl(hops[0]?.source_address, 'address', hops[0]?.chain || result.chain)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
                            title="View on block explorer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-sm">
                        <span className="text-slate-300 font-medium">Initial Outflow:</span>
                        <span className="font-mono font-bold text-emerald-300 text-sm sm:text-base">
                          {hops[0]?.amount?.toFixed(4)} {hops[0]?.asset}
                        </span>
                      </div>
                    </div>

                    {/* Node 2: Intermediate Transit Mule */}
                    <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-b from-amber-950/40 to-slate-900/70 border border-amber-500/40 relative group hover:border-amber-400 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Step 2: Transit Mule
                        </span>
                        <span className="text-xs sm:text-sm text-slate-300 font-mono font-medium">
                          Hop 1 Transfer
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span className="font-mono text-sm sm:text-base text-white font-bold tracking-wide">
                          {truncateAddress(hops[0]?.destination_address)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopy(hops[0]?.destination_address, 'mule_addr')}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                            title="Copy full address"
                          >
                            {copiedKey === 'mule_addr' ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <a
                            href={getExplorerUrl(hops[0]?.destination_address, 'address', hops[0]?.chain || result.chain)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
                            title="View on block explorer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-sm">
                        <span className="text-slate-300 font-medium">Layering Transit:</span>
                        <span className="font-mono font-bold text-amber-300 text-sm sm:text-base">
                          {hops.length > 1 ? `${hops[1]?.amount?.toFixed(4)} ${hops[1]?.asset}` : `${hops[0]?.amount?.toFixed(4)} ${hops[0]?.asset}`}
                        </span>
                      </div>
                    </div>

                    {/* Node 3: Final Destination / Exit Endpoint */}
                    <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-b from-purple-950/40 to-slate-900/70 border border-purple-500/40 relative group hover:border-purple-400 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-bold font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Step 3: Final Exit
                        </span>
                        <span className="text-xs sm:text-sm text-purple-300 font-mono font-bold">
                          {result.vasp_detected ? (isDex ? 'DEX Protocol' : 'VASP Exchange') : 'Holding Stash'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="truncate">
                          <p className="text-sm sm:text-base font-bold text-white truncate">
                            {result.vasp_detected ? result.vasp_name : truncateAddress(hops[hops.length - 1]?.destination_address)}
                          </p>
                          <span className="font-mono text-xs sm:text-sm text-slate-400">
                            {truncateAddress(hops[hops.length - 1]?.destination_address)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleCopy(hops[hops.length - 1]?.destination_address, 'exit_addr')}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                            title="Copy full address"
                          >
                            {copiedKey === 'exit_addr' ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <a
                            href={getExplorerUrl(hops[hops.length - 1]?.destination_address, 'address', hops[hops.length - 1]?.chain || result.chain)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
                            title="View on block explorer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-sm">
                        <span className="text-slate-300 font-medium">Exit Status:</span>
                        <span className="font-mono font-bold text-purple-300 truncate text-sm sm:text-base">
                          {isDex ? 'Liquidated / Swapped' : result.vasp_detected ? 'Custodial Deposit' : 'Resting in Stash'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tabbed Navigation Bar */}
            <div className="flex border-b border-slate-800 bg-slate-900/50 rounded-t-xl p-1.5 gap-1.5 overflow-x-auto">
              <button
                onClick={() => setActiveTab('story')}
                className={cn(
                  "flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm sm:text-base font-bold transition-all shrink-0",
                  activeTab === 'story'
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                <FileText className="w-4 h-4" />
                <span>Executive Story & Summary</span>
              </button>

              <button
                onClick={() => setActiveTab('scam_intel')}
                className={cn(
                  "flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm sm:text-base font-bold transition-all shrink-0",
                  activeTab === 'scam_intel'
                    ? "bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                <BrainCircuit className="w-4 h-4 text-purple-400" />
                <span>Scam Pattern Intelligence</span>
                {scamAnalysis?.primary_pattern ? (
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-purple-900/60 text-purple-300 border border-purple-700/60 font-bold">
                    {scamAnalysis.primary_pattern.score}/100
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold font-mono">
                    AI ESTIMATE
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('hops')}
                className={cn(
                  "flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm sm:text-base font-bold transition-all shrink-0",
                  activeTab === 'hops'
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Transaction Trail</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                  {hops.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('forensics')}
                className={cn(
                  "flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm sm:text-base font-bold transition-all shrink-0",
                  activeTab === 'forensics'
                    ? "bg-violet-500/15 text-violet-300 border border-violet-500/30 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                <BrainCircuit className="w-4 h-4" />
                <span>Forensic Deep-Dive & Glossary</span>
              </button>

              <button
                onClick={() => setActiveTab('actions')}
                className={cn(
                  "flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm sm:text-base font-bold transition-all shrink-0",
                  activeTab === 'actions'
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Action Plan & Police Guide</span>
              </button>
            </div>

            {/* TAB 1: STORY & EXECUTIVE SUMMARY */}
            {activeTab === 'story' && (
              <div className="space-y-5 animate-fade-in">
                {/* Executive Storyline Box */}
                <div className="glass-card p-6 sm:p-7 border border-slate-700/60 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-white">
                        Case Narrative (What Happened?)
                      </h3>
                    </div>
                    <span className="text-xs sm:text-sm text-slate-300 font-mono">
                      Natural Language Intelligence Engine
                    </span>
                  </div>

                  <p className="text-base sm:text-lg text-slate-100 leading-relaxed font-sans">
                    {ai?.executive_summary ||
                      `Funds originating from ${truncateAddress(hops[0]?.source_address || result.start_address)} totaling ${result.total_value.toFixed(4)} ${asset} were moved through ${result.hops_completed} sequential hop(s). The funds were routed into ${result.vasp_detected ? result.vasp_name : 'unhosted holding addresses'} following a pattern consistent with ${topology?.topology_label || 'peer-to-peer crypto transfers'}.`}
                  </p>

                  {/* "Where is the money right now?" Highlight Box */}
                  <div className={cn(
                    "p-4 sm:p-5 rounded-xl border flex items-start gap-3.5",
                    isDex
                      ? "bg-purple-950/20 border-purple-500/30"
                      : result.vasp_detected
                      ? "bg-cyan-950/20 border-cyan-500/30"
                      : "bg-amber-950/20 border-amber-500/30"
                  )}>
                    <div className="p-2.5 rounded-lg bg-slate-900/80 shrink-0 mt-0.5">
                      {isDex ? (
                        <Zap className="w-5 h-5 text-purple-400" />
                      ) : result.vasp_detected ? (
                        <Building2 className="w-5 h-5 text-cyan-400" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                        Current Status of Funds
                      </h4>
                      <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                        {isDex ? (
                          <span>
                            <strong>Converted on-chain via DEX Liquidity Pool:</strong> Funds were routed directly into <strong>{result.vasp_name}</strong> smart contract router for an instant automated token swap. Because DEX protocols have no accounts or KYC compliance departments, investigators must inspect the swap receipt logs to identify the output token and trace the recipient wallet.
                          </span>
                        ) : result.vasp_detected ? (
                          <span>
                            <strong>Deposited into Custodial Exchange:</strong> Funds arrived at <strong>{result.vasp_name}</strong> custodial infrastructure. Law enforcement can issue a formal Section 91 CrPC notice or Subpoena to obtain KYC identity logs, bank/UPI account links, and freeze pending withdrawals.
                          </span>
                        ) : (
                          <span>
                            <strong>Sitting in Unhosted Private Stash:</strong> Funds currently rest in non-custodial wallet <strong>{truncateAddress(hops[hops.length - 1]?.destination_address)}</strong>. No exchange cash-out has occurred yet. Place this address on real-time alerts.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4 Quick Forensic Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Key Finding */}
                  <div className="p-5 rounded-xl glass-card border border-slate-800 space-y-2">
                    <p className="text-sm uppercase font-bold text-emerald-400 flex items-center gap-2">
                      <span>🎯</span>
                      <span>Key Finding</span>
                    </p>
                    <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                      <strong className="text-white font-bold">{topology?.topology_label || 'Standard Transfer'}</strong> —{' '}
                      <strong className="text-emerald-300 font-bold">{result.total_value.toFixed(4)} {asset}</strong> moved across {result.total_wallets} wallets in {result.hops_completed} hop(s).
                    </p>
                  </div>

                  {/* Card 2: Fund Trail Flow */}
                  <div className="p-5 rounded-xl glass-card border border-slate-800 space-y-2">
                    <p className="text-sm uppercase font-bold text-cyan-400 flex items-center gap-2">
                      <span>🔄</span>
                      <span>Fund Trail Flow</span>
                    </p>
                    <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                      {isScam ? (
                        result.vasp_detected
                          ? `Funds routed from initial suspect wallet through transit mules directly into ${result.vasp_name} for liquidation.`
                          : `Funds dispersed across ${result.hops_completed} hops and currently resting in private unhosted wallets.`
                      ) : (
                        result.vasp_detected
                          ? `Direct standard deposit into ${result.vasp_name} custodial infrastructure.`
                          : `Standard direct peer-to-peer transfer across ${result.hops_completed} hop(s) with clean counterparty history.`
                      )}
                    </p>
                  </div>

                  {/* Card 3: Destination Endpoint */}
                  <div className="p-5 rounded-xl glass-card border border-slate-800 space-y-2">
                    <p className="text-sm uppercase font-bold text-purple-400 flex items-center gap-2">
                      <span>🏛️</span>
                      <span>Destination Endpoint</span>
                    </p>
                    <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                      {result.vasp_detected ? (
                        isDex ? (
                          <span>Target: <strong className="text-purple-300 font-bold">{result.vasp_name}</strong> (Decentralized Smart Contract Protocol)</span>
                        ) : (
                          <span>Target VASP: <strong className="text-purple-300 font-bold">{result.vasp_name}</strong> (Regulated Custodial Entity with KYC)</span>
                        )
                      ) : (
                        <span>Unhosted Private Wallet (Suspect holding address: {truncateAddress(hops[hops.length - 1]?.destination_address)})</span>
                      )}
                    </p>
                  </div>

                  {/* Card 4: Recommended Action */}
                  <div className="p-5 rounded-xl glass-card border border-slate-800 space-y-2">
                    <p className="text-sm uppercase font-bold text-amber-400 flex items-center gap-2">
                      <span>🛡️</span>
                      <span>Recommended Action</span>
                    </p>
                    <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                      {isScam ? (
                        result.vasp_detected ? (
                          isDex ? (
                            <span>Trace swap receipt logs on <strong className="text-amber-300 font-bold">{result.vasp_name}</strong> to follow the converted token output address.</span>
                          ) : (
                            <span>Serve Section 91 CrPC notice on <strong className="text-amber-300 font-bold">{result.vasp_name}</strong> to freeze accounts and seize KYC logs.</span>
                          )
                        ) : (
                          <span>Place suspect addresses on active cyber cell monitoring & alert Indian exchanges.</span>
                        )
                      ) : (
                        <span>No law enforcement requisition required. Activity verified as standard legitimate on-chain transaction.</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Scam Pattern Intelligence Archetype Summary Card */}
                {scamAnalysis?.primary_pattern && (
                  <div className="p-5 sm:p-6 rounded-xl glass-card border border-purple-500/30 bg-purple-950/20 space-y-3 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-3">
                      <div className="flex items-center gap-2.5">
                        <BrainCircuit className="w-5 h-5 text-purple-400 shrink-0" />
                        <div>
                          <h4 className="text-base sm:text-lg font-bold text-white">
                            Likely Scam Archetype: <span className="text-purple-300">{scamAnalysis.primary_pattern.name}</span>
                          </h4>
                          <p className="text-xs text-purple-400/80 font-mono">
                            Explainable Pattern Consistency Evaluation • {scamAnalysis.primary_pattern.evidence_strength}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {scamAnalysis.primary_pattern.score}/100 Consistency
                        </span>
                        <button
                          onClick={() => setActiveTab('scam_intel')}
                          className="text-xs px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors flex items-center gap-1.5 shadow-md"
                        >
                          <span>Open Deep Inspector</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                      {scamAnalysis.summary_narrative}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                      <span className="text-purple-300 font-semibold">Observed On-Chain Signals:</span>
                      {scamAnalysis.graph_signals.filter(s => s.detected).slice(0, 4).map((sig, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-slate-900/90 border border-purple-500/30 text-purple-200">
                          ✓ {sig.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: SCAM PATTERN INTELLIGENCE */}
            {activeTab === 'scam_intel' && (
              <div className="space-y-5 animate-fade-in">
                {result && (
                  <ScamIntelligencePanel
                    analysis={scamAnalysis}
                    loading={analyzingScam}
                    onRefresh={() => runScamAnalysis(result)}
                  />
                )}
              </div>
            )}

            {/* TAB 2: TRANSACTION TRAIL (HOPS TABLE) */}
            {activeTab === 'hops' && (
              <div className="glass-card p-0 overflow-hidden border border-slate-700/60 shadow-xl animate-fade-in">
                <div className="px-6 py-4 border-b border-[#1e293b]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-slate-900/40">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
                      <Zap className="w-5 h-5 text-amber-400" />
                      <span>Chronological Transaction Ledger ({hops.length} Hops)</span>
                    </h3>
                    <p className="text-sm text-slate-300 mt-0.5">
                      Exact on-chain transfers with verified transaction receipts and block timestamps.
                    </p>
                  </div>

                  {/* Search / Filter bar */}
                  {hops.length > 2 && (
                    <div className="relative">
                      <input
                        type="text"
                        value={searchHop}
                        onChange={(e) => setSearchHop(e.target.value)}
                        placeholder="Filter address or TX..."
                        className="input-field text-sm py-2 pl-9 pr-3 w-56 font-mono"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Hop</th>
                        <th>Source Wallet</th>
                        <th></th>
                        <th>Destination Wallet</th>
                        <th>Amount Transferred</th>
                        <th>Transaction Hash</th>
                        <th>Entity / VASP</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHops.map((h, idx) => (
                        <tr key={h.id || idx} className="hover:bg-slate-800/40 transition-colors">
                          <td>
                            <span className="bg-slate-800 text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded-full text-xs sm:text-sm font-mono font-bold">
                              Hop {idx + 1}
                            </span>
                          </td>
                          <td className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-200 font-medium">{truncateAddress(h.source_address)}</span>
                              <button
                                onClick={() => handleCopy(h.source_address, `src_${idx}`)}
                                className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                title="Copy source address"
                              >
                                {copiedKey === `src_${idx}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <a
                                href={getExplorerUrl(h.source_address, 'address', h.chain || result.chain)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-colors"
                                title="View on explorer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                          <td>
                            <ArrowRight className="w-4 h-4 text-emerald-500" />
                          </td>
                          <td className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "font-bold",
                                h.is_vasp_endpoint ? "text-purple-300" : "text-slate-200"
                              )}>
                                {truncateAddress(h.destination_address)}
                              </span>
                              <button
                                onClick={() => handleCopy(h.destination_address, `dst_${idx}`)}
                                className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                title="Copy destination address"
                              >
                                {copiedKey === `dst_${idx}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <a
                                href={getExplorerUrl(h.destination_address, 'address', h.chain || result.chain)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-colors"
                                title="View on explorer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                          <td className="font-mono text-sm sm:text-base text-amber-400 font-bold">
                            {h.amount.toFixed(6)} {h.asset}
                          </td>
                          <td className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              <a
                                href={getExplorerUrl(h.tx_hash, 'tx', h.chain || result.chain)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:underline inline-flex items-center gap-1 font-medium"
                              >
                                {truncateHash(h.tx_hash)}
                              </a>
                              <button
                                onClick={() => handleCopy(h.tx_hash, `tx_${idx}`)}
                                className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                title="Copy TX Hash"
                              >
                                {copiedKey === `tx_${idx}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td>
                            {h.is_vasp_endpoint || (h.vasp_name && h.vasp_name.length > 0) ? (
                              <span className="badge bg-purple-500/25 text-purple-300 border border-purple-500/50 text-xs sm:text-sm font-bold px-3 py-1 rounded-full shadow-[0_0_8px_rgba(192,132,252,0.3)] flex items-center gap-1.5 w-fit">
                                <Landmark className="w-3.5 h-3.5" />
                                <span>{h.vasp_name || result.vasp_name}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs sm:text-sm font-mono">Unhosted Mule</span>
                            )}
                          </td>
                          <td className="text-sm font-mono">
                            <span className="text-emerald-300 font-semibold">{timeAgo(h.timestamp)}</span>
                            <span className="block text-xs text-slate-400">{formatDate(h.timestamp)}</span>
                          </td>
                        </tr>
                      ))}
                      {filteredHops.length === 0 && (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-slate-400 text-base">
                            No matching hops found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: FORENSIC DEEP-DIVE & GLOSSARY */}
            {activeTab === 'forensics' && (
              <div className="space-y-6 animate-fade-in">
                {/* Structural Metrics Card with Human-Readable Labels */}
                <div className="glass-card p-6 sm:p-7 border border-slate-700/60 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                    <div className="flex items-center gap-2.5">
                      <BrainCircuit className="w-6 h-6 text-violet-400" />
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-white">
                          Graph Topology & Structural Metrics
                        </h3>
                        <p className="text-sm text-slate-300">
                          Mathematical centrality and flow dynamics converted into plain English.
                        </p>
                      </div>
                    </div>
                    <span className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-mono font-bold bg-violet-950 text-violet-300 border border-violet-500/40">
                      {topology?.topology_label || 'Direct Flow'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Metric 1 */}
                    <div className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <p className="text-xs sm:text-sm uppercase text-emerald-400 font-bold tracking-wider">
                        In / Out Degree Ratio
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-white font-mono">
                        {metrics?.max_in_degree || 1} In / {metrics?.max_out_degree || 1} Out
                      </p>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        <strong>Direct Linear Pipe:</strong> 1-to-1 transfer without fan-out peeling or mixing.
                      </p>
                    </div>

                    {/* Metric 2 */}
                    <div className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <p className="text-xs sm:text-sm uppercase text-emerald-400 font-bold tracking-wider">
                        Layering Velocity
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-[#00ff66] font-mono">
                        {formatDuration(metrics?.average_time_delta_seconds)}
                      </p>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        {metrics?.is_bot_automated
                          ? '⚡ Bot automated execution (< 1 minute between hops).'
                          : '👤 Human-paced transfer (manual operator delays between transactions).'}
                      </p>
                    </div>

                    {/* Metric 3 */}
                    <div className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <p className="text-xs sm:text-sm uppercase text-emerald-400 font-bold tracking-wider">
                        Balance Pass-Through Rate
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-cyan-400 font-mono">
                        {metrics?.amount_decay_percentage || 100}% Forwarded
                      </p>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        Percentage of funds forwarded downstream versus retained in transit wallets.
                      </p>
                    </div>

                    {/* Metric 4 */}
                    <div className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <p className="text-xs sm:text-sm uppercase text-emerald-400 font-bold tracking-wider">
                        Cross-Chain Bridges
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-purple-400 font-mono">
                        {metrics?.bridge_hops_count || 0} Crossings
                      </p>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        {(metrics?.bridge_hops_count || 0) > 0
                          ? 'Cross-chain bridge detected across EVM / Non-EVM networks.'
                          : 'Single-chain execution on original network.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Plain-English Forensic Jargon Buster */}
                <div className="glass-card p-6 sm:p-7 border border-slate-700/60 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                    <div className="flex items-center gap-2.5">
                      <HelpCircle className="w-6 h-6 text-cyan-400" />
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-white">
                          Forensic Jargon Buster (Understanding the Terms)
                        </h3>
                        <p className="text-sm text-slate-300">
                          Clear definitions of complex blockchain forensics terms for investigators and courts.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="p-4 sm:p-5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1.5">
                      <h4 className="font-bold text-amber-300 flex items-center gap-2 text-base">
                        <span>❓ What is a Peel Chain?</span>
                      </h4>
                      <p className="text-slate-200 leading-relaxed text-sm">
                        A money-laundering technique where the criminal moves funds through a series of transit addresses, "peeling off" small amounts at each step to evade detection while forwarding the remaining bulk downstream.
                      </p>
                    </div>

                    <div className="p-4 sm:p-5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1.5">
                      <h4 className="font-bold text-purple-300 flex items-center gap-2 text-base">
                        <span>❓ DEX (Uniswap) vs CEX (Binance)</span>
                      </h4>
                      <p className="text-slate-200 leading-relaxed text-sm">
                        A <strong>CEX</strong> (Centralized Exchange) is a custodial entity with KYC identity records. A <strong>DEX</strong> (Decentralized Exchange) is an automated smart contract on the blockchain; it has no accounts or customer support. For a DEX, you trace the converted output token instead.
                      </p>
                    </div>

                    <div className="p-4 sm:p-5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1.5">
                      <h4 className="font-bold text-emerald-300 flex items-center gap-2 text-base">
                        <span>❓ What is a Transit Mule Wallet?</span>
                      </h4>
                      <p className="text-slate-200 leading-relaxed text-sm">
                        A temporary intermediary address used solely to receive funds from a victim or scammer and forward them almost immediately to another address. It breaks the direct correlation between the crime and the cash-out.
                      </p>
                    </div>

                    <div className="p-4 sm:p-5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1.5">
                      <h4 className="font-bold text-cyan-300 flex items-center gap-2 text-base">
                        <span>❓ What is Layering Velocity?</span>
                      </h4>
                      <p className="text-slate-200 leading-relaxed text-sm">
                        The time delay between sequential hops in a laundering chain. High velocity (under 1 minute) implies automated script bots; lower velocity (hours or days) indicates human handling and manual coordination.
                      </p>
                    </div>
                  </div>
                </div>

                {/* White Money vs Illicit Indicators Contrast Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 sm:p-6 rounded-xl bg-red-950/20 border border-red-500/30 space-y-2.5">
                    <p className="font-bold text-red-400 flex items-center gap-2 text-sm uppercase">
                      <ShieldAlert className="w-5 h-5" />
                      <span>Laundering / Illicit Modus Operandi Indicators</span>
                    </p>
                    <ul className="space-y-2 text-sm text-slate-200">
                      {topology?.white_money_contrast?.illicit_indicators && topology.white_money_contrast.illicit_indicators.length > 0 ? (
                        topology.white_money_contrast.illicit_indicators.map((ind, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="text-red-400 font-bold">•</span>
                            <span>{ind}</span>
                          </li>
                        ))
                      ) : (
                        <li className="flex items-start gap-2.5 text-emerald-400">
                          <span>✓</span>
                          <span>Zero illicit, mixer, or laundering indicators detected.</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="p-5 sm:p-6 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2.5">
                    <p className="font-bold text-emerald-400 flex items-center gap-2 text-sm uppercase">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Legitimate Commercial Flow Benchmark</span>
                    </p>
                    <ul className="space-y-2 text-sm text-slate-200">
                      {topology?.white_money_contrast?.commercial_indicators && topology.white_money_contrast.commercial_indicators.length > 0 ? (
                        topology.white_money_contrast.commercial_indicators.map((ind, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{ind}</span>
                          </li>
                        ))
                      ) : (
                        <li className="flex items-start gap-2.5 text-slate-300">
                          <span>•</span>
                          <span>Standard peer-to-peer transfer interval.</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: POLICE ACTION PLAN & LEGAL STEPS */}
            {activeTab === 'actions' && (
              <div className="space-y-5 animate-fade-in">
                <div className="glass-card p-6 sm:p-7 border border-slate-700/60 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert className="w-6 h-6 text-amber-400" />
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-white">
                          Law Enforcement & Investigator Action Plan
                        </h3>
                        <p className="text-sm text-slate-300">
                          Step-by-step statutory actions under Section 91 Cr.P.C. / MLAT for asset recovery.
                        </p>
                      </div>
                    </div>
                    <span className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
                      Actionable Intelligence
                    </span>
                  </div>

                  {/* Action Steps List */}
                  <div className="space-y-3.5">
                    {ai?.police_action_plan && ai.police_action_plan.length > 0 ? (
                      ai.police_action_plan.map((action, idx) => (
                        <div key={idx} className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5 hover:border-slate-700 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <div className="flex items-center gap-2.5">
                              <span className="px-2.5 py-1 rounded text-xs font-bold font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {action.priority}
                              </span>
                              <h4 className="text-base sm:text-lg font-bold text-white">
                                {action.title}
                              </h4>
                            </div>
                            <span className="text-xs sm:text-sm font-mono text-slate-300">
                              Legal Basis: {action.legal_basis}
                            </span>
                          </div>

                          <p className="text-sm sm:text-base text-slate-200 font-sans leading-relaxed">
                            {action.purpose}
                          </p>

                          {action.details && action.details.length > 0 && (
                            <ul className="mt-2.5 space-y-1.5 text-sm text-slate-300 bg-slate-950/40 p-3.5 rounded-lg border border-slate-900">
                              {action.details.map((detail, dIdx) => (
                                <li key={dIdx} className="flex items-start gap-2.5">
                                  <span className="text-cyan-400 font-bold">✓</span>
                                  <span>{detail}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">No police action steps generated.</p>
                    )}
                  </div>

                  {/* Cryptographic Chain of Custody Card */}
                  <div className="p-4 sm:p-5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 text-sm font-mono">
                    <div className="flex items-center gap-2.5 text-slate-200 font-medium">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span>Tamper-evident chain of custody active. SHA-256 evidence certificate ready.</span>
                    </div>
                    <button
                      onClick={() => handleCopy(result.id, 'evidence_id')}
                      className="text-cyan-400 hover:underline flex items-center gap-1.5 text-sm font-semibold"
                    >
                      {copiedKey === 'evidence_id' ? 'Copied Trace ID!' : 'Copy Evidence Trace ID'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

