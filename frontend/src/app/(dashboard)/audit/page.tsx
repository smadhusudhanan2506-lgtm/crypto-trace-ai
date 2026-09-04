'use client';
import { useEffect, useState } from 'react';
import { auditAPI } from '@/lib/api';
import { timeAgo, truncateHash } from '@/lib/utils';
import type { AuditLog } from '@/types';
import { ScrollText, Link2 } from 'lucide-react';
export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { auditAPI.list(100).then(r => setLogs(r.data)).catch(console.error).finally(() => setLoading(false)); }, []);
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2"><ScrollText className="w-6 h-6 text-cyan-400" />Audit Logs</h1>
      <p className="text-sm text-slate-400">Hash-chained, tamper-evident audit trail</p>
      <div className="glass-card p-0 overflow-hidden">
        {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"/></div> : (
          <table className="data-table"><thead><tr><th>Action</th><th>Resource</th><th>User</th><th>Hash Chain</th><th>Time</th></tr></thead>
            <tbody>
              {logs.length ? logs.map(l => (
                <tr key={l.id}>
                  <td className="text-white font-medium text-sm">{l.action}</td>
                  <td className="text-slate-400 text-xs">{l.resource_type} {l.resource_id ? truncateHash(l.resource_id) : ''}</td>
                  <td className="text-xs text-slate-500">{truncateHash(l.user_id || '')}</td>
                  <td className="font-mono text-[10px]"><span className="text-slate-600">{truncateHash(l.previous_hash, 6)}</span> <Link2 className="w-3 h-3 inline text-emerald-500"/> <span className="text-emerald-400">{truncateHash(l.current_hash, 6)}</span></td>
                  <td className="text-xs text-slate-500">{timeAgo(l.created_at)}</td>
                </tr>
              )) : <tr><td colSpan={5} className="text-center py-12 text-slate-500">No audit logs</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
