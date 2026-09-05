'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MatrixBackground from '@/components/layout/MatrixBackground';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { Fingerprint, Eye, EyeOff, ArrowRight, UserPlus, LogIn, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        </div>

        {/* Demo credentials hint */}
        <div className="mt-3.5 text-center">
          <p className="text-[11px] text-emerald-500/70 font-mono">
            SECURE ACCESS PORTAL — READY FOR INVESTIGATION
          </p>
        </div>
      </div>
    </div>
  );
}
