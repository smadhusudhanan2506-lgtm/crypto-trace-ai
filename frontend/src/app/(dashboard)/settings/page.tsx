'use client';
import { Settings, Shield, Database, Globe, Key } from 'lucide-react';
import { useAuthStore } from '@/lib/auth';
export default function SettingsPage() {
  const { user } = useAuthStore();
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Settings className="w-6 h-6 text-slate-400" />Settings</h1>
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Shield className="w-4 h-4 text-cyan-400"/>Profile</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-xs text-slate-500 mb-1">Name</p><p className="text-white">{user?.full_name}</p></div>
          <div><p className="text-xs text-slate-500 mb-1">Email</p><p className="text-white">{user?.email}</p></div>
          <div><p className="text-xs text-slate-500 mb-1">Role</p><p className="text-white capitalize">{user?.role}</p></div>
          <div><p className="text-xs text-slate-500 mb-1">Organization</p><p className="text-white">{user?.organization || 'N/A'}</p></div>
        </div>
      </div>
      <div className="glass-card p-6 space-y-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Database className="w-4 h-4 text-amber-400"/>System</h2>
        <div className="text-sm space-y-2">
          <div className="flex justify-between"><span className="text-slate-500">Backend</span><span className="text-emerald-400">http://localhost:8000</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Database</span><span className="text-white">SQLite</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Version</span><span className="text-white">1.0.0</span></div>
        </div>
      </div>
    </div>
  );
}
