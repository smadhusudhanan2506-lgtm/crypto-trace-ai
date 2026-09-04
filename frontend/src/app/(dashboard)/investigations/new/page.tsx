'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { casesAPI, victimsAPI } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Plus, ArrowRight, ArrowLeft, Check, FileSearch, User, Link2 } from 'lucide-react';

const steps = [
  { id: 1, label: 'Case Info', icon: FileSearch },
  { id: 2, label: 'Victim Details', icon: User },
  { id: 3, label: 'Blockchain Data', icon: Link2 },
];

export default function NewInvestigationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [caseData, setCaseData] = useState({
    title: '', description: '', complaint_source: '',
    reported_amount: 0, currency: 'INR', organization: '',
  });

  const [victimData, setVictimData] = useState({
    victim_name: '', contact_email: '', contact_phone: '',
    amount_lost: 0, description: '',
  });

  const [blockchainData, setBlockchainData] = useState({
    suspect_wallet: '', initial_txid: '', blockchain: '', cryptocurrency: '',
  });

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await casesAPI.create({
        ...caseData,
        ...blockchainData,
        victim_count: 1,
      });
      const caseId = res.data.id;

      if (victimData.victim_name) {
        await victimsAPI.create(caseId, {
          ...victimData,
          wallet_address: blockchainData.suspect_wallet,
          tx_hash: blockchainData.initial_txid,
          currency: caseData.currency,
        });
      }

      router.push(`/investigations/${caseId}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || 'Failed to create investigation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Plus className="w-6 h-6 text-emerald-400" />
          New Investigation
        </h1>
        <p className="text-sm text-slate-400 mt-1">Create a new fraud investigation case</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <button
              onClick={() => setStep(s.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                step === s.id
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : step > s.id
                  ? 'bg-emerald-500/5 text-emerald-500/60 border border-emerald-500/10'
                  : 'text-slate-500 border border-transparent'
              )}
            >
              {step > s.id ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              {s.label}
            </button>
            {i < steps.length - 1 && (
              <div className={cn('w-8 h-px mx-1', step > s.id ? 'bg-emerald-500/40' : 'bg-slate-700')} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}

      <div className="glass-card p-6">
        {/* Step 1: Case Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Case Information</h2>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Case Title *</label>
              <input type="text" required value={caseData.title}
                onChange={(e) => setCaseData({ ...caseData, title: e.target.value })}
                className="input-field" placeholder="e.g., Bitcoin Investment Fraud - Victim John Doe" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
              <textarea value={caseData.description}
                onChange={(e) => setCaseData({ ...caseData, description: e.target.value })}
                className="input-field min-h-[100px] resize-y" placeholder="Describe the fraud incident..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Complaint Source</label>
                <select value={caseData.complaint_source}
                  onChange={(e) => setCaseData({ ...caseData, complaint_source: e.target.value })}
                  className="input-field">
                  <option value="">Select source</option>
                  <option value="victim_report">Victim Report</option>
                  <option value="agency_referral">Agency Referral</option>
                  <option value="suspicious_activity">Suspicious Activity</option>
                  <option value="intelligence">Intelligence Report</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Organization</label>
                <input type="text" value={caseData.organization}
                  onChange={(e) => setCaseData({ ...caseData, organization: e.target.value })}
                  className="input-field" placeholder="e.g., Cyber Police Station" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Reported Amount</label>
                <input type="number" value={caseData.reported_amount}
                  onChange={(e) => setCaseData({ ...caseData, reported_amount: parseFloat(e.target.value) || 0 })}
                  className="input-field" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Currency</label>
                <select value={caseData.currency}
                  onChange={(e) => setCaseData({ ...caseData, currency: e.target.value })}
                  className="input-field">
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Victim */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Victim Details</h2>
            <p className="text-xs text-slate-500">Optional — you can add victims later.</p>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Victim Name</label>
              <input type="text" value={victimData.victim_name}
                onChange={(e) => setVictimData({ ...victimData, victim_name: e.target.value })}
                className="input-field" placeholder="Full name of the victim" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                <input type="email" value={victimData.contact_email}
                  onChange={(e) => setVictimData({ ...victimData, contact_email: e.target.value })}
                  className="input-field" placeholder="victim@email.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone</label>
                <input type="tel" value={victimData.contact_phone}
                  onChange={(e) => setVictimData({ ...victimData, contact_phone: e.target.value })}
                  className="input-field" placeholder="+91..." />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Amount Lost</label>
              <input type="number" value={victimData.amount_lost}
                onChange={(e) => setVictimData({ ...victimData, amount_lost: parseFloat(e.target.value) || 0 })}
                className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
              <textarea value={victimData.description}
                onChange={(e) => setVictimData({ ...victimData, description: e.target.value })}
                className="input-field min-h-[80px] resize-y" placeholder="How the victim was defrauded..." />
            </div>
          </div>
        )}

        {/* Step 3: Blockchain */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Blockchain Data</h2>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Blockchain</label>
              <select value={blockchainData.blockchain}
                onChange={(e) => setBlockchainData({ ...blockchainData, blockchain: e.target.value })}
                className="input-field">
                <option value="">Auto-detect</option>
                <option value="bitcoin">Bitcoin</option>
                <option value="ethereum">Ethereum</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Suspect Wallet Address</label>
              <input type="text" value={blockchainData.suspect_wallet}
                onChange={(e) => setBlockchainData({ ...blockchainData, suspect_wallet: e.target.value })}
                className="input-field font-mono text-xs" placeholder="bc1q... or 0x..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Initial Transaction ID (TXID)</label>
              <input type="text" value={blockchainData.initial_txid}
                onChange={(e) => setBlockchainData({ ...blockchainData, initial_txid: e.target.value })}
                className="input-field font-mono text-xs" placeholder="Transaction hash..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Cryptocurrency</label>
              <select value={blockchainData.cryptocurrency}
                onChange={(e) => setBlockchainData({ ...blockchainData, cryptocurrency: e.target.value })}
                className="input-field">
                <option value="">Select</option>
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="ETH">Ethereum (ETH)</option>
                <option value="USDT">Tether (USDT)</option>
                <option value="USDC">USD Coin (USDC)</option>
              </select>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#1e293b]/60">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="btn-secondary">
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>
          ) : <div />}
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} className="btn-primary"
              disabled={step === 1 && !caseData.title}>
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} className="btn-primary" disabled={loading || !caseData.title}>
              {loading ? (
                <div className="w-4 h-4 border-2 border-[#020b06]/30 border-t-[#020b06] rounded-full animate-spin" />
              ) : (
                <>Create Investigation <Check className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
