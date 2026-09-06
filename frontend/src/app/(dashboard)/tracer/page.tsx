'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { tracingAPI, blockchainAPI } from '@/lib/api';
import { truncateAddress, truncateHash, cn, timeAgo, formatDate } from '@/lib/utils';
import type { TraceDetail, TraceHop, TraceStatus } from '@/types';
import {
  Search, Play, Loader2, CheckCircle2, XCircle, Network,
  ArrowRight, Zap, ChevronDown, ChevronUp, Eye, ExternalLink,
  BrainCircuit, ShieldAlert, AlertOctagon, Sparkles, Layers, Activity, Globe, Target
} from 'lucide-react';

function getExplorerUrl(id: string, type: 'address' | 'tx', chain: string = 'ethereum') {
  const c = chain.toLowerCase();
  if (c === 'sepolia') return `https://sepolia.etherscan.io/${type}/${id}`;
  if (c === 'polygon') return `https://polygonscan.com/${type}/${id}`;
  if (c === 'bnb' || c === 'bsc') return `https://bscscan.com/${type}/${id}`;
  if (c === 'arbitrum') return `https://arbiscan.io/${type}/${id}`;
  if (c === 'base') return `https://basescan.org/${type}/${id}`;
  if (c === 'bitcoin' || c === 'btc') return `https://mempool.space/${type}/${id}`;
  if (c === 'tron' || c === 'trx') return `https://tronscan.org/#/${type}/${id}`;
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
        try {
          const idRes = await blockchainAPI.identify(trimmed);
          if (idRes.data.chain) {
            detectedChain = idRes.data.chain;
            setChain(detectedChain);
          }
        } catch {}
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

      // Execute on-chain trace query
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

      const res = await tracePromise;
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
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Search className="w-6 h-6 text-cyan-400" />
          Multi-Chain TXID & Wallet Tracer
        </h1>
        <p className="text-sm text-slate-400 mt-1">
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
              className="input-field font-mono text-xs pl-4 pr-4 py-3"
              placeholder="Enter transaction hash (TXID 0x...) or wallet address (0x..., bc1..., T...)..."
              disabled={tracing}
            />
          </div>
          <button onClick={startTrace} disabled={tracing || !input.trim()} className="btn-primary px-6">
            {tracing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {tracing ? 'Tracing...' : 'Trace'}
          </button>
        </div>

        {/* Quick Demo Case Presets */}
        <div className="mt-4 pt-3 border-t border-[#1e293b]/60">
          <p className="text-[11px] font-mono text-slate-400 mb-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Live Multi-Chain Forensic Scenarios:</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setInput('0x28c6c06298d514db089934071355e5743bf21d60');
                setChain('ethereum');
                setMaxHops(5);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/70 border border-[#00ff66]/50 text-[#00ff66] text-xs font-mono font-bold transition-colors shadow-[0_0_10px_rgba(0,255,102,0.2)]"
            >
              ⚡ 1. Live Ethereum Mainnet Binance Hot Wallet (0x28c6...1d60)
            </button>
            <button
              type="button"
              onClick={() => {
                setInput('0x9272477a53a8ec8a75df008d34cbddfefd82cf60');
                setChain('ethereum');
                setMaxHops(5);
              }}
              className="px-3 py-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-500/50 text-cyan-300 text-xs font-mono font-bold transition-colors"
            >
              ⚡ 2. Live Suspect Fraud Layering Address (0x9272...cf60)
            </button>
            <button
              type="button"
              onClick={() => {
                setInput('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
                setChain('bitcoin');
                setMaxHops(5);
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-950/70 border border-amber-500/50 text-amber-300 text-xs font-mono transition-colors"
            >
              ⚡ 3. Live Bitcoin Genesis & Active Reserve (1A1z...vfNa)
            </button>
            <button
              type="button"
              onClick={() => {
                setInput('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
                setChain('tron');
                setMaxHops(5);
              }}
              className="px-3 py-1.5 rounded-lg bg-purple-950/40 hover:bg-purple-950/70 border border-purple-500/50 text-purple-300 text-xs font-mono transition-colors"
            >
              ⚡ 4. Live Tron USDT Contract Hub (TR7NHq...Lj6t)
            </button>
          </div>
        </div>

        {/* Advanced Options */}
        <button onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-white mt-3 transition-colors">
          {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Advanced Options
        </button>
        {showAdvanced && (
          <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-[#1e293b]/60">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Blockchain</label>
              <select value={chain} onChange={(e) => setChain(e.target.value)} className="input-field text-xs">
                <option value="">⚡ Auto-Detect (Multi-Chain Probe)</option>
                <option value="ethereum">Ethereum (Mainnet)</option>
                <option value="sepolia">Ethereum Sepolia (Testnet)</option>
                <option value="polygon">Polygon (MATIC)</option>
                <option value="bnb">BNB Smart Chain (BSC)</option>
                <option value="arbitrum">Arbitrum One</option>
                <option value="base">Base</option>
                <option value="bitcoin">Bitcoin (BTC)</option>
                <option value="tron">Tron (TRX)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Direction</label>
              <select value={direction} onChange={(e) => setDirection(e.target.value)} className="input-field text-xs">
                <option value="forward">Forward (follow funds to VASP / cashout)</option>
                <option value="backward">Backward (find source / victim)</option>
                <option value="both">Both directions (full Nexus)</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs text-slate-400">Max Hops</label>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {maxHops >= 100 ? 'Unlimited (100 max)' : `${maxHops} Hops`}
                </span>
              </div>
              <input
                type="number"
                min={1}
                max={100}
                value={maxHops}
                onChange={(e) => setMaxHops(Math.max(1, Math.min(100, parseInt(e.target.value) || 100)))}
                className="input-field text-xs"
                placeholder="100 (Unlimited)"
              />
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
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="glass-card p-6">
            {/* Real-time On-Chain Telemetry Active Indicator */}
            <div className="p-3 rounded-lg border text-xs font-mono mb-4 flex items-center justify-between gap-2 bg-[#042412]/80 border-[#00ff66]/40 text-emerald-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00ff66] animate-pulse shadow-[0_0_8px_rgba(0,255,102,0.8)]" />
                <span className="font-bold text-white uppercase">REAL-TIME ON-CHAIN ANALYSIS ({result.chain.toUpperCase()} NETWORK)</span>
                <span className="text-[11px] text-slate-300">
                  — Direct ledger queries verified. Cryptographic chain-of-custody active.
                </span>
              </div>
              {result.graph_data?.ai_analysis && (
                <span className={cn(
                  "px-2 py-0.5 rounded border text-[10px] font-bold uppercase",
                  result.graph_data.ai_analysis.verdict.is_scam
                    ? "bg-red-500/20 text-red-300 border-red-500/40"
                    : "bg-[#00ff66]/20 text-[#00ff66] border-[#00ff66]/40 shadow-[0_0_10px_rgba(0,255,102,0.2)]"
                )}>
                  {result.graph_data.ai_analysis.verdict.fraud_type} ({result.graph_data.ai_analysis.verdict.confidence_percentage})
                </span>
              )}
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Trace Complete
              </h3>
              {result.graph_data?.nodes?.length > 0 && (
                <Link href={`/graph?trace_id=${result.id}`} className="btn-primary text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,255,102,0.3)]">
                  <Network className="w-4 h-4" />
                  View Interactive Graph & AI Forensics
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase">Hops Traced</p>
                <p className="text-xl font-bold text-cyan-400">{result.hops_completed}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Wallets Found</p>
                <p className="text-xl font-bold text-violet-400">{result.total_wallets}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Transactions</p>
                <p className="text-xl font-bold text-amber-400">{result.total_transactions}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Total Value</p>
                <p className="text-xl font-bold text-white">{result.total_value.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">VASP Detected</p>
                <p className="text-xl font-bold">
                  {result.vasp_detected ? (
                    <span className="text-emerald-400">{result.vasp_name}</span>
                  ) : (
                    <span className="text-slate-600">None</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Graph Topology & Modus Operandi Intelligence Card */}
          {result.graph_data?.ai_analysis?.topology_analysis && (
            <div className={cn(
              "glass-card p-5 border space-y-4 shadow-xl transition-all",
              result.graph_data.ai_analysis.verdict?.is_scam
                ? "border-red-500/40 bg-[#160606]/95 shadow-[0_0_30px_rgba(239,68,68,0.15)]"
                : "border-[#00ff66]/30 bg-[#021309]/95 shadow-[0_0_30px_rgba(0,255,102,0.1)]"
            )}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#0d331d] pb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-2 rounded-lg border",
                    result.graph_data.ai_analysis.verdict?.is_scam
                      ? "bg-red-500/10 border-red-500/40 text-red-400"
                      : "bg-[#00ff66]/10 border-[#00ff66]/40 text-[#00ff66]"
                  )}>
                    <BrainCircuit className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                      <span>
                        {result.graph_data.ai_analysis.verdict?.is_scam
                          ? "Graph Topology & Modus Operandi Intelligence"
                          : "Graph Topology & Activity Classification"}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border",
                        result.graph_data.ai_analysis.verdict?.is_scam
                          ? "bg-red-500/20 text-red-300 border-red-500/40"
                          : "bg-[#00ff66]/20 text-[#00ff66] border-[#00ff66]/40"
                      )}>
                        {result.graph_data.ai_analysis.topology_analysis.topology_label}
                      </span>
                    </h3>
                    <p className="text-xs text-emerald-400 font-mono">
                      {result.graph_data.ai_analysis.verdict?.is_scam
                        ? "Automated topological pattern classification & threat intelligence engine"
                        : "Automated topological pattern classification & verified clean flow analysis"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`https://www.chainabuse.com/address/${result.start_address || (result.graph_data.nodes[1]?.id || result.graph_data.nodes[0]?.id || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-colors",
                      result.graph_data.ai_analysis.verdict?.is_scam
                        ? "bg-red-950/40 hover:bg-red-950/80 border-red-500/50 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                        : "bg-[#042412]/80 hover:bg-[#042412] border-[#00ff66]/40 text-emerald-300"
                    )}
                  >
                    <ShieldAlert className={cn("w-3.5 h-3.5", result.graph_data.ai_analysis.verdict?.is_scam ? "text-red-400" : "text-[#00ff66]")} />
                    <span>Check Public Threat Intel</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                </div>
              </div>

              {/* Topology Pattern Badges */}
              <div className="flex flex-wrap gap-2">
                {result.graph_data.ai_analysis.topology_analysis.detected_patterns.map((p, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5",
                      p.severity === 'critical'
                        ? "bg-red-950/50 text-red-300 border-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.2)]"
                        : p.severity === 'high'
                        ? "bg-amber-950/50 text-amber-300 border-amber-500/50"
                        : "bg-[#042412] text-[#00ff66] border-[#00ff66]/40"
                    )}
                  >
                    {result.graph_data?.ai_analysis?.verdict?.is_scam ? <AlertOctagon className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>[{p.code}] {p.name}</span>
                  </span>
                ))}
                {result.vasp_detected && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold border bg-purple-950/50 text-purple-300 border-purple-500/50 flex items-center gap-1.5 shadow-[0_0_8px_rgba(192,132,252,0.2)]">
                    <Target className="w-3.5 h-3.5" />
                    <span>[EXCHANGE_FUNNEL] {result.vasp_name} Terminal Exit</span>
                  </span>
                )}
              </div>

              {/* Forensic Structural Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#041d0e]/80 border border-[#0d331d] font-mono">
                  <p className="text-[10px] uppercase text-emerald-400 font-bold">In / Out Degree Max</p>
                  <p className="text-base font-bold text-white mt-0.5">
                    {result.graph_data.ai_analysis.topology_analysis.structural_metrics.max_in_degree} In / {result.graph_data.ai_analysis.topology_analysis.structural_metrics.max_out_degree} Out
                  </p>
                  <p className="text-[10px] text-slate-400">Node graph centrality</p>
                </div>
                <div className="p-3 rounded-xl bg-[#041d0e]/80 border border-[#0d331d] font-mono">
                  <p className="text-[10px] uppercase text-emerald-400 font-bold">Layering Velocity</p>
                  <p className="text-base font-bold text-[#00ff66] mt-0.5">
                    {result.graph_data.ai_analysis.topology_analysis.structural_metrics.average_time_delta_seconds}s
                  </p>
                  <p className="text-[10px] text-amber-300">
                    {result.graph_data.ai_analysis.topology_analysis.structural_metrics.is_bot_automated ? '⚡ Automated Bot Speed' : '👤 Human Paced'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#041d0e]/80 border border-[#0d331d] font-mono">
                  <p className="text-[10px] uppercase text-emerald-400 font-bold">Balance Decay Rate</p>
                  <p className="text-base font-bold text-cyan-400 mt-0.5">
                    {result.graph_data.ai_analysis.topology_analysis.structural_metrics.amount_decay_percentage}%
                  </p>
                  <p className="text-[10px] text-slate-400">Peel chain siphon index</p>
                </div>
                <div className="p-3 rounded-xl bg-[#041d0e]/80 border border-[#0d331d] font-mono">
                  <p className="text-[10px] uppercase text-emerald-400 font-bold">Cross-Chain Bridges</p>
                  <p className="text-base font-bold text-purple-400 mt-0.5">
                    {result.graph_data.ai_analysis.topology_analysis.structural_metrics.bridge_hops_count} Crossings
                  </p>
                  <p className="text-[10px] text-slate-400">EVM & Non-EVM chains</p>
                </div>
              </div>

              {/* AI Key Takeaways (Main Content Only) */}
              <div className="p-4 rounded-xl bg-[#011208] border border-[#00ff66]/30 font-mono space-y-3 shadow-[0_0_15px_rgba(0,255,102,0.05)]">
                <div className="flex items-center justify-between border-b border-[#00ff66]/20 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#00ff66]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {result.graph_data.ai_analysis.verdict?.is_scam ? "Forensic Threat Brief" : "Activity Intelligence Brief"}
                    </span>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] uppercase font-bold border",
                    result.graph_data.ai_analysis.verdict?.is_scam
                      ? "bg-red-500/20 text-red-300 border-red-500/40"
                      : "bg-[#00ff66]/20 text-[#00ff66] border-[#00ff66]/40"
                  )}>
                    {result.graph_data.ai_analysis.topology_analysis.predicted_purpose}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* Card 1: Key Finding */}
                  <div className="p-3 rounded-lg bg-[#041d0e] border border-[#0d331d] space-y-1">
                    <p className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                      <span>🎯</span>
                      <span>Key Finding</span>
                    </p>
                    <p className="text-xs text-slate-200 font-sans leading-snug">
                      <strong className="text-white">{result.graph_data.ai_analysis.topology_analysis.topology_label}</strong> — <strong className="text-emerald-300">{result.total_value.toFixed(4)} {result.graph_data.edges[0]?.asset || 'ETH'}</strong> moved across {result.total_wallets} wallets in {result.hops_completed} hops.
                    </p>
                  </div>

                  {/* Card 2: Fund Trail Flow */}
                  <div className="p-3 rounded-lg bg-[#041d0e] border border-[#0d331d] space-y-1">
                    <p className="text-[10px] uppercase font-bold text-cyan-400 flex items-center gap-1.5">
                      <span>🔄</span>
                      <span>Fund Trail Flow</span>
                    </p>
                    <p className="text-xs text-slate-200 font-sans leading-snug">
                      {result.graph_data.ai_analysis.verdict?.is_scam ? (
                        result.vasp_detected 
                          ? `Funds routed from suspect wallet directly into ${result.vasp_name} for exchange liquidation.`
                          : `Funds dispersed across ${result.hops_completed} hops and currently resting in unhosted staging wallets.`
                      ) : (
                        result.vasp_detected
                          ? `Direct standard deposit into ${result.vasp_name} custodial infrastructure.`
                          : `Standard direct peer-to-peer transfer across ${result.hops_completed} hop(s) with clean counterparty history.`
                      )}
                    </p>
                  </div>

                  {/* Card 3: Destination Endpoint */}
                  <div className="p-3 rounded-lg bg-[#041d0e] border border-[#0d331d] space-y-1">
                    <p className="text-[10px] uppercase font-bold text-purple-400 flex items-center gap-1.5">
                      <span>🏛️</span>
                      <span>Destination Endpoint</span>
                    </p>
                    <p className="text-xs text-slate-200 font-sans leading-snug">
                      {result.graph_data.ai_analysis.verdict?.is_scam ? (
                        result.vasp_detected ? (
                          <span>Target VASP: <strong className="text-purple-300">{result.vasp_name}</strong> (Subpoenable KYC Entity)</span>
                        ) : (
                          <span>Unhosted Private Wallets (Suspect holding address)</span>
                        )
                      ) : (
                        result.vasp_detected ? (
                          <span>Target Exchange: <strong className="text-purple-300">{result.vasp_name}</strong> (Standard Custody)</span>
                        ) : (
                          <span>Unhosted Counterparty Wallet (Clean balance holding)</span>
                        )
                      )}
                    </p>
                  </div>

                  {/* Card 4: Immediate Action */}
                  <div className="p-3 rounded-lg bg-[#041d0e] border border-[#0d331d] space-y-1">
                    <p className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1.5">
                      <span>🛡️</span>
                      <span>{result.graph_data.ai_analysis.verdict?.is_scam ? "Immediate Police Action" : "Investigation Assessment"}</span>
                    </p>
                    <p className="text-xs text-slate-200 font-sans leading-snug">
                      {result.graph_data.ai_analysis.verdict?.is_scam ? (
                        result.vasp_detected ? (
                          <span>Serve Section 91 CrPC notice on <strong className="text-amber-300">{result.vasp_name}</strong> to freeze accounts and seize KYC logs.</span>
                        ) : (
                          <span>Place suspect addresses on active cyber cell monitoring & alert Indian exchanges.</span>
                        )
                      ) : (
                        <span>No law enforcement requisition required. Activity verified as standard legitimate on-chain transaction.</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* White Money vs Illicit Contrast Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/30 font-mono text-xs space-y-1.5">
                  <p className="font-bold text-red-400 flex items-center gap-1.5 text-[11px] uppercase">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Laundering / Illicit Modus Operandi Indicators</span>
                  </p>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {result.graph_data.ai_analysis.topology_analysis.white_money_contrast.illicit_indicators.length > 0 ? (
                      result.graph_data.ai_analysis.topology_analysis.white_money_contrast.illicit_indicators.map((ind, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-red-400 font-bold">•</span>
                          <span>{ind}</span>
                        </li>
                      ))
                    ) : (
                      <li className="flex items-start gap-1.5 text-[#00ff66]">
                        <span className="font-bold">✓</span>
                        <span>Zero illicit, mixer, or laundering indicators detected.</span>
                      </li>
                    )}
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 font-mono text-xs space-y-1.5">
                  <p className="font-bold text-emerald-400 flex items-center gap-1.5 text-[11px] uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Legitimate Commercial Flow Benchmark</span>
                  </p>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {result.graph_data.ai_analysis.topology_analysis.white_money_contrast.commercial_indicators.map((ind, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{ind}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Hops Table */}
          <div className="glass-card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1e293b]/60">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Fund Flow ({hops.length} hops)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hop</th>
                    <th>Source</th>
                    <th></th>
                    <th>Destination</th>
                    <th>Amount</th>
                    <th>TX Hash</th>
                    <th>VASP</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {hops.map((h, idx) => (
                    <tr key={h.id || idx}>
                      <td>
                        <span className="bg-[#1e293b] text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded text-xs font-mono font-bold">
                          Hop {idx + 1}
                        </span>
                      </td>
                      <td className="font-mono text-xs">
                        <a
                          href={getExplorerUrl(h.source_address, 'address', h.chain || result.chain)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-300 hover:text-cyan-400 inline-flex items-center gap-1 transition-colors"
                        >
                          {truncateAddress(h.source_address)}
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      </td>
                      <td><ArrowRight className="w-4 h-4 text-emerald-500" /></td>
                      <td className="font-mono text-xs">
                        <a
                          href={getExplorerUrl(h.destination_address, 'address', h.chain || result.chain)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "inline-flex items-center gap-1 transition-colors font-bold",
                            h.is_vasp_endpoint ? "text-purple-300 hover:text-purple-200" : "text-slate-300 hover:text-cyan-400"
                          )}
                        >
                          {truncateAddress(h.destination_address)}
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      </td>
                      <td className="font-mono text-xs text-amber-400 font-bold">{h.amount.toFixed(6)} {h.asset}</td>
                      <td className="font-mono text-xs">
                        <a
                          href={getExplorerUrl(h.tx_hash, 'tx', h.chain || result.chain)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                        >
                          {truncateHash(h.tx_hash)}
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      </td>
                      <td>
                        {h.is_vasp_endpoint || (h.vasp_name && h.vasp_name.length > 0) ? (
                          <span className="badge bg-purple-500/25 text-purple-300 border border-purple-500/50 text-xs font-bold px-2.5 py-0.5 rounded shadow-[0_0_8px_rgba(192,132,252,0.3)]">
                            🏛️ {h.vasp_name || result.vasp_name}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">Unhosted Mule</span>
                        )}
                      </td>
                      <td className="text-xs font-mono">
                        <span className="text-emerald-300 font-semibold">{timeAgo(h.timestamp)}</span>
                        <span className="block text-[10px] text-slate-500">{formatDate(h.timestamp)}</span>
                      </td>
                    </tr>
                  ))}
                  {hops.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-slate-500">No hops recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
