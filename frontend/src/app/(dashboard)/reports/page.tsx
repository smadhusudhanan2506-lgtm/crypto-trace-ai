'use client';
import { FileText } from 'lucide-react';
export default function ReportsPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-2"><FileText className="w-6 h-6 text-emerald-400" />Reports</h1>
      <p className="text-sm text-slate-400">Generate investigation reports in PDF, JSON, or CSV</p>
      <div className="glass-card p-12 mt-6 text-center text-slate-500">
        <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <p>Reports are generated per-case from the investigation detail page.</p>
      </div>
    </div>
  );
}
