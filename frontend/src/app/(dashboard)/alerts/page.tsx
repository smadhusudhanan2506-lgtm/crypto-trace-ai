'use client';
import { useEffect, useState } from 'react';
import { alertsAPI } from '@/lib/api';
import { timeAgo, cn } from '@/lib/utils';
import type { Alert } from '@/types';
import { Bell, AlertTriangle } from 'lucide-react';
export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { alertsAPI.list().then(r => setAlerts(r.data)).catch(console.error).finally(() => setLoading(false)); }, []);
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Bell className="w-6 h-6 text-amber-400" />Alerts</h1>
      <div className="glass-card p-0 overflow-hidden">
        {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"/></div> : (
          <div className="divide-y divide-[#1e293b]/40">
            {alerts.length ? alerts.map(a => (
              <div key={a.id} className="px-5 py-4 hover:bg-[#1a2035]/50 transition-colors flex items-start gap-3">
                <AlertTriangle className={cn('w-4 h-4 mt-0.5 shrink-0', a.severity==='critical'?'text-red-400':a.severity==='high'?'text-orange-400':'text-amber-400')} />
                <div className="flex-1">
                  <div className="flex items-center justify-between"><p className="text-sm text-white font-medium">{a.title}</p><span className={cn('badge text-xs', a.severity==='critical'?'bg-red-500/20 text-red-400 border-red-500/40':'bg-amber-500/20 text-amber-400 border-amber-500/40')}>{a.severity}</span></div>
                  <p className="text-xs text-slate-500 mt-1">{a.description}</p>
                  <p className="text-[10px] text-slate-600 mt-1">{timeAgo(a.created_at)}</p>
                </div>
              </div>
            )) : <div className="text-center py-12 text-slate-500 text-sm">No alerts</div>}
          </div>
        )}
      </div>
    </div>
  );
}
