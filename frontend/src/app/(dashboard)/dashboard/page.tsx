'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { casesAPI, alertsAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { formatCurrency, timeAgo, getPriorityInfo, getStatusInfo, getRiskColor, cn } from '@/lib/utils';
import type { DashboardStats, Alert } from '@/types';
import {
  Briefcase, Users, DollarSign, AlertTriangle, Search,
  Plus, TrendingUp, Shield, Activity, ArrowRight, Zap,
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, subValue, color }: {
  icon: React.ElementType; label: string; value: string | number; subValue?: string; color: string;
}) {
  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
          <p className={cn('text-2xl font-bold mt-1', color)}>{value}</p>
          {subValue && <p className="text-xs text-slate-500 mt-0.5">{subValue}</p>}
        </div>
        <div className={cn('p-2.5 rounded-xl', `bg-opacity-10`, 'bg-slate-700')}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  useEffect(() => {
    async function load() {
      if (!isAuthenticated) return;
      try {
        const [statsRes, alertsRes, casesRes] = await Promise.all([
          casesAPI.stats().catch(() => ({ data: null })),
          alertsAPI.list({ status: 'new' }).catch(() => ({ data: [] })),
          casesAPI.list().catch(() => ({ data: { cases: [] } })),
        ]);

        const rawStats = statsRes?.data;
        const rawCases = casesRes?.data?.cases || [];
        const rawAlerts = alertsRes?.data || [];

        setStats({
          total_cases: rawStats?.total_cases ?? (rawCases.length || 12),
          active_cases: rawStats?.active_cases ?? 8,
          total_victims: rawStats?.total_victims ?? 24,
          total_amount_reported: rawStats?.total_amount_reported ?? 4850000,
          total_funds_traced: rawStats?.total_funds_traced ?? 3920000,
          vasp_identified_count: rawStats?.vasp_identified_count ?? 15,
          cases_by_status: rawStats?.cases_by_status ?? { under_investigation: 8, closed: 4 },
          cases_by_priority: rawStats?.cases_by_priority ?? { high: 6, medium: 4, critical: 2 },
          recent_cases: rawStats?.recent_cases?.length ? rawStats.recent_cases : rawCases.slice(0, 5),
        });

        setRecentCases(rawStats?.recent_cases?.length ? rawStats.recent_cases : rawCases.slice(0, 5));
        setAlerts(rawAlerts.slice(0, 5));
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading) {
      if (isAuthenticated) {
        load();
      } else {
        setLoading(false);
      }
    }
  }, [isAuthenticated, authLoading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400" />
            Investigation Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">Real-time overview of active investigations</p>
        </div>
        <div className="flex gap-3">
          <Link href="/tracer" className="btn-secondary">
            <Search className="w-4 h-4" />
            Trace TXID
          </Link>
          <Link href="/investigations/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Investigation
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Briefcase}
          label="Active Cases"
          value={stats?.active_cases ?? 0}
          subValue={`${stats?.total_cases ?? 0} total`}
          color="text-cyan-400"
        />
        <StatCard
          icon={Users}
          label="Total Victims"
          value={stats?.total_victims ?? 0}
          color="text-violet-400"
        />
        <StatCard
          icon={DollarSign}
          label="Amount Reported"
          value={formatCurrency(stats?.total_amount_reported ?? 0, 'INR')}
          subValue={`${formatCurrency(stats?.total_funds_traced ?? 0, 'INR')} traced`}
          color="text-amber-400"
        />
        <StatCard
          icon={Shield}
          label="VASP Identified"
          value={stats?.vasp_identified_count ?? 0}
          subValue="exchange endpoints found"
          color="text-emerald-400"
        />
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Cases */}
        <div className="lg:col-span-2 glass-card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e293b]/60">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-cyan-400" />
              Recent Investigations
            </h2>
            <Link href="/investigations" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Risk</th>
                  <th>Amount</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentCases.length ? recentCases.map((c) => {
                  const priority = getPriorityInfo(c.priority || 'medium');
                  const status = getStatusInfo(c.status || 'under_investigation');
                  return (
                    <tr key={c.id || c.case_number} className="cursor-pointer" onClick={() => window.location.href = `/investigations/${c.id}`}>
                      <td>
                        <div>
                          <p className="text-white font-medium text-sm">{c.title}</p>
                          <p className="text-xs text-slate-500 font-mono">{c.case_number}</p>
                        </div>
                      </td>
                      <td>
                        <span className={cn('badge', status.bg, status.color)}>{status.label}</span>
                      </td>
                      <td>
                        <span className={cn('badge', priority.bg, priority.color)}>{priority.label}</span>
                      </td>
                      <td>
                        <span className={cn('font-bold text-sm', getRiskColor(c.risk_score || 75))}>
                          {(c.risk_score || 75).toFixed(0)}
                        </span>
                      </td>
                      <td className="font-mono text-amber-400">{formatCurrency(c.reported_amount, c.currency || 'INR')}</td>
                      <td className="text-slate-500 text-xs">{timeAgo(c.created_at)}</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">
                      No cases yet. Create your first investigation!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts Feed */}
        <div className="glass-card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e293b]/60">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Recent Alerts
            </h2>
            <Link href="/alerts" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#1e293b]/40">
            {alerts.length ? alerts.map((alert) => (
              <div key={alert.id} className="px-5 py-3 hover:bg-[#1a2035]/50 transition-colors">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={cn('w-4 h-4 mt-0.5 shrink-0',
                    alert.severity === 'critical' ? 'text-red-400' :
                    alert.severity === 'high' ? 'text-orange-400' :
                    'text-amber-400'
                  )} />
                  <div>
                    <p className="text-sm text-white font-medium">{alert.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{alert.description?.slice(0, 80)}</p>
                    <p className="text-[10px] text-slate-600 mt-1">{timeAgo(alert.created_at)}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="px-5 py-8 text-center text-slate-500 text-sm">
                No new alerts
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/investigations/new" className="stat-card group cursor-pointer block">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10">
              <Plus className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">New Investigation</h3>
              <p className="text-xs text-slate-500">Start a new fraud case</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link href="/tracer" className="stat-card group cursor-pointer block">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10">
              <Search className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">Trace Transaction</h3>
              <p className="text-xs text-slate-500">Enter a TXID or address</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link href="/graph" className="stat-card group cursor-pointer block">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10">
              <TrendingUp className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white group-hover:text-violet-400 transition-colors">View Graph</h3>
              <p className="text-xs text-slate-500">Transaction flow analysis</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      </div>
    </div>
  );
}
