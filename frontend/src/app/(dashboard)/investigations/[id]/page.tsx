'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { casesAPI, tracingAPI, victimsAPI, analyticsAPI } from '@/lib/api';
import { formatCurrency, timeAgo, getPriorityInfo, getStatusInfo, getRiskColor, getRiskBg, truncateHash, cn, formatDate } from '@/lib/utils';
import type { Case, TraceDetail, Victim, RiskAnalysis } from '@/types';
import {
  FileSearch, ArrowLeft, Play, Users, Shield, Activity,
  Clock, Wallet, Hash, Globe, AlertTriangle, ChevronRight,
  Network, Eye,
} from 'lucide-react';

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [traces, setTraces] = useState<TraceDetail[]>([]);
  const [victims, setVictims] = useState<Victim[]>([]);
  const [risk, setRisk] = useState<RiskAnalysis | null>(null);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [tracing, setTracing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [caseRes, tracesRes, victimsRes] = await Promise.all([
          casesAPI.get(caseId),
          tracingAPI.list(),
          victimsAPI.list(caseId),
        ]);
        setCaseData(caseRes.data);
        setTraces(tracesRes.data.filter((t: TraceDetail) => t.case_id === caseId));
        setVictims(victimsRes.data);

        if (tracesRes.data.length > 0) {
          const lastTrace = tracesRes.data.find((t: TraceDetail) => t.case_id === caseId && t.status === 'completed');
          if (lastTrace) {
            try {
              const riskRes = await analyticsAPI.risk({
                case_id: caseId,
                trace_id: lastTrace.id,
                victim_count: victimsRes.data.length,
                reported_amount: caseRes.data.reported_amount,
              });
              setRisk(riskRes.data);
            } catch {}
          }
        }
      } catch (err) {
        console.error('Load case error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [caseId]);

  const startTrace = async () => {
    if (!caseData) return;
    setTracing(true);
    try {
      const res = await tracingAPI.start({
        tx_hash: caseData.initial_txid,
        address: caseData.suspect_wallet,
        chain: caseData.blockchain,
        case_id: caseId,
        max_hops: 100,
        direction: 'forward',
      });
      // Redirect to tracer with trace ID
      window.location.href = `/tracer?trace_id=${res.data.trace_id}`;
    } catch (err) {
      console.error('Start trace error:', err);
    } finally {
      setTracing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!caseData) {
    return <div className="text-center text-slate-400 py-20">Case not found.</div>;
  }

  const priority = getPriorityInfo(caseData.priority);
  const status = getStatusInfo(caseData.status);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/investigations" className="hover:text-white transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Investigations
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-white">{caseData.case_number}</span>
      </div>

      {/* Case Header */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={cn('badge', status.bg, status.color)}>{status.label}</span>
              <span className={cn('badge', priority.bg, priority.color)}>{priority.label}</span>
              <span className="badge bg-[#00ff66]/15 text-[#00ff66] border-[#00ff66]/40 font-mono">● LIVE CASE</span>
            </div>
            <h1 className="text-xl font-bold text-white">{caseData.title}</h1>
            <p className="text-sm text-slate-400 mt-1 font-mono">{caseData.case_number}</p>
            {caseData.description && <p className="text-sm text-slate-400 mt-2 max-w-2xl">{caseData.description}</p>}
          </div>
          <div className="flex gap-2">
            {(caseData.initial_txid || caseData.suspect_wallet) && (
              <button onClick={startTrace} disabled={tracing} className="btn-primary">
                {tracing ? <div className="w-4 h-4 border-2 border-[#020b06]/30 border-t-[#020b06] rounded-full animate-spin" /> : <Play className="w-4 h-4" />}
                Start Trace
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-4 border-t border-[#1e293b]/60">
          <div>
            <p className="text-xs text-slate-500 uppercase">Risk Score</p>
            <p className={cn('text-xl font-bold mt-0.5', getRiskColor(caseData.risk_score))}>{caseData.risk_score.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Victims</p>
            <p className="text-xl font-bold text-violet-400 mt-0.5">{caseData.victim_count}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Amount</p>
            <p className="text-xl font-bold text-amber-400 mt-0.5">{formatCurrency(caseData.reported_amount, caseData.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Funds Traced</p>
            <p className="text-xl font-bold text-cyan-400 mt-0.5">{formatCurrency(caseData.funds_traced, caseData.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">VASP</p>
            <p className="text-xl font-bold mt-0.5">
              {caseData.vasp_identified ? (
                <span className="text-emerald-400">{caseData.vasp_name || 'Identified'}</span>
              ) : (
                <span className="text-slate-600">Not found</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1e293b]">
        {['overview', 'traces', 'victims', 'risk'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium capitalize transition-all border-b-2 -mb-px',
              tab === t
                ? 'text-emerald-400 border-emerald-400'
                : 'text-slate-500 border-transparent hover:text-white'
            )}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Globe className="w-4 h-4 text-cyan-400" /> Blockchain Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Blockchain</span><span className="text-white uppercase">{caseData.blockchain || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Cryptocurrency</span><span className="text-white">{caseData.cryptocurrency || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Suspect Wallet</span><span className="text-emerald-400 font-mono text-xs">{truncateHash(caseData.suspect_wallet) || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Initial TXID</span><span className="text-cyan-400 font-mono text-xs">{truncateHash(caseData.initial_txid) || 'N/A'}</span></div>
            </div>
          </div>
          <div className="glass-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" /> Timeline</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Created</span><span className="text-white">{formatDate(caseData.created_at)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Updated</span><span className="text-white">{formatDate(caseData.updated_at)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Source</span><span className="text-white">{caseData.complaint_source || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Organization</span><span className="text-white">{caseData.organization || 'N/A'}</span></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'traces' && (
        <div className="glass-card p-0 overflow-hidden">
          <table className="data-table">
            <thead><tr><th>Trace</th><th>Status</th><th>Hops</th><th>Wallets</th><th>Value</th><th>VASP</th><th>Created</th></tr></thead>
            <tbody>
              {traces.map((t) => (
                <tr key={t.id}>
                  <td><Link href={`/tracer?trace_id=${t.id}`} className="text-emerald-400 hover:underline font-mono text-xs">{truncateHash(t.start_tx_hash || t.start_address)}</Link></td>
                  <td><span className={cn('badge', t.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border-amber-500/40')}>{t.status}</span></td>
                  <td>{t.hops_completed}</td>
                  <td>{t.total_wallets}</td>
                  <td className="font-mono text-xs">{t.total_value.toFixed(4)}</td>
                  <td>{t.vasp_detected ? <span className="text-emerald-400 text-xs">{t.vasp_name}</span> : <span className="text-slate-600">-</span>}</td>
                  <td className="text-xs text-slate-500">{timeAgo(t.created_at)}</td>
                </tr>
              ))}
              {traces.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-500">No traces yet. Start one above!</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'victims' && (
        <div className="glass-card p-0 overflow-hidden">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Amount Lost</th><th>Wallet</th><th>TX Hash</th><th>Reported</th></tr></thead>
            <tbody>
              {victims.map((v) => (
                <tr key={v.id}>
                  <td className="text-white font-medium">{v.victim_name || 'Anonymous'}</td>
                  <td className="text-amber-400 font-mono">{formatCurrency(v.amount_lost, v.currency)}</td>
                  <td className="font-mono text-xs text-emerald-400">{truncateHash(v.wallet_address)}</td>
                  <td className="font-mono text-xs text-cyan-400">{truncateHash(v.tx_hash)}</td>
                  <td className="text-xs text-slate-500">{timeAgo(v.created_at)}</td>
                </tr>
              ))}
              {victims.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-500">No victims reported yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'risk' && risk && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-red-400" /> Risk Score</h3>
            <div className={cn('text-5xl font-bold mb-2', getRiskColor(risk.risk.score))}>{risk.risk.score.toFixed(0)}</div>
            <span className={cn('badge', getRiskBg(risk.risk.score), getRiskColor(risk.risk.score))}>{risk.risk.level}</span>
            <div className="mt-4 space-y-2">
              {risk.risk.factors.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{f.name}</span>
                  <span className="text-white font-mono">{f.points}/{f.max_points}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /> Detected Patterns</h3>
            <div className="space-y-3">
              {risk.patterns.map((p, i) => (
                <div key={i} className="p-3 rounded-lg bg-[#0a0e1a] border border-[#1e293b]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white capitalize">{p.pattern_type.replace(/_/g, ' ')}</span>
                    <span className={cn('badge text-xs', p.severity === 'critical' || p.severity === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-amber-500/20 text-amber-400 border-amber-500/40')}>{p.severity}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{p.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full" style={{ width: `${p.confidence * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-500">{(p.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
              {risk.patterns.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No patterns detected yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
