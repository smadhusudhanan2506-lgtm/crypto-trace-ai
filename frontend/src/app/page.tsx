'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MatrixBackground from '@/components/layout/MatrixBackground';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { Fingerprint, Eye, EyeOff, ArrowRight, UserPlus, LogIn, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading, hydrate } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    organization: '',
    badge_number: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const res = await authAPI.register({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          organization: form.organization,
          badge_number: form.badge_number,
        });
        login(res.data.access_token, res.data.user);
      } else {
        const res = await authAPI.login({
          email: form.email,
          password: form.password,
        });
        login(res.data.access_token, res.data.user);
      }
      router.push('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || 'Authentication failed. Please check your credentials or click a Quick Login button below.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#020b06] py-10">
      <MatrixBackground />

      {/* Radial and Ambient Matrix Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#00ff66]/10 rounded-full blur-[140px] pointer-events-none z-[1]" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md px-4 animate-slide-up">
        {/* Logo Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00ff66] to-[#059669] mb-3.5 shadow-[0_0_30px_rgba(0,255,102,0.5)] border border-[#00ff66]/40">
            <Fingerprint className="w-8 h-8 text-[#020b06]" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-wider glow-matrix flex items-center justify-center gap-2">
            CryptoTrace<span className="text-[#00ff66]">AI</span>
          </h1>
          <p className="text-xs text-emerald-400/90 font-mono tracking-widest mt-1.5 uppercase">
            BLOCKCHAIN FRAUD INVESTIGATION MATRIX
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-7 border border-[#0d331d] shadow-[0_10px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
          <div className="flex gap-2 mb-5 p-1 bg-[#020f07] rounded-xl border border-[#0d331d]">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                !isRegister
                  ? 'bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/40 shadow-[0_0_15px_rgba(0,255,102,0.2)]'
                  : 'text-emerald-400/70 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                isRegister
                  ? 'bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/40 shadow-[0_0_15px_rgba(0,255,102,0.2)]'
                  : 'text-emerald-400/70 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2 animate-fade-in">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-emerald-300 mb-1 font-mono">Full Name</label>
                  <input
                    type="text"
                    required
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="input-field text-sm"
                    placeholder="Inspector John Doe"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-emerald-300 mb-1 font-mono">Organization</label>
                    <input
                      type="text"
                      value={form.organization}
                      onChange={(e) => setForm({ ...form, organization: e.target.value })}
                      className="input-field text-sm"
                      placeholder="CBI / Cyber Cell"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-emerald-300 mb-1 font-mono">Badge ID</label>
                    <input
                      type="text"
                      value={form.badge_number}
                      onChange={(e) => setForm({ ...form, badge_number: e.target.value })}
                      className="input-field text-sm"
                      placeholder="INV-0001"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-emerald-300 mb-1 font-mono">Email Address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field text-sm"
                placeholder="Enter your email address..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-300 mb-1 font-mono">Access Key / Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field pr-10 text-sm"
                  placeholder="••••••••••••"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500/70 hover:text-[#00ff66] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2 shadow-[0_0_20px_rgba(0,255,102,0.3)] hover:shadow-[0_0_30px_rgba(0,255,102,0.5)]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#020b06]/30 border-t-[#020b06] rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? 'Create Investigator Access' : 'Authenticate & Enter'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Officer Switcher (Simultaneous Multi-User Presets) */}
          {!isRegister && (
            <div className="mt-5 pt-4 border-t border-[#0d331d]/80 space-y-2">
              <p className="text-[11px] font-mono text-emerald-400/90 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Quick Officer Access (Multi-Account Switcher):</span>
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setForm({ ...form, email: 'investigator@cryptotrace.ai', password: 'demo123' });
                  }}
                  className="w-full text-left p-2 rounded-lg bg-[#041d0e]/80 hover:bg-[#072d17] border border-[#0d331d] hover:border-[#00ff66]/40 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#00ff66]/20 text-[#00ff66] flex items-center justify-center text-xs font-bold font-mono">
                      R
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white group-hover:text-[#00ff66]">Inspector Raj Kumar</p>
                      <p className="text-[10px] text-emerald-400/80 font-mono">Senior Investigator • Cyber Cell</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-500 bg-[#00ff66]/10 px-2 py-0.5 rounded border border-[#00ff66]/20">1-Click</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForm({ ...form, email: 'admin@cryptotrace.ai', password: 'admin123' });
                  }}
                  className="w-full text-left p-2 rounded-lg bg-[#041d0e]/80 hover:bg-[#072d17] border border-[#0d331d] hover:border-[#00ff66]/40 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold font-mono">
                      A
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white group-hover:text-cyan-300">National Cyber Bureau Admin</p>
                      <p className="text-[10px] text-cyan-400/80 font-mono">I4C National Command • Chief Admin</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">1-Click</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForm({ ...form, email: 'analyst@cryptotrace.ai', password: 'analyst123' });
                  }}
                  className="w-full text-left p-2 rounded-lg bg-[#041d0e]/80 hover:bg-[#072d17] border border-[#0d331d] hover:border-[#00ff66]/40 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold font-mono">
                      P
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white group-hover:text-purple-300">Priya Sharma (Forensics)</p>
                      <p className="text-[10px] text-purple-400/80 font-mono">FIU-IND • On-Chain Analyst</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">1-Click</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Multi-Tenant info banner */}
        <div className="mt-4 p-3 rounded-xl bg-[#03180c]/80 border border-[#0d331d] text-center space-y-1">
          <p className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
            <span>Multi-User Isolated Sessions Active</span>
          </p>
          <p className="text-[10px] text-slate-400">
            Multiple officers and analysts can log in simultaneously across different browsers/devices with distinct profiles, cases, and forensic reports.
          </p>
        </div>
      </div>
    </div>
  );
}
