'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { tracingAPI, blockchainAPI } from '@/lib/api';
import { truncateAddress, truncateHash, cn, timeAgo } from '@/lib/utils';
import type { TraceDetail, TraceHop, TraceStatus } from '@/types';
import {
  Search, Play, Loader2, CheckCircle2, XCircle, Network,
  ArrowRight, Zap, ChevronDown, ChevronUp, Eye,
} from 'lucide-react';

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

  const startTrace = async () => {
    if (!input.trim()) return;
    setError('');
    setTracing(true);
    setResult(null);
    setHops([]);
    setStatus(null);

    try {
      // Auto-detect chain if needed
      let detectedChain = chain;
      if (!detectedChain) {
        try {
          const idRes = await blockchainAPI.identify(input.trim());
          if (idRes.data.chain) {
            detectedChain = idRes.data.chain;
            setChain(detectedChain);
          }
        } catch {}
      }

      const trimmed = input.trim();
      const isTx = (trimmed.startsWith('0x') && trimmed.length === 66) || (!trimmed.startsWith('0x') && trimmed.length === 64);
      const res = await tracingAPI.start({
        tx_hash: isTx ? trimmed : '',
        address: !isTx ? trimmed : '',
        chain: detectedChain,
        max_hops: maxHops,
        direction,
      });
      setTraceId(res.data.trace_id);
      pollStatus(res.data.trace_id);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || 'Failed to start trace.');
      setTracing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Search className="w-6 h-6 text-cyan-400" />
          TXID Tracer
        </h1>
        <p className="text-sm text-slate-400 mt-1">Trace blockchain fund flows from any transaction or address</p>
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
              placeholder="Enter transaction hash (TXID) or wallet address..."
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
            <span>Quick Demonstration Scenarios (Pre-configured Multi-Hop Cases):</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setInput('0xe19bc4e3113382f59b61296c87cf69bef8ea584d4b94852f5bcd28c2fb8ea06d');
                setChain('sepolia');
                setMaxHops(5);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/70 border border-[#00ff66]/50 text-[#00ff66] text-xs font-mono font-bold transition-colors shadow-[0_0_10px_rgba(0,255,102,0.2)]"
            >
              ⚡ 1. Live MetaMask Sepolia Trace (Victim 0x0564 &rarr; Scammer 0x9272 &rarr; Uniswap)
            </button>
            <button
              type="button"
              onClick={() => {
                setInput('0xdemo_tx_001_initial_victim_deposit');
                setChain('ethereum');
                setMaxHops(5);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#041d0e] hover:bg-[#072d16] border border-[#0d331d] text-emerald-300 text-xs font-mono transition-colors"
            >
              2. Multi-Victim Scam & Mule Layering (5 Hops)
            </button>
            <button
              type="button"
              onClick={() => {
                setInput('0xdemo_sepolia_phishing_drainer_test');
                setChain('sepolia');
                setMaxHops(4);
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-950/30 hover:bg-amber-950/50 border border-amber-500/40 text-amber-300 text-xs font-mono transition-colors"
            >
              3. Sepolia Testnet Phishing Prototype (4 Hops)
            </button>
            <button
              type="button"
              onClick={() => {
                setInput('0x5u5pect01eee6666777788889999000011112222');
                setChain('ethereum');
                setMaxHops(5);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#041d0e] hover:bg-[#072d16] border border-[#0d331d] text-emerald-300 text-xs font-mono transition-colors"
            >
              4. Suspect Syndicate Nexus & Binance Cashout
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
                <option value="">Auto-detect</option>
                <option value="ethereum">Ethereum (Mainnet)</option>
                <option value="sepolia">Ethereum Sepolia (100% Free Testnet)</option>
                <option value="bitcoin">Bitcoin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Direction</label>
              <select value={direction} onChange={(e) => setDirection(e.target.value)} className="input-field text-xs">
                <option value="forward">Forward (follow funds)</option>
                <option value="backward">Backward (find source)</option>
                <option value="both">Both directions</option>
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
            {/* Sepolia / Mainnet Indicator */}
            <div className={cn(
              "p-3 rounded-lg border text-xs font-mono mb-4 flex items-center justify-between gap-2",
              result.chain.toLowerCase() === 'sepolia' || result.graph_data?.ai_analysis?.is_sepolia
                ? "bg-amber-950/40 border-amber-500/50 text-amber-200"
                : "bg-[#042412]/80 border-[#00ff66]/40 text-emerald-200"
            )}>
              <div className="flex items-center gap-2">
                <span className="font-bold">
                  {result.chain.toLowerCase() === 'sepolia' || result.graph_data?.ai_analysis?.is_sepolia
                    ? "PROTOTYPE DEMONSTRATION MODE (Sepolia Testnet)"
                    : "LIVE MAINNET ASSET TRACE"}
                </span>
                <span className="text-[11px] text-slate-300">
                  {result.chain.toLowerCase() === 'sepolia' || result.graph_data?.ai_analysis?.is_sepolia
                    ? "— Zero real financial loss ('Not a real issue'). AI heuristics demonstrate real scam mechanics for law enforcement."
                    : "— Live cryptocurrency asset trail."}
                </span>
              </div>
              {result.graph_data?.ai_analysis && (
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold">
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
                  {hops.map((h) => (
                    <tr key={h.id}>
                      <td><span className="bg-[#1e293b] text-slate-300 px-2 py-0.5 rounded text-xs font-mono">{h.hop_number}</span></td>
                      <td className="font-mono text-xs text-slate-300">{truncateAddress(h.source_address)}</td>
                      <td><ArrowRight className="w-4 h-4 text-emerald-500" /></td>
                      <td className="font-mono text-xs text-slate-300">{truncateAddress(h.destination_address)}</td>
                      <td className="font-mono text-xs text-amber-400">{h.amount.toFixed(6)} {h.asset}</td>
                      <td className="font-mono text-xs text-cyan-400">{truncateHash(h.tx_hash)}</td>
                      <td>
                        {h.is_vasp_endpoint ? (
                          <span className="badge bg-purple-500/20 text-purple-400 border-purple-500/40 text-xs">{h.vasp_name}</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="text-xs text-slate-500">{timeAgo(h.timestamp)}</td>
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
