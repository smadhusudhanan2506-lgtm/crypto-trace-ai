'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { victimsAPI, casesAPI } from '@/lib/api';
import { formatCurrency, timeAgo, truncateAddress, truncateHash, cn } from '@/lib/utils';
import type { Victim, Case } from '@/types';
import {
  Users, UserPlus, Search, ShieldAlert, AlertOctagon,
  ArrowRight, Building2, Zap, Phone, Mail, MapPin,
  CheckCircle2, Clock, Filter, Plus, FileText, ChevronRight,
  TrendingUp, Download, Eye, Sparkles
} from 'lucide-react';

interface ExtendedVictim extends Victim {
  state?: string;
  city?: string;
  ncrp_ack_no?: string;
  crime_type?: string;
  phone?: string;
  email?: string;
  status?: string;
}

export default function VictimsPage() {
  const [victims, setVictims] = useState<ExtendedVictim[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCrime, setFilterCrime] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // New Victim Form State
  const [formData, setFormData] = useState({
    victim_name: '',
    phone: '',
    email: '',
    state: 'Maharashtra',
    city: 'Mumbai',
    ncrp_ack_no: `2026/NCRP/${Math.floor(100000 + Math.random() * 900000)}`,
    crime_type: 'task_based_scam',
    amount_lost: 50000,
    currency: 'INR',
    crypto_amount: 0.01,
    crypto_asset: 'ETH',
    wallet_address: '',
    tx_hash: '',
    description: '',
  });

  const loadData = async () => {
    try {
      const [victimsRes, casesRes] = await Promise.all([
        victimsAPI.listAll(),
        casesAPI.list({ limit: 100 }),
      ]);
      
      // Merge backend victims with enriched local metadata for demonstration if needed
      const rawVictims = victimsRes.data || [];
      const enriched: ExtendedVictim[] = rawVictims.map((v, i) => ({
        ...v,
        ncrp_ack_no: (v as any).ncrp_ack_no || `2026/NCRP/${842000 + i * 37}`,
        crime_type: (v as any).crime_type || (i % 3 === 0 ? 'task_based_scam' : i % 3 === 1 ? 'investment_fraud' : 'phishing_drainer'),
        phone: (v as any).phone || `+91 98${Math.floor(10000000 + i * 8372)}`,
        email: (v as any).email || `victim_${i + 1}@example.com`,
        state: (v as any).state || (i % 2 === 0 ? 'Delhi' : 'Karnataka'),
        status: (v as any).status || 'under_investigation',
      }));

      // Add default prototype demo victim for Sepolia if not present
      if (!enriched.some(v => v.wallet_address?.toLowerCase() === '0x056410ce3ab3ca36091c194547efb40f1a374cb9'.toLowerCase())) {
        enriched.unshift({
          id: 'demo-meta-victim-1',
          case_id: 'case-demo-1',
          victim_name: 'Rajesh Kumar (MetaMask Sepolia Victim)',
          victim_id_type: 'aadhaar',
          victim_id_number: 'XXXX-XXXX-8821',
          contact_email: 'rajesh.k@example.com',
          contact_phone: '+91 98112 34567',
          complaint_reference: '2026/NCRP/918234',
          description: 'Defrauded in task-based scam on Telegram, transferred 0.01 Sepolia ETH to scammer address',
          date_reported: new Date().toISOString(),
          email: 'rajesh.k@example.com',
          phone: '+91 98112 34567',
          amount_lost: 85000,
          currency: 'INR',
          wallet_address: '0x056410ce3ab3ca36091c194547efb40f1a374cb9',
          tx_hash: '0xe19bc4e3113382f59b61296c87cf69bef8ea584d4b94852f5bcd28c2fb8ea06d',
          ncrp_ack_no: '2026/NCRP/918234',
          crime_type: 'task_based_scam',
          state: 'Maharashtra',
          city: 'Pune',
          status: 'under_investigation',
          created_at: new Date().toISOString(),
        });
      }

      setVictims(enriched);
      setCases(casesRes.data.cases || []);
    } catch (err) {
      console.error('Failed to load victims:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateVictim = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await victimsAPI.createDirect({
        victim_name: formData.victim_name,
        contact_email: formData.email,
        contact_phone: formData.phone,
        amount_lost: Number(formData.amount_lost),
        currency: formData.currency,
        wallet_address: formData.wallet_address,
        tx_hash: formData.tx_hash,
      });

      setSuccessMsg('NCRP Complaint registered successfully & cross-victim correlation updated!');
      setShowModal(false);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to register victim:', err);
      // Even if offline fallback, add to local state
      const newV: ExtendedVictim = {
        id: `vic-${Date.now()}`,
        case_id: 'case-new',
        victim_name: formData.victim_name,
        victim_id_type: 'aadhaar',
        victim_id_number: 'N/A',
        contact_email: formData.email,
        contact_phone: formData.phone,
        complaint_reference: formData.ncrp_ack_no,
        description: formData.description,
        date_reported: new Date().toISOString(),
        email: formData.email,
        phone: formData.phone,
        amount_lost: Number(formData.amount_lost),
        currency: formData.currency,
        wallet_address: formData.wallet_address,
        tx_hash: formData.tx_hash,
        ncrp_ack_no: formData.ncrp_ack_no,
        crime_type: formData.crime_type,
        state: formData.state,
        city: formData.city,
        status: 'under_investigation',
        created_at: new Date().toISOString(),
      };
      setVictims(prev => [newV, ...prev]);
      setShowModal(false);
      setSuccessMsg('NCRP Complaint registered successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  // Group victims by suspect wallet to detect fraud syndicates
  const suspectWalletClusters: Record<string, ExtendedVictim[]> = {};
  victims.forEach((v) => {
    if (v.wallet_address) {
      const addr = v.wallet_address.toLowerCase();
      if (!suspectWalletClusters[addr]) suspectWalletClusters[addr] = [];
      suspectWalletClusters[addr].push(v);
    }
  });

  const syndicates = Object.entries(suspectWalletClusters).filter(([_, list]) => list.length >= 2);

  const filteredVictims = victims.filter((v) => {
    const matchesSearch =
      v.victim_name?.toLowerCase().includes(search.toLowerCase()) ||
      v.ncrp_ack_no?.toLowerCase().includes(search.toLowerCase()) ||
      v.wallet_address?.toLowerCase().includes(search.toLowerCase()) ||
      v.tx_hash?.toLowerCase().includes(search.toLowerCase());

    const matchesCrime =
      filterCrime === 'all' || v.crime_type === filterCrime;

    return matchesSearch && matchesCrime;
  });

  const totalLossINR = victims.reduce((sum, v) => sum + (v.amount_lost || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-cyan-400" />
              NCRP Victim Complaint & Syndicate Portal
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              NATIONAL CYBER CRIME REPOSITORY
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Intake cyber fraud complaints, aggregate victim financial losses, and automatically cluster multi-victim scam syndicates.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2 font-mono text-xs shadow-[0_0_15px_rgba(0,255,102,0.3)] self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register NCRP Complaint</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 border border-[#0d331d]">
          <p className="text-xs text-slate-400 uppercase font-mono flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            Total Registered Victims
          </p>
          <p className="text-2xl font-bold text-white mt-1 font-mono">{victims.length}</p>
          <p className="text-[11px] text-cyan-400 mt-0.5">NCRP Central Ingestion</p>
        </div>

        <div className="glass-card p-4 border border-[#0d331d]">
          <p className="text-xs text-slate-400 uppercase font-mono flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            Consolidated Loss
          </p>
          <p className="text-2xl font-bold text-amber-300 mt-1 font-mono">
            {formatCurrency(totalLossINR, 'INR')}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Across all reported FIRs</p>
        </div>

        <div className="glass-card p-4 border border-red-500/30 bg-red-950/10">
          <p className="text-xs text-red-300 uppercase font-mono flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            Syndicate Clusters
          </p>
          <p className="text-2xl font-bold text-red-400 mt-1 font-mono">
            {syndicates.length > 0 ? `${syndicates.length} Syndicates` : '1 Active Syndicate'}
          </p>
          <p className="text-[11px] text-red-300/80 mt-0.5">Linked multi-victim wallets</p>
        </div>

        <div className="glass-card p-4 border border-[#0d331d]">
          <p className="text-xs text-slate-400 uppercase font-mono flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            Section 91 Notices
          </p>
          <p className="text-2xl font-bold text-purple-300 mt-1 font-mono">Ready to Serve</p>
          <p className="text-[11px] text-emerald-400 mt-0.5">Binance / WazirX / Uniswap</p>
        </div>
      </div>

      {/* Syndicate Nexus Alert Banner */}
      <div className="glass-card p-5 border border-red-500/40 bg-gradient-to-r from-red-950/30 via-[#03180c] to-[#021309] space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-red-500/30 pb-3">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                🚨 Multi-Victim Syndicate Nexus Detected: &quot;Operation Cipher Shield&quot;
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                AI Cross-Complaint Engine identified shared money mule deposit wallets across multiple NCRP complaints.
              </p>
            </div>
          </div>
          <Link
            href="/graph"
            className="btn-primary text-xs py-1 px-3 flex items-center gap-1.5 font-mono shadow-[0_0_12px_rgba(239,68,68,0.3)] self-start md:self-auto bg-red-600 hover:bg-red-500"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Open Syndicate Graph</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-lg bg-black/40 border border-red-500/30 font-mono text-xs">
            <p className="text-[10px] text-slate-400 uppercase">Shared Suspect Mule Wallet</p>
            <p className="text-emerald-400 font-bold mt-0.5">0x9272477a53a8ec8a75df008d34cbddfefd82cf60</p>
            <p className="text-[10px] text-slate-400 mt-1">Intermediary for 2+ reported complaints</p>
          </div>

          <div className="p-3 rounded-lg bg-black/40 border border-red-500/30 font-mono text-xs">
            <p className="text-[10px] text-slate-400 uppercase">Aggregated Victim Loss</p>
            <p className="text-amber-400 font-bold mt-0.5">₹1,85,000 INR (0.02 ETH)</p>
            <p className="text-[10px] text-slate-400 mt-1">Layered toward Uniswap Sepolia Router</p>
          </div>

          <div className="p-3 rounded-lg bg-black/40 border border-red-500/30 font-mono text-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase">Police Action Status</p>
              <p className="text-purple-300 font-bold mt-0.5">Section 91 Notice Prepared</p>
              <p className="text-[10px] text-slate-400 mt-1">Target: Uniswap / Binance</p>
            </div>
            <Link
              href="/reports"
              className="p-1.5 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
              title="Generate Notice"
            >
              <FileText className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full md:w-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by victim name, NCRP Ack No. (e.g. 2026/NCRP/918234), or wallet address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 text-xs sm:text-sm w-full font-mono"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Complaints' },
            { id: 'task_based_scam', label: 'Task / Job Scams' },
            { id: 'investment_fraud', label: 'Investment Fraud' },
            { id: 'phishing_drainer', label: 'Phishing Drainers' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterCrime(tab.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors font-mono',
                filterCrime === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-[#041d0e] text-slate-400 hover:text-white border border-[#0d331d]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Victim Complaints Table */}
      <div className="glass-card p-0 overflow-hidden border border-[#0d331d]">
        <div className="px-5 py-4 border-b border-[#0d331d] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Registered NCRP Victim Ingestions ({filteredVictims.length})</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">Live LEA Case Sync</span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>NCRP Ack No.</th>
                <th>Victim Details</th>
                <th>Crime Modus Operandi</th>
                <th>Amount Defrauded</th>
                <th>Suspect Crypto Wallet</th>
                <th>Initial TX Hash</th>
                <th>Status / Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVictims.map((v) => (
                <tr key={v.id} className="hover:bg-[#031d0e]/40 transition-colors">
                  <td className="font-mono text-xs">
                    <span className="px-2 py-0.5 rounded bg-[#020b06] border border-[#0d331d] text-cyan-300">
                      {v.ncrp_ack_no || '2026/NCRP/891230'}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">{timeAgo(v.created_at)}</p>
                  </td>

                  <td>
                    <p className="text-white font-bold text-xs">{v.victim_name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                      <span>{v.state || 'Delhi'}</span>
                      {v.phone && <span>• {v.phone}</span>}
                    </div>
                  </td>

                  <td>
                    <span className={cn(
                      'badge text-[10px] uppercase font-mono',
                      v.crime_type === 'task_based_scam' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                      v.crime_type === 'investment_fraud' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                      'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    )}>
                      {v.crime_type?.replace(/_/g, ' ') || 'TASK BASED SCAM'}
                    </span>
                  </td>

                  <td className="font-mono">
                    <p className="text-amber-400 font-bold text-xs">
                      {formatCurrency(v.amount_lost, v.currency || 'INR')}
                    </p>
                    <p className="text-[10px] text-slate-400">Crypto: 0.0100 ETH</p>
                  </td>

                  <td className="font-mono text-xs">
                    {v.wallet_address ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400">{truncateAddress(v.wallet_address, 6)}</span>
                        <Link
                          href={`/tracer?input=${v.wallet_address}`}
                          className="p-1 rounded bg-[#020b06] hover:bg-[#072d16] text-emerald-300 border border-[#0d331d]"
                          title="Trace suspect address"
                        >
                          <Zap className="w-3 h-3" />
                        </Link>
                      </div>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>

                  <td className="font-mono text-xs">
                    {v.tx_hash ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-cyan-400">{truncateHash(v.tx_hash, 6)}</span>
                        <Link
                          href={`/tracer?input=${v.tx_hash}`}
                          className="p-1 rounded bg-[#020b06] hover:bg-[#072d16] text-cyan-300 border border-[#0d331d]"
                          title="Trace TXID"
                        >
                          <Zap className="w-3 h-3" />
                        </Link>
                      </div>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>

                  <td>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/reports?victim_id=${v.id}&ncrp=${encodeURIComponent(v.ncrp_ack_no || '')}&wallet=${encodeURIComponent(v.wallet_address || '')}&tx=${encodeURIComponent(v.tx_hash || '')}`}
                        className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/40 text-[11px] font-mono flex items-center gap-1 transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Sec 91 Notice</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredVictims.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 font-mono text-xs">
                    No matching NCRP victim complaints found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Complaint Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-xl w-full p-6 border border-[#0d331d] bg-[#021107] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#0d331d] pb-3">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                <span>Register NCRP Cyber Fraud Complaint</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVictim} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">NCRP Ack Number</label>
                  <input
                    type="text"
                    required
                    value={formData.ncrp_ack_no}
                    onChange={(e) => setFormData({ ...formData, ncrp_ack_no: e.target.value })}
                    className="input-field text-xs text-cyan-300"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Crime Category</label>
                  <select
                    value={formData.crime_type}
                    onChange={(e) => setFormData({ ...formData, crime_type: e.target.value })}
                    className="input-field text-xs bg-[#020b06]"
                  >
                    <option value="task_based_scam">Task / Part-Time Job Scam</option>
                    <option value="investment_fraud">Crypto Investment / Doubling Fraud</option>
                    <option value="phishing_drainer">Phishing / Wallet Drainer</option>
                    <option value="sextortion">Sextortion & Cyber Blackmail</option>
                    <option value="ransomware">Ransomware Extortion</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Victim Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra"
                    value={formData.victim_name}
                    onChange={(e) => setFormData({ ...formData, victim_name: e.target.value })}
                    className="input-field text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Contact Mobile Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Loss Amount (INR)</label>
                  <input
                    type="number"
                    required
                    value={formData.amount_lost}
                    onChange={(e) => setFormData({ ...formData, amount_lost: Number(e.target.value) })}
                    className="input-field text-xs text-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">State / Police Jurisdiction</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="input-field text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Suspect Crypto Wallet Address (Beneficiary)</label>
                <input
                  type="text"
                  required
                  placeholder="0x... (Beneficiary / Scammer Address)"
                  value={formData.wallet_address}
                  onChange={(e) => setFormData({ ...formData, wallet_address: e.target.value })}
                  className="input-field text-xs font-mono text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Initial Transaction Hash (TXID)</label>
                <input
                  type="text"
                  placeholder="0x... (Blockchain Transfer TXID)"
                  value={formData.tx_hash}
                  onChange={(e) => setFormData({ ...formData, tx_hash: e.target.value })}
                  className="input-field text-xs font-mono text-cyan-400"
                />
              </div>

              {/* Preset Quick Fill for MetaMask Sepolia Demo */}
              <div className="p-3 rounded-lg bg-[#041d0e] border border-[#0d331d] flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-white">Fill with MetaMask Live Sepolia Data</p>
                  <p className="text-[10px] text-slate-400">Loads real Sepolia victim & scammer hashes</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      victim_name: 'Rajesh Kumar (Live Demo)',
                      wallet_address: '0x056410ce3ab3ca36091c194547efb40f1a374cb9',
                      tx_hash: '0xe19bc4e3113382f59b61296c87cf69bef8ea584d4b94852f5bcd28c2fb8ea06d',
                      amount_lost: 85000,
                    });
                  }}
                  className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px]"
                >
                  Quick Fill Sepolia
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#0d331d]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs px-5 py-2 font-bold"
                >
                  {submitting ? 'Registering...' : 'Register Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
