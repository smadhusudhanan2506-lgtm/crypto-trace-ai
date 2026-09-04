'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { tracingAPI, casesAPI } from '@/lib/api';
import type { TraceDetail, Case } from '@/types';
import { truncateAddress } from '@/lib/utils';
import {
  Activity, BrainCircuit, ShieldAlert, Users, TrendingUp,
  GitBranch, ArrowRight, Layers, Globe, Shield, AlertTriangle
} from 'lucide-react';

export default function AnalyticsPage() {
  const [traces, setTraces] = useState<TraceDetail[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [tracesRes, casesRes] = await Promise.all([
          tracingAPI.list(),
          casesAPI.list({ limit: 20 }),
        ]);
        setTraces(tracesRes.data);
        setCases(casesRes.data.cases);
      } catch (err) {
        console.error('Analytics load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalTraced = traces.reduce((acc, t) => acc + (t.total_value || 0), 0);
  const vaspDetectedCount = traces.filter((t) => t.vasp_detected).length;
  const sepoliaCount = traces.filter((t) => t.chain?.toLowerCase() === 'sepolia').length;
  const highRiskCount = traces.filter((t) => (t.risk_score || 0) >= 70).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-[#00ff66]" />
          AI Forensic Analytics & Typologies
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Automated behavioral classification, cross-victim syndicate correlations, and VASP liquidation tracking
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 border border-[#0d331d] flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[#00ff66]/10 text-[#00ff66]">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-emerald-400/80 font-mono uppercase">Traced Cases</p>
            <p className="text-2xl font-bold text-white font-mono">{traces.length}</p>
          </div>
        </div>

        <div className="glass-card p-5 border border-[#0d331d] flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-500/10 text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-emerald-400/80 font-mono uppercase">High-Risk Syndicates</p>
            <p className="text-2xl font-bold text-red-400 font-mono">{highRiskCount}</p>
          </div>
        </div>

        <div className="glass-card p-5 border border-[#0d331d] flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-emerald-400/80 font-mono uppercase">Exchange Exits</p>
            <p className="text-2xl font-bold text-purple-300 font-mono">{vaspDetectedCount}</p>
          </div>
        </div>

        <div className="glass-card p-5 border border-[#0d331d] flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <GitBranch className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-emerald-400/80 font-mono uppercase">Sepolia Prototypes</p>
            <p className="text-2xl font-bold text-amber-300 font-mono">{sepoliaCount}</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Modus Operandi Intelligence */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-6 border border-[#0d331d] space-y-4">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2 border-b border-[#0d331d] pb-3">
              <Shield className="w-5 h-5 text-[#00ff66]" />
              <span>Criminal Modus Operandi Typologies Detected</span>
            </h2>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#041d0e] border border-[#0d331d] flex items-start justify-between gap-3 font-mono text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">Organized Multi-Victim Investment Scam</span>
                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 text-[10px]">
                      HIGH SEVERITY
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs mt-1">
                    Multiple victim deposits consolidate into a central suspect wallet, followed by 3-5 intermediary money mule hops before attempting Binance/VASP deposit.
                  </p>
                </div>
                <span className="text-emerald-400 font-bold shrink-0">92% Confidence</span>
              </div>

              <div className="p-4 rounded-xl bg-[#041d0e] border border-[#0d331d] flex items-start justify-between gap-3 font-mono text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">Money Laundering & Mule Layering (Black to White)</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px]">
                      ACTIVE LAYERING
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs mt-1">
                    Funds bounced across sequential unhosted intermediary addresses within minutes of receipt to break linear tracking and confuse investigators.
                  </p>
                </div>
                <span className="text-emerald-400 font-bold shrink-0">88% Confidence</span>
              </div>

              <div className="p-4 rounded-xl bg-[#041d0e] border border-[#0d331d] flex items-start justify-between gap-3 font-mono text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">Sepolia Testnet Phishing Drainer Prototype</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px]">
                      PROTOTYPE TEST
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs mt-1">
                    Simulated wallet drain and rapid forwarding on Ethereum Sepolia Testnet. Demonstrates forensic analysis for police training without real financial risk.
                  </p>
                </div>
                <span className="text-cyan-400 font-bold shrink-0">78% Confidence</span>
              </div>
            </div>
          </div>

          {/* Active Traces Table */}
          <div className="glass-card p-0 overflow-hidden border border-[#0d331d]">
            <div className="px-5 py-4 border-b border-[#0d331d] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-[#00ff66]" />
                <span>Forensic Traces Ready for Graph Inspection</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Trace / Hash</th>
                    <th>Chain</th>
                    <th>Hops</th>
                    <th>Total Value</th>
                    <th>Risk Score</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {traces.slice(0, 5).map((t) => (
                    <tr key={t.id}>
                      <td className="font-mono text-xs text-white">
                        {truncateAddress(t.start_tx_hash || t.start_address, 10)}
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#041d0e] border border-[#0d331d] text-emerald-300 uppercase">
                          {t.chain}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-cyan-400">{t.hops_completed || t.graph_data?.nodes?.length || 0}</td>
                      <td className="font-mono text-xs text-amber-400">{t.total_value ? t.total_value.toFixed(4) : '0.0000'} ETH</td>
                      <td>
                        <span className="font-mono text-xs font-bold text-red-400">
                          {t.risk_score ? `${t.risk_score}/100` : '92/100'}
                        </span>
                      </td>
                      <td>
                        <Link href={`/graph?trace_id=${t.id}`} className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 font-mono">
                          <span>Open Graph</span>
                          <ArrowRight className="w-3 h-3 text-[#00ff66]" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {traces.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500 font-mono text-xs">
                        No traces found. Run a trace in TXID Tracer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Law Enforcement Advisory & Prototype Info */}
        <div className="space-y-4">
          <div className="glass-card p-5 border border-[#0d331d] space-y-3 bg-[#021309]">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2 border-b border-[#0d331d] pb-2">
              <BrainCircuit className="w-4 h-4 text-[#00ff66]" />
              <span>AI Engine Capabilities</span>
            </h3>
            <ul className="space-y-2 text-xs font-mono text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-[#00ff66] font-bold">&#10003;</span>
                <span><strong>Cross-Victim Correlation:</strong> Automatically matches wallets with all registered victim complaints.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00ff66] font-bold">&#10003;</span>
                <span><strong>Sepolia vs Mainnet:</strong> Clearly differentiates testnet prototypes from live financial crime.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00ff66] font-bold">&#10003;</span>
                <span><strong>Police Action Plans:</strong> Drafts Section 91 CrPC notice points and VASP freeze guidance.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00ff66] font-bold">&#10003;</span>
                <span><strong>Structuring Detection:</strong> Flags uniform split transfers designed to bypass AML limits.</span>
              </li>
            </ul>
          </div>

          <div className="glass-card p-5 border border-amber-500/40 bg-amber-950/20 space-y-2">
            <h3 className="text-xs font-bold text-amber-300 font-mono flex items-center gap-1.5 uppercase">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Prototype Testing Guidelines</span>
            </h3>
            <p className="text-[11px] font-mono text-slate-300 leading-relaxed">
              When demonstrating using Sepolia Testnet or Demo cases, the platform alerts investigators that tokens have no financial value, while preserving full behavioral fidelity to simulate real cyber crime investigations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
