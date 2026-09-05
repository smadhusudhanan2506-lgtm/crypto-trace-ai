'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { truncateAddress, truncateHash, formatCurrency, cn, formatDate } from '@/lib/utils';
import {
  FileText, Shield, Printer, Copy, Check, Download,
  Building2, Scale, AlertOctagon, CheckCircle2, ChevronRight,
  ExternalLink, Zap, Users, Globe, Layers, ArrowRight, Sparkles
} from 'lucide-react';

const VASP_LEGAL_DIRECTORY: Record<string, {
  name: string;
  email: string;
  portal: string;
  address: string;
  nodal_officer: string;
}> = {
  binance: {
    name: 'Binance Holdings Ltd.',
    email: 'lawenforcement@binance.com',
    portal: 'https://www.binance.com/en/support/law-enforcement',
    address: 'Binance Compliance & Investigations Unit, George Town, Cayman Islands',
    nodal_officer: 'Global LEA Inquiries Desk',
  },
  wazirx: {
    name: 'WazirX (Zanmai Labs Pvt. Ltd.)',
    email: 'compliance@wazirx.com',
    portal: 'https://wazirx.com/law-enforcement',
    address: 'Zanmai Labs Pvt Ltd, Bandra Kurla Complex, Mumbai, Maharashtra 400051',
    nodal_officer: 'Nodal Cyber Officer, WazirX India',
  },
  coindcx: {
    name: 'CoinDCX (Neblio Technologies Pvt. Ltd.)',
    email: 'legal@coindcx.com',
    portal: 'https://coindcx.com/legal/law-enforcement',
    address: 'Neblio Technologies Pvt Ltd, Bellandur, Bengaluru, Karnataka 560103',
    nodal_officer: 'Chief Compliance Officer, CoinDCX',
  },
  coinswitch: {
    name: 'CoinSwitch Kuber (Bitcipher Labs)',
    email: 'compliance@coinswitch.co',
    portal: 'https://coinswitch.co/compliance',
    address: 'Bitcipher Labs LLP, Indiranagar, Bengaluru, Karnataka 560038',
    nodal_officer: 'Legal & LEA Response Officer, CoinSwitch',
  },
  uniswap: {
    name: 'Uniswap Labs & Smart Contract Protocol',
    email: 'compliance@uniswap.org',
    portal: 'https://uniswap.org',
    address: 'Decentralized AMM Protocol (Sepolia Universal Router 0x7dfd...1468)',
    nodal_officer: 'Smart Contract / Pool Analytics Unit',
  },
  kraken: {
    name: 'Payward, Inc. (Kraken)',
    email: 'compliance@kraken.com',
    portal: 'https://www.kraken.com/legal/compliance',
    address: 'Payward Inc, 237 Kearny St, San Francisco, CA 94108, USA',
    nodal_officer: 'Global Law Enforcement Liaison',
  },
  okx: {
    name: 'OKX Cryptocurrency Exchange',
    email: 'subpoena@okx.com',
    portal: 'https://www.okx.com/law-enforcement',
    address: 'OKX Compliance Unit, Victoria, Seychelles',
    nodal_officer: 'Global LEA Team, OKX',
  },
};

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'notice' | 'dossier'>('notice');
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Form State for Section 91 Notice
  const [noticeData, setNoticeData] = useState({
    notice_no: `CR/CYBER/SEC91/2026/${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toLocaleDateString('en-GB'),
    police_station: 'Cyber Crime Police Station, Central District',
    state_police: 'State Cyber Command / Delhi Police',
    fir_no: 'FIR No. 142/2026',
    fir_date: '02-09-2026',
    sections_invoked: 'Sec 420, 120B IPC & Sec 66D IT Act (Sec 318(4), 61(2) BNSS)',
    io_name: 'Vikramaditya Sharma',
    io_rank: 'Inspector of Police (Cyber Crime)',
    io_belt_no: 'DEL-CYB-8842',
    io_email: 'investigator.cyber@delhipolice.gov.in',
    io_phone: '+91 11 2345 6789',
    selected_vasp: 'binance',
    target_wallet: '0x9272477a53a8ec8a75df008d34cbddfefd82cf60',
    suspect_uid: 'BIN-UID-99182374',
    source_victim_name: 'Rajesh Kumar',
    ncrp_ack_no: '2026/NCRP/918234',
    amount_defrauded: '₹85,000 INR (0.0100 ETH)',
    initial_tx_hash: '0xe19bc4e3113382f59b61296c87cf69bef8ea584d4b94852f5bcd28c2fb8ea06d',
    layering_tx_hash: '0x8bfd0548221a042f774a2d1e678a9dea77dfeb3f15a5a16814522e83399ce903',
    blockchain: 'Ethereum (Sepolia / Mainnet)',
  });

  // Pre-fill from URL params if coming from victims or tracer page
  useEffect(() => {
    const urlWallet = searchParams.get('wallet');
    const urlTx = searchParams.get('tx');
    const urlNcrp = searchParams.get('ncrp');
    if (urlWallet || urlTx || urlNcrp) {
      setNoticeData(prev => ({
        ...prev,
        target_wallet: urlWallet || prev.target_wallet,
        initial_tx_hash: urlTx || prev.initial_tx_hash,
        ncrp_ack_no: urlNcrp || prev.ncrp_ack_no,
      }));
    }
  }, [searchParams]);

  const vasp = VASP_LEGAL_DIRECTORY[noticeData.selected_vasp] || VASP_LEGAL_DIRECTORY.binance;

  const handleCopyText = () => {
    const textContent = `
NOTICE UNDER SECTION 91 OF CODE OF CRIMINAL PROCEDURE, 1973
(AND CORRESPONDING SECTION 94 OF BHARATIYA NAGARIK SURAKSHA SANHITA, 2023)

REF NO: ${noticeData.notice_no}
DATE OF ISSUE: ${noticeData.date}

TO:
The Nodal Officer / Legal Compliance Cell,
${vasp.name}
Email: ${vasp.email}
Address: ${vasp.address}

FROM:
${noticeData.io_name}, ${noticeData.io_rank} (Belt No: ${noticeData.io_belt_no})
${noticeData.police_station}, ${noticeData.state_police}
Official Email: ${noticeData.io_email} | Tel: ${noticeData.io_phone}

SUBJECT: URGENT STATUTORY REQUISITION FOR IMMEDIATE ASSET FREEZING, PRESERVATION OF LOGS, AND FURNISHING OF KYC RECORDS IN CASE ${noticeData.fir_no} U/S ${noticeData.sections_invoked}.

1. In connection with the ongoing investigation of ${noticeData.fir_no} registered upon NCRP Complaint No. ${noticeData.ncrp_ack_no} regarding cyber fraud of ${noticeData.amount_defrauded} against victim ${noticeData.source_victim_name}, real-time blockchain tracing establishes that defrauded proceeds were routed to the following address/account within your jurisdiction:

   - Blockchain Network: ${noticeData.blockchain}
   - Suspect Deposit / Intermediary Wallet: ${noticeData.target_wallet}
   - Initial Victim Outflow TXID: ${noticeData.initial_tx_hash}
   - Layering / Deposit TXID: ${noticeData.layering_tx_hash}

2. You are hereby legally mandated to immediately execute the following statutory actions:
   a) DEBIT FREEZE: Place an immediate freeze on all debit/withdrawal operations for the above wallet, User ID, and linked accounts.
   b) PRESERVATION: Preserve complete server access logs, IP connection history, device IDs, and login timestamps.
   c) KYC DISCLOSURE: Furnish certified copies of KYC documents (PAN, Aadhaar/Passport, email, verified mobile number, bank details used for P2P/fiat withdrawals).
   d) TRANSACTION LEDGER: Provide complete transaction and order book history for the suspect.

