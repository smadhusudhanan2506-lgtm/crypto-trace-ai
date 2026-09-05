'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { vaspAPI } from '@/lib/api';
import { truncateAddress } from '@/lib/utils';
import {
  Globe, Search, ShieldAlert, ShieldCheck, ExternalLink,
  Copy, Check, Zap, Building2, Cpu, Shuffle, Layers
} from 'lucide-react';

interface VaspAddress {
  address: string;
  chain: string;
  label: string;
  source: string;
}

interface VaspEntity {
  name: string;
  entity_type: string;
  addresses: VaspAddress[];
  confidence: number;
  source: string;
}

export default function VASPPage() {
  const [entities, setEntities] = useState<VaspEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  useEffect(() => {
    vaspAPI.entities()
      .then((res) => setEntities(res.data))
      .catch((err) => console.error('Failed to load VASP entities:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  const filtered = entities.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.addresses.some((a) => a.address.toLowerCase().includes(search.toLowerCase()) || a.label.toLowerCase().includes(search.toLowerCase()));

    const matchesType =
      selectedType === 'all' ||
      (selectedType === 'exchange' && e.entity_type === 'exchange' && !e.name.includes('Uniswap')) ||
      (selectedType === 'dex' && (e.entity_type === 'defi_protocol' || e.name.includes('Uniswap') || e.name.includes('Aave'))) ||
      (selectedType === 'mixer' && e.entity_type === 'mixer');

    return matchesSearch && matchesType;
  });

  const totalAddresses = entities.reduce((sum, e) => sum + e.addresses.length, 0);
  const exchangeCount = entities.filter(e => e.entity_type === 'exchange').length;
  const mixerCount = entities.filter(e => e.entity_type === 'mixer').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-purple-400" />
            VASP & Exchange Intelligence Directory
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Verified database of centralized exchanges, DEX routers, and privacy mixers for automated attribution
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 uppercase font-mono flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            Verified Entities
          </p>
          <p className="text-2xl font-bold text-white mt-1">{entities.length}</p>
          <p className="text-[11px] text-emerald-400 mt-0.5">Automated attribution</p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 uppercase font-mono flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Indexed Hot Wallets
          </p>
          <p className="text-2xl font-bold text-cyan-400 mt-1">{totalAddresses}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">EVM & Mainnet signatures</p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 uppercase font-mono flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            Major Exchanges
          </p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{exchangeCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Binance, Coinbase, Kraken, etc.</p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 uppercase font-mono flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            Mixers & High-Risk
          </p>
          <p className="text-2xl font-bold text-red-400 mt-1">{mixerCount}</p>
          <p className="text-[11px] text-red-300/80 mt-0.5">Tornado Cash & Anonymizers</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full md:w-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by entity name (e.g. Binance, Uniswap) or wallet address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 text-sm w-full"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Entities' },
            { id: 'exchange', label: 'Centralized Exchanges (CEX)' },
            { id: 'dex', label: 'DEX & DeFi Routers' },
            { id: 'mixer', label: 'Mixers / Anonymizers' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedType === tab.id
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'bg-[#041d0e] text-slate-400 hover:text-white border border-[#0d331d]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((entity) => (
            <div key={entity.name} className="glass-card p-5 hover:border-purple-500/40 transition-all space-y-4">
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{entity.name}</h3>
                    <span className={`badge text-[10px] uppercase ${
                      entity.entity_type === 'mixer'
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : entity.name.includes('Uniswap') || entity.name.includes('Aave')
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                        : 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                    }`}>
                      {entity.entity_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Source: {entity.source}</p>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3" />
                    {Math.round(entity.confidence * 100)}% Confidence
                  </span>
                </div>
              </div>

              {/* Address List */}
              <div className="space-y-2 pt-2 border-t border-[#1e293b]/60">
                <p className="text-[11px] text-slate-400 font-mono uppercase">
                  Known Deposit & Hot Wallet Addresses ({entity.addresses.length}):
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {entity.addresses.map((addr) => (
                    <div
                      key={addr.address}
                      className="p-2 rounded-lg bg-[#020b06] border border-[#0d331d] flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                          {addr.chain}
                        </span>
                        <span className="text-slate-300 truncate" title={addr.address}>
                          {truncateAddress(addr.address)}
                        </span>
                        <span className="text-[10px] text-slate-500 hidden sm:inline truncate">
                          ({addr.label})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(addr.address)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="Copy address"
                        >
                          {copiedAddr === addr.address ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <Link
                          href={`/tracer?input=${addr.address}&chain=${addr.chain}`}
                          className="p-1 rounded hover:bg-slate-800 text-purple-400 hover:text-purple-300 transition-colors"
                          title="Trace this wallet"
                        >
                          <Zap className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-16 text-slate-500 glass-card">
              No matching VASP entities found for &quot;{search}&quot;.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
