'use client';
import { Globe } from 'lucide-react';
export default function VASPPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-2"><Globe className="w-6 h-6 text-purple-400" />VASP Intelligence</h1>
      <p className="text-sm text-slate-400">Known exchange and service entity database</p>
      <div className="glass-card p-12 mt-6 text-center text-slate-500">
        <Globe className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <p>VASP entities are auto-detected during fund tracing.</p>
        <p className="text-xs text-slate-600 mt-1">Run a trace to see attributed exchanges and services.</p>
      </div>
    </div>
  );
}