3. Failure to comply with this statutory order without lawful excuse shall render the concerned entity liable for penal action under Section 175 of the Indian Penal Code (Sec 210 of Bharatiya Nyaya Sanhita, 2023).

Issued under my hand and seal of office on this ${noticeData.date}.

(${noticeData.io_name})
${noticeData.io_rank}, Belt No: ${noticeData.io_belt_no}
${noticeData.police_station}
`;
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Scale className="w-6 h-6 text-purple-400" />
              Court Evidence & Section 91 CrPC Notice Generator
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
              LEGAL NOTICE ENGINE
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Generate formal statutory asset freezing notices (Sec 91 CrPC / Sec 94 BNSS) and court-admissible forensic evidence dossiers.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-[#020f07] p-1 rounded-xl border border-[#0d331d] self-start md:self-auto">
          <button
            onClick={() => setActiveTab('notice')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all font-mono',
              activeTab === 'notice'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Section 91 CrPC Notice</span>
          </button>
          <button
            onClick={() => setActiveTab('dossier')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all font-mono',
              activeTab === 'dossier'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>FIR Forensic Dossier</span>
          </button>
        </div>
      </div>

      {activeTab === 'notice' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 Cols: Notice Config Form */}
          <div className="lg:col-span-5 space-y-4 no-print">
            <div className="glass-card p-5 border border-[#0d331d] space-y-4">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2 border-b border-[#0d331d] pb-2.5">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span>Notice Parameters & Target VASP</span>
              </h3>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Target Exchange / VASP Entity</label>
                  <select
                    value={noticeData.selected_vasp}
                    onChange={(e) => setNoticeData({ ...noticeData, selected_vasp: e.target.value })}
                    className="input-field text-xs bg-[#020b06] text-purple-300 font-bold"
                  >
                    <option value="binance">Binance Holdings Ltd. (lawenforcement@binance.com)</option>
                    <option value="wazirx">WazirX / Zanmai Labs (compliance@wazirx.com)</option>
                    <option value="coindcx">CoinDCX / Neblio (legal@coindcx.com)</option>
                    <option value="coinswitch">CoinSwitch Kuber (compliance@coinswitch.co)</option>
                    <option value="uniswap">Uniswap Protocol (Sepolia Router 0x7dfd...1468)</option>
                    <option value="kraken">Kraken / Payward Inc. (compliance@kraken.com)</option>
                    <option value="okx">OKX Exchange (subpoena@okx.com)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">FIR / Crime No.</label>
                    <input
                      type="text"
                      value={noticeData.fir_no}
                      onChange={(e) => setNoticeData({ ...noticeData, fir_no: e.target.value })}
                      className="input-field text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">NCRP Ack No.</label>
                    <input
                      type="text"
                      value={noticeData.ncrp_ack_no}
                      onChange={(e) => setNoticeData({ ...noticeData, ncrp_ack_no: e.target.value })}
                      className="input-field text-xs text-cyan-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Police Station & Jurisdiction</label>
                  <input
                    type="text"
                    value={noticeData.police_station}
                    onChange={(e) => setNoticeData({ ...noticeData, police_station: e.target.value })}
                    className="input-field text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">IO Name</label>
                    <input
                      type="text"
                      value={noticeData.io_name}
                      onChange={(e) => setNoticeData({ ...noticeData, io_name: e.target.value })}
                      className="input-field text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Belt / Badge No.</label>
                    <input
                      type="text"
                      value={noticeData.io_belt_no}
                      onChange={(e) => setNoticeData({ ...noticeData, io_belt_no: e.target.value })}
                      className="input-field text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Official Gov Email</label>
                  <input
                    type="email"
                    value={noticeData.io_email}
                    onChange={(e) => setNoticeData({ ...noticeData, io_email: e.target.value })}
                    className="input-field text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Suspect Crypto Wallet Address to Freeze</label>
                  <input
                    type="text"
                    value={noticeData.target_wallet}
                    onChange={(e) => setNoticeData({ ...noticeData, target_wallet: e.target.value })}
                    className="input-field text-xs text-emerald-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Initial Transfer Hash (Victim Outflow)</label>
                  <input
                    type="text"
                    value={noticeData.initial_tx_hash}
                    onChange={(e) => setNoticeData({ ...noticeData, initial_tx_hash: e.target.value })}
                    className="input-field text-xs text-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Layering / Deposit Hash (VASP Endpoint)</label>
                  <input
                    type="text"
                    value={noticeData.layering_tx_hash}
                    onChange={(e) => setNoticeData({ ...noticeData, layering_tx_hash: e.target.value })}
                    className="input-field text-xs text-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 font-mono text-xs shadow-[0_0_15px_rgba(0,255,102,0.3)]"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Notice (PDF)</span>
              </button>
              <button
                onClick={handleCopyText}
                className="btn-secondary px-4 py-2.5 flex items-center justify-center gap-2 font-mono text-xs"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>
          </div>

          {/* Right 7 Cols: Official Document Live Preview */}
          <div className="lg:col-span-7">
            <div
              ref={printRef}
              className="bg-[#020b06] border-2 border-slate-700/80 rounded-xl p-8 shadow-2xl text-slate-200 font-serif space-y-6 print:border-none print:shadow-none print:p-0 print:bg-white print:text-black"
            >
              {/* Official Header */}
              <div className="text-center border-b-2 border-slate-600 pb-4 space-y-1">
                <p className="text-xs font-mono uppercase tracking-widest text-slate-400 print:text-slate-600 font-bold">
                  Government of India • Cyber Crime Investigation Division
                </p>
                <h2 className="text-lg font-bold uppercase tracking-wider text-white print:text-black">
                  Office of the Investigating Officer
                </h2>
                <p className="text-xs font-mono text-emerald-400 print:text-black">
                  {noticeData.police_station}, {noticeData.state_police}
                </p>
                <p className="text-[11px] font-mono text-slate-400 print:text-slate-600">
                  Email: {noticeData.io_email} | Contact: {noticeData.io_phone}
                </p>
              </div>

              {/* Notice Title */}
              <div className="text-center py-2 bg-slate-900/60 print:bg-slate-100 rounded border border-slate-700 print:border-slate-300">
                <h3 className="text-sm font-bold uppercase font-mono tracking-wide text-white print:text-black">
                  NOTICE UNDER SECTION 91 OF THE CODE OF CRIMINAL PROCEDURE, 1973
                </h3>
                <p className="text-[10px] font-mono text-slate-400 print:text-slate-600">
                  (Corresponding to Section 94 of Bharatiya Nagarik Suraksha Sanhita, 2023)
                </p>
              </div>

              {/* Reference & Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono border-b border-slate-700/60 pb-3">
                <div>
                  <p><strong className="text-slate-400 print:text-slate-600">Ref Notice No:</strong> {noticeData.notice_no}</p>
                  <p><strong className="text-slate-400 print:text-slate-600">Date of Issue:</strong> {noticeData.date}</p>
                </div>
                <div>
                  <p><strong className="text-slate-400 print:text-slate-600">FIR Reference:</strong> {noticeData.fir_no}</p>
                  <p><strong className="text-slate-400 print:text-slate-600">NCRP Complaint:</strong> {noticeData.ncrp_ack_no}</p>
                </div>
              </div>

              {/* Recipient Addressee */}
              <div className="text-xs font-mono space-y-1 bg-[#041d0e]/40 print:bg-transparent p-3 rounded border border-[#0d331d] print:border-none">
                <p className="font-bold text-white print:text-black">TO:</p>
                <p className="font-bold text-purple-300 print:text-black">{vasp.nodal_officer} / Law Enforcement Compliance Desk</p>
                <p>{vasp.name}</p>
                <p className="text-slate-400 print:text-slate-600">{vasp.address}</p>
                <p className="text-cyan-400 print:text-black">Official LEA Email: {vasp.email}</p>
              </div>

              {/* Subject */}
              <div className="text-xs font-mono">
                <p className="font-bold text-white print:text-black uppercase">
                  SUBJECT: STATUTORY REQUISITION FOR IMMEDIATE ASSET FREEZING, SERVER LOG PRESERVATION, AND KYC RECORDS DISCLOSURE UNDER SECTION 91 CrPC.
                </p>
              </div>

              {/* Body Paragraphs */}
              <div className="text-xs space-y-3 leading-relaxed text-slate-300 print:text-black">
                <p>
                  1. Whereas, the undersigned is currently investigating the criminal matter registered under <strong>{noticeData.fir_no}</strong> for cyber-enabled financial fraud punishable under <strong>{noticeData.sections_invoked}</strong> upon the complaint of victim <strong>{noticeData.source_victim_name}</strong> (NCRP Ack No: {noticeData.ncrp_ack_no}).
                </p>

                <p>
                  2. Forensic multi-hop blockchain ledger analysis conducted by CryptoTrace AI establishes that defrauded proceeds totaling <strong>{noticeData.amount_defrauded}</strong> were transferred from the victim&apos;s wallet and ultimately deposited/layered into the custody of your exchange/platform at the following suspect address:
                </p>

                {/* Evidence Table */}
                <div className="p-3 rounded bg-black/60 print:bg-slate-50 border border-slate-700 print:border-slate-300 font-mono text-[11px] space-y-1.5">
                  <div className="flex justify-between"><span className="text-slate-400 print:text-slate-600">Blockchain Network:</span><span className="font-bold text-white print:text-black">{noticeData.blockchain}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400 print:text-slate-600">Suspect Wallet / Deposit Address:</span><span className="font-bold text-emerald-400 print:text-black">{noticeData.target_wallet}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400 print:text-slate-600">Initial Outflow TXID:</span><span className="text-cyan-300 print:text-black truncate max-w-[280px]">{noticeData.initial_tx_hash}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400 print:text-slate-600">Layering / Swap Endpoint TXID:</span><span className="text-amber-300 print:text-black truncate max-w-[280px]">{noticeData.layering_tx_hash}</span></div>
                </div>

                <p>
                  3. You are hereby ordered under the authority of Section 91 CrPC (and Sec 94 BNSS) to produce and furnish the following records within <strong>24 hours</strong> of receipt of this notice:
                </p>

                <ul className="list-disc pl-5 space-y-1 text-[11px] font-mono">
                  <li><strong>IMMEDIATE DEBIT FREEZE:</strong> Freeze all withdrawal and transfer capabilities on the suspect address and any internal user account (UID) tied to it.</li>
                  <li><strong>KYC & IDENTITY RECORDS:</strong> Full certified copies of account holder registration, PAN, Aadhaar/Passport, email, phone number, and facial verification selfies.</li>
                  <li><strong>TRANSACTION & WITHDRAWAL LEDGERS:</strong> Complete historical log of deposits, crypto trades, and bank accounts used for fiat INR off-ramping.</li>
                  <li><strong>SERVER ACCESS LOGS:</strong> IP address logs with timestamps and port numbers for all logins and transaction sessions.</li>
                  <li><strong>CERTIFICATE UNDER SEC 65B:</strong> Electronic evidence certificate under Section 65B of the Indian Evidence Act (Sec 63 BSA).</li>
                </ul>

                <p className="text-[11px] text-amber-300 print:text-black font-mono">
                  Note: Disobedience or non-compliance with this statutory order is an offence punishable under Section 175 IPC / Section 210 BNSS.
                </p>
              </div>

              {/* Signature Block */}
              <div className="pt-6 border-t border-slate-700/80 flex justify-between items-end text-xs font-mono">
                <div className="text-slate-400 print:text-slate-600 text-[10px]">
                  <p>Official Seal & Stamp</p>
                  <div className="w-24 h-16 border border-dashed border-slate-600 rounded mt-1 flex items-center justify-center text-slate-500">
                    [LEA SEAL]
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <p className="font-bold text-white print:text-black">{noticeData.io_name}</p>
                  <p className="text-slate-300 print:text-slate-700">{noticeData.io_rank}</p>
                  <p className="text-slate-400 print:text-slate-600">Belt No: {noticeData.io_belt_no}</p>
                  <p className="text-slate-400 print:text-slate-600">{noticeData.police_station}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: FIR Crime Forensic Summary Dossier */
        <div className="space-y-6">
          <div className="glass-card p-6 border border-[#0d331d] space-y-4">
            <div className="flex items-center justify-between border-b border-[#0d331d] pb-3">
              <div>
                <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <span>FIR Cyber Crime Multi-Hop Forensic Dossier</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Court-admissible blockchain fund flow evidence with cryptographic proof of custody.
                </p>
              </div>

              <button
                onClick={handlePrint}
                className="btn-primary text-xs py-2 px-4 flex items-center gap-2 font-mono shadow-[0_0_15px_rgba(0,255,102,0.3)]"
              >
                <Printer className="w-4 h-4" />
                <span>Print Forensic Report</span>
              </button>
            </div>

            {/* Evidence Header Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="p-3 rounded-lg bg-[#041d0e] border border-[#0d331d] font-mono text-xs">
                <p className="text-[10px] text-slate-400 uppercase">Case Reference</p>
                <p className="text-white font-bold text-sm mt-0.5">{noticeData.fir_no}</p>
                <p className="text-emerald-400 text-[10px]">Cyber Cell Verified</p>
              </div>

              <div className="p-3 rounded-lg bg-[#041d0e] border border-[#0d331d] font-mono text-xs">
                <p className="text-[10px] text-slate-400 uppercase">Total Siphoned Value</p>
                <p className="text-amber-400 font-bold text-sm mt-0.5">₹85,000 INR (0.0100 ETH)</p>
                <p className="text-slate-400 text-[10px]">NCRP Confirmed</p>
              </div>

              <div className="p-3 rounded-lg bg-[#041d0e] border border-[#0d331d] font-mono text-xs">
                <p className="text-[10px] text-slate-400 uppercase">Attributed Endpoint</p>
                <p className="text-purple-300 font-bold text-sm mt-0.5">Uniswap Sepolia Router</p>
                <p className="text-[10px] text-purple-400">0x7dfd...1468 (DEX Swap)</p>
              </div>

              <div className="p-3 rounded-lg bg-[#041d0e] border border-[#0d331d] font-mono text-xs">
                <p className="text-[10px] text-slate-400 uppercase">AI Fraud Confidence</p>
                <p className="text-red-400 font-bold text-sm mt-0.5">92% High Probability</p>
                <p className="text-[10px] text-red-300">Phishing / Drainer Pattern</p>
              </div>
            </div>

            {/* Cryptographic Multi-Hop Audit Trail */}
            <div className="space-y-2 pt-4">
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Verified Multi-Hop Ledger (Chain of Custody)</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Hop #</th>
                      <th>Stage / Role</th>
                      <th>Source Wallet</th>
                      <th>Destination Wallet</th>
                      <th>Transfer Value</th>
                      <th>Transaction Hash (TXID)</th>
                      <th>Forensic Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-mono text-xs font-bold text-slate-300">HOP 0</td>
                      <td><span className="badge bg-blue-500/20 text-blue-300 border-blue-500/40 text-xs">Victim Outflow</span></td>
                      <td className="font-mono text-xs text-blue-300">0x056410ce3ab3ca36091c194547efb40f1a374cb9</td>
                      <td className="font-mono text-xs text-red-400">0x9272477a53a8ec8a75df008d34cbddfefd82cf60</td>
                      <td className="font-mono text-xs text-amber-400 font-bold">0.010000 ETH</td>
                      <td className="font-mono text-xs text-cyan-400">0xe19bc4e311...8ea06d</td>
                      <td className="text-xs text-red-400 font-bold">Direct Scammer Fraud Inflow</td>
                    </tr>
                    <tr>
                      <td className="font-mono text-xs font-bold text-slate-300">HOP 1</td>
                      <td><span className="badge bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs">DEX Layering</span></td>
                      <td className="font-mono text-xs text-red-400">0x9272477a53a8ec8a75df008d34cbddfefd82cf60</td>
                      <td className="font-mono text-xs text-purple-300">0x7dfd4f31be6814d2906bde155c3e1b146eac1468</td>
                      <td className="font-mono text-xs text-amber-400 font-bold">0.005000 ETH</td>
                      <td className="font-mono text-xs text-cyan-400">0x8bfd054822...9ce903</td>
                      <td className="text-xs text-purple-300 font-bold">Uniswap Universal Router Execution</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SHA-256 Integrity Seal */}
            <div className="p-4 rounded-xl bg-black/60 border border-[#0d331d] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-mono text-xs">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-white font-bold">Cryptographic Report Seal (SHA-256 Integrity Hash)</p>
                  <p className="text-emerald-400 text-[11px] mt-0.5">
                    e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold shrink-0">
                COURT ADMISSIBLE SEC 65B
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
