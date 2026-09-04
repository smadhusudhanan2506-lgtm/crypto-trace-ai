'use client';
import { Users } from 'lucide-react';
export default function VictimsPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-2"><Users className="w-6 h-6 text-blue-400" />Victim Reports</h1>
      <p className="text-sm text-slate-400">Cross-case victim correlation and management</p>
      <div className="glass-card p-12 mt-6 text-center text-slate-500">
        <Users className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <p>Victims are managed per-case. Go to an investigation to add victims.</p>
      </div>
    </div>
  );
}
