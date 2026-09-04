'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { casesAPI } from '@/lib/api';
import { formatCurrency, timeAgo, getPriorityInfo, getStatusInfo, getRiskColor, cn } from '@/lib/utils';
import type { Case } from '@/types';
import { FileSearch, Plus, Filter, Search } from 'lucide-react';

export default function InvestigationsPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await casesAPI.list({ limit: 50, status: statusFilter || undefined, priority: priorityFilter || undefined });
        setCases(res.data.cases);
        setTotal(res.data.total);
      } catch (err) {
        console.error('Load cases error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [statusFilter, priorityFilter]);

  const filtered = cases.filter(c =>
    !search || c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.case_number.toLowerCase().includes(search.toLowerCase()) ||
    c.suspect_wallet.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileSearch className="w-6 h-6 text-cyan-400" />
            Investigations
          </h1>
          <p className="text-sm text-slate-400 mt-1">{total} total cases</p>
        </div>
        <Link href="/investigations/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Investigation
        </Link>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-auto"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="active">Active</option>
            <option value="investigating">Investigating</option>
            <option value="pending_report">Pending Report</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input-field w-auto"
          >
            <option value="">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Cases Table */}
      <div className="glass-card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Risk Score</th>
                  <th>Victims</th>
                  <th>Amount</th>
                  <th>Blockchain</th>
                  <th>VASP</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const priority = getPriorityInfo(c.priority);
                  const status = getStatusInfo(c.status);
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/investigations/${c.id}`} className="block group">
                          <p className="text-white font-medium text-sm group-hover:text-emerald-400 transition-colors">{c.title}</p>
                          <p className="text-xs text-slate-500 font-mono">{c.case_number}</p>
                        </Link>
                      </td>
                      <td><span className={cn('badge', status.bg, status.color)}>{status.label}</span></td>
                      <td><span className={cn('badge', priority.bg, priority.color)}>{priority.label}</span></td>
                      <td><span className={cn('font-bold', getRiskColor(c.risk_score))}>{c.risk_score.toFixed(0)}</span></td>
                      <td>{c.victim_count}</td>
                      <td className="font-mono text-amber-400 text-xs">{formatCurrency(c.reported_amount, c.currency)}</td>
                      <td className="uppercase text-xs text-slate-400">{c.blockchain || '-'}</td>
                      <td>
                        {c.vasp_identified ? (
                          <span className="text-emerald-400 text-xs font-medium">{c.vasp_name || 'Yes'}</span>
                        ) : (
                          <span className="text-slate-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="text-slate-500 text-xs">{timeAgo(c.created_at)}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-500">
                      {search ? 'No cases match your search.' : 'No cases yet. Create your first investigation!'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
