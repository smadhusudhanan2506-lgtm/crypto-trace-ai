'use client';
import { useEffect, useState } from 'react';
import { evidenceAPI } from '@/lib/api';
import { timeAgo, truncateHash } from '@/lib/utils';
import type { Evidence } from '@/types';
import { Archive, ShieldCheck } from 'lucide-react';
export default function EvidencePage() {
  const [items, setItems] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { evidenceAPI.list().then(r => setItems(r.data)).catch(console.error).finally(() => setLoading(false)); }, []);
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Archive className="w-6 h-6 text-violet-400" />Evidence Repository</h1>
      <p className="text-sm text-slate-400">SHA-256 verified evidence chain</p>
      <div className="glass-card p-0 overflow-hidden">
        {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"/></div> : (
          <table className="data-table"><thead><tr><th>Title</th><th>Type</th><th>Source</th><th>SHA-256</th><th>Created</th></tr></thead>
            <tbody>
              {items.length ? items.map(e => (
                <tr key={e.id}>
                  <td className="text-white font-medium text-sm">{e.title}</td>
                  <td><span className="badge bg-violet-500/20 text-violet-400 border-violet-500/40 text-xs">{e.evidence_type}</span></td>
                  <td className="text-xs text-slate-400">{e.source}</td>
                  <td className="font-mono text-[10px] text-emerald-400 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/>{truncateHash(e.sha256_hash, 10)}</td>
                  <td className="text-xs text-slate-500">{timeAgo(e.created_at)}</td>
                </tr>
              )) : <tr><td colSpan={5} className="text-center py-12 text-slate-500">No evidence items</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
