'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  Layers,
  Zap,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Scale,
  Crosshair,
} from 'lucide-react';
import type { ScamPatternAnalysisResult } from '@/types';
import { cn } from '@/lib/utils';

interface ScamIntelligencePanelProps {
  analysis: ScamPatternAnalysisResult | null;
  loading?: boolean;
  onRefresh?: () => void;
}

export function ScamIntelligencePanel({
  analysis,
  loading = false,
  onRefresh,
}: ScamIntelligencePanelProps) {
  const [copied, setCopied] = useState(false);
  const [showFullFeatures, setShowFullFeatures] = useState(false);

  if (loading) {
    return (
      <div className="glass-card p-6 border border-[#00ff66]/30 bg-[#021309]/90 animate-pulse space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00ff66]/20 border border-[#00ff66]/40 flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-[#00ff66] animate-spin" />
          </div>
          <div className="space-y-2">
            <div className="h-5 w-64 bg-[#00ff66]/20 rounded" />
            <div className="h-3 w-40 bg-emerald-500/20 rounded" />
          </div>
        </div>
        <div className="h-24 bg-black/40 rounded-xl border border-[#0d331d]" />
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const {
    primary_pattern,
    alternative_patterns = [],
    features,
    evidence = [],
    graph_signals = [],
    limitations = [],
    summary_narrative,
  } = analysis;

  const score = primary_pattern?.score ?? 0;
  const isHighRisk = score >= 70;
  const isMediumRisk = score >= 40 && score < 70;

  const scoreColor = isHighRisk
    ? 'text-red-400 border-red-500/50 bg-red-950/40'
    : isMediumRisk
    ? 'text-amber-400 border-amber-500/50 bg-amber-950/40'
    : 'text-[#00ff66] border-[#00ff66]/50 bg-[#042412]/80';

  const barColor = isHighRisk
    ? 'from-red-500 to-amber-500'
    : isMediumRisk
    ? 'from-amber-500 to-yellow-400'
    : 'from-[#00ff66] to-emerald-400';

  const handleCopyReport = () => {
    const reportText = [
      `=== CRYPTOTRACE AI — SCAM PATTERN INTELLIGENCE REPORT ===`,
      `Target TXID / Address: ${analysis.txid || analysis.wallet || 'N/A'}`,
      `Blockchain Network: ${(analysis.chain || 'ethereum').toUpperCase()}`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      `[PRIMARY LIKELY SCAM PATTERN]`,
      `Pattern Archetype: ${primary_pattern.name}`,
      `Pattern Consistency Score: ${score}/100 (${primary_pattern.confidence_label})`,
      `Evidence Strength: ${primary_pattern.evidence_strength}`,
      `Summary: ${primary_pattern.description}`,
      ``,
      `[WHY THIS PATTERN? — GRAPH EVIDENCE]`,
      ...evidence.map((e) => `  ${e}`),
      ``,
      `[GRAPH TOPOLOGICAL SIGNALS]`,
      ...graph_signals.map((s) => `  - ${s.name}: ${s.detected ? 'DETECTED' : 'NOT DETECTED'}`),
      ``,
      `[ALTERNATIVE PATTERNS EVALUATED]`,
      ...alternative_patterns.map((alt) => `  - ${alt.name}: ${alt.score}/100`),
      ``,
      `[STATUTORY / ANALYTICAL LIMITATIONS]`,
      ...limitations.map((lim) => `  * ${lim}`),
      `=========================================================`,
    ].join('\n');

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className={cn(
      "glass-card p-5 sm:p-6 border transition-all rounded-2xl space-y-5 shadow-2xl",
      isHighRisk
        ? "border-red-500/40 bg-gradient-to-b from-[#180505]/95 via-[#0e0303]/95 to-[#020b06]/95 shadow-[0_0_40px_rgba(239,68,68,0.18)]"
        : isMediumRisk
        ? "border-amber-500/40 bg-gradient-to-b from-[#1a1204]/95 via-[#0e0a02]/95 to-[#020b06]/95 shadow-[0_0_40px_rgba(245,158,11,0.15)]"
        : "border-[#00ff66]/35 bg-gradient-to-b from-[#031d0e]/95 via-[#021309]/95 to-[#020b06]/95 shadow-[0_0_40px_rgba(0,255,102,0.12)]"
    )}>
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e293b]/70 pb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2.5 rounded-xl border shrink-0 shadow-lg",
            scoreColor
          )}>
            <BrainCircuit className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <span>Scam Pattern Intelligence</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono uppercase bg-[#00ff66]/15 text-[#00ff66] border border-[#00ff66]/40">
                AI Heuristic Engine
              </span>
            </div>
            <p className="text-xs text-slate-300 font-mono mt-0.5">
              Explainable topological graph classification • Neutral evidentiary framework
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/70 border border-[#0d331d] text-emerald-300 text-xs font-mono font-bold transition-colors"
            >
              Re-Analyze
            </button>
          )}
          <button
            onClick={handleCopyReport}
            className="btn-primary text-xs px-3.5 py-1.5 font-mono flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,255,102,0.25)]"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Brief!' : 'Copy Intelligence Brief'}</span>
          </button>
        </div>
      </div>

      {/* 2. Primary Likely Scam Pattern Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Pattern Classification */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-xl bg-black/50 border border-[#1e293b] space-y-3 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Crosshair className="w-4 h-4 text-[#00ff66]" />
              <span>Likely Scam Pattern:</span>
            </span>
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-bold font-mono uppercase border shadow-md",
              scoreColor
            )}>
              {primary_pattern.badge}
            </span>
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {primary_pattern.name}
            </h3>
            <p className="text-sm text-slate-200 mt-2 leading-relaxed font-sans">
              {primary_pattern.description}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-black/60 border border-[#0d331d] mt-2">
            <p className="text-xs text-slate-300 font-sans italic leading-relaxed">
              &ldquo;{summary_narrative}&rdquo;
            </p>
          </div>
        </div>

        {/* Right Col: Consistency Meter & Evidence Strength */}
        <div className="p-4 sm:p-5 rounded-xl bg-black/50 border border-[#1e293b] flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
              <span>PATTERN CONSISTENCY:</span>
              <span className="font-bold text-white text-sm">{score} / 100</span>
            </div>

            {/* Visual Progress Meter */}
            <div className="w-full bg-slate-900 rounded-full h-3.5 p-0.5 border border-slate-700/60 overflow-hidden shadow-inner">
              <div
                className={cn("h-full rounded-full transition-all duration-1000 bg-gradient-to-r", barColor)}
                style={{ width: `${Math.max(8, score)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono mt-2 text-slate-400">
              <span>Confidence:</span>
              <span className="font-bold text-white">{primary_pattern.confidence_label}</span>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono mt-1 text-slate-400">
              <span>Evidence Strength:</span>
              <span className={cn(
                "font-bold uppercase px-2 py-0.5 rounded text-[10px] border",
                primary_pattern.evidence_strength === 'High' ? 'bg-red-950 text-red-300 border-red-500/40' :
                primary_pattern.evidence_strength === 'Medium' ? 'bg-amber-950 text-amber-300 border-amber-500/40' :
                'bg-emerald-950 text-emerald-300 border-[#00ff66]/40'
              )}>
                {primary_pattern.evidence_strength}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1e293b] text-xs font-mono text-slate-400 flex items-center justify-between">
            <span>Graph Nodes: <strong className="text-white">{features?.total_nodes || 0}</strong></span>
            <span>Hops: <strong className="text-white">{features?.max_hop_depth || 0}</strong></span>
          </div>
        </div>
      </div>

      {/* 3. Why This Pattern? (Evidence Checkmarks) & Graph Signals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evidence Findings */}
        <div className="p-4 sm:p-5 rounded-xl bg-black/50 border border-[#1e293b] space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-emerald-400">
            <CheckCircle2 className="w-4 h-4 text-[#00ff66]" />
            <span>Why This Pattern? (Graph-Derived Evidence):</span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {evidence.length > 0 ? (
              evidence.map((point, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-[#021309] border border-[#00ff66]/20 flex items-start gap-2.5">
                  <span className="text-[#00ff66] font-bold text-sm shrink-0 mt-0.5">✓</span>
                  <span className="text-xs sm:text-sm text-slate-200 font-sans leading-relaxed">
                    {point.replace(/^✓\s*/, '')}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 font-mono">No distinguishing evidentiary signals detected.</p>
            )}
          </div>
        </div>

        {/* Graph Signals Pills */}
        <div className="p-4 sm:p-5 rounded-xl bg-black/50 border border-[#1e293b] space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-cyan-400">
            <GitBranch className="w-4 h-4 text-cyan-400" />
            <span>Graph Signals & Topological Heuristics:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {graph_signals.map((sig, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between transition-all",
                  sig.detected
                    ? (sig.severity === 'high' ? "bg-red-950/40 border-red-500/50 text-red-200" :
                       sig.severity === 'actionable' ? "bg-purple-950/40 border-purple-500/50 text-purple-200" :
                       "bg-[#042412] border-[#00ff66]/40 text-emerald-200")
                    : "bg-black/30 border-[#1e293b] text-slate-400 opacity-60"
                )}
              >
                <span className="font-semibold truncate pr-2">{sig.name}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 border",
                  sig.detected
                    ? (sig.severity === 'high' ? "bg-red-500/20 text-red-300 border-red-500/50" :
                       sig.severity === 'actionable' ? "bg-purple-500/20 text-purple-300 border-purple-500/50" :
                       "bg-[#00ff66]/20 text-[#00ff66] border-[#00ff66]/50")
                    : "bg-slate-800 text-slate-400 border-slate-700"
                )}>
                  {sig.detected ? 'DETECTED' : 'CLEAN'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Alternative Patterns Detected */}
      {alternative_patterns.length > 0 && (
        <div className="p-4 rounded-xl bg-black/40 border border-[#1e293b] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Alternative Patterns Evaluated:</span>
            </span>
            <span className="text-xs font-mono text-slate-400">
              Prevents binary classification bias
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {alternative_patterns.map((alt, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-[#041208] border border-[#0d331d] space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-white truncate pr-2">{alt.name}</span>
                  <span className="font-bold text-amber-400 shrink-0">{alt.score} / 100</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500/80"
                    style={{ width: `${alt.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Detailed Quantitative Features Toggle */}
      <div className="border-t border-[#1e293b]/60 pt-2">
        <button
          type="button"
          onClick={() => setShowFullFeatures(!showFullFeatures)}
          className="w-full flex items-center justify-between py-2 text-xs font-mono text-slate-400 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-emerald-400" />
            <span>Extracted Quantitative Graph Features ({Object.keys(features || {}).length} metrics)</span>
          </span>
          {showFullFeatures ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showFullFeatures && features && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-3 animate-fade-in text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-black/50 border border-[#1e293b]">
              <span className="text-slate-400 block text-[10px]">TOTAL NODES / HOPS</span>
              <span className="font-bold text-white text-sm">{features.total_nodes} nodes / {features.max_hop_depth} hops</span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/50 border border-[#1e293b]">
              <span className="text-slate-400 block text-[10px]">UNIQUE SENDERS / RECEIVERS</span>
              <span className="font-bold text-white text-sm">{features.unique_senders} in / {features.unique_receivers} out</span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/50 border border-[#1e293b]">
              <span className="text-slate-400 block text-[10px]">AVG HOP DELTA</span>
              <span className="font-bold text-white text-sm">{features.time_between_transactions_avg}s</span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/50 border border-[#1e293b]">
              <span className="text-slate-400 block text-[10px]">AMOUNT CONCENTRATION</span>
              <span className="font-bold text-white text-sm">{(features.amount_concentration * 100).toFixed(1)}%</span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/50 border border-[#1e293b]">
              <span className="text-slate-400 block text-[10px]">LARGEST DEST SHARE</span>
              <span className="font-bold text-white text-sm">{features.largest_destination_pct}%</span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/50 border border-[#1e293b]">
              <span className="text-slate-400 block text-[10px]">SPLITTING / MERGING</span>
              <span className="font-bold text-white text-sm">{features.wallet_splitting_events} split / {features.wallet_merging_events} merge</span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/50 border border-[#1e293b]">
              <span className="text-slate-400 block text-[10px]">CROSS-CHAIN BRIDGING</span>
              <span className="font-bold text-white text-sm">{features.is_cross_chain ? 'DETECTED' : 'SINGLE CHAIN'}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/50 border border-[#1e293b]">
              <span className="text-slate-400 block text-[10px]">VASP ATTR / DEX</span>
              <span className="font-bold text-white text-sm">{features.vasp_exchange_detected ? 'EXCHANGE' : features.dex_detected ? 'DEX POOL' : 'UNHOSTED'}</span>
            </div>
          </div>
        )}
      </div>

      {/* 6. Important Legal & Analytical Limitations Card */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-black/60 border border-[#1e293b] space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
          <Scale className="w-4 h-4 text-amber-400 shrink-0" />
          <span>IMPORTANT ANALYTICAL LIMITATION & LEGAL NOTICE:</span>
        </div>
        <div className="space-y-1.5 text-xs text-slate-300 font-sans leading-relaxed">
          {limitations.map((lim, idx) => (
            <p key={idx} className="flex items-start gap-2">
              <span className="text-amber-400 font-bold shrink-0">•</span>
              <span>{lim}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ScamIntelligencePanel;

