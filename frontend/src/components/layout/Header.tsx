'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { useSidebarStore } from '@/lib/sidebar';
import { Bell, Search, Shield, Wifi, Menu, LogOut, User as UserIcon, CheckCircle2, Building, BadgeCheck } from 'lucide-react';

interface HeaderProps {
  appMode?: string;
}

export default function Header({ appMode = 'live' }: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { toggleMobile } = useSidebarStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  return (
    <header className="h-14 border-b border-[#0d331d]/80 bg-[#03130a]/88 backdrop-blur-2xl flex items-center justify-between px-4 sm:px-6 z-30 shadow-[0_4px_20px_rgba(0,0,0,0.4)] sticky top-0">
      {/* Mobile Menu Toggle & Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={toggleMobile}
          className="md:hidden p-2 rounded-lg bg-[#041d0e] border border-[#0d331d] text-emerald-400 hover:text-[#00ff66] transition-colors"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative group flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/70 group-focus-within:text-[#00ff66] transition-colors" />
          <input
            type="text"
            placeholder="Search TXID, 0x..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 sm:py-2 rounded-lg bg-[#041d0e]/90 border border-[#0d331d] text-xs sm:text-sm text-[#f0fdf4] placeholder-emerald-600/70 focus:outline-none focus:border-[#00ff66] focus:ring-1 focus:ring-[#00ff66]/30 transition-all font-mono"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Real-time Live Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border font-mono bg-[#00ff66]/15 text-[#00ff66] border-[#00ff66]/40 shadow-[0_0_12px_rgba(0,255,102,0.25)]">
          <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse shadow-[0_0_8px_rgba(0,255,102,0.9)]" />
          <Wifi className="w-3.5 h-3.5 text-[#00ff66]" />
          <span>LIVE ON-CHAIN</span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-emerald-300/80 hover:text-[#00ff66] hover:bg-[#072414] transition-all border border-transparent hover:border-[#0d331d]">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
        </button>

        {/* User Profile Trigger & Dropdown */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2.5 pl-2 border-l border-[#0d331d]/80 hover:opacity-90 transition-opacity text-left"
              title="View Investigator Profile"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00ff66] to-[#059669] flex items-center justify-center text-xs font-bold text-[#020b06] shadow-[0_0_10px_rgba(0,255,102,0.3)]">
                {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-medium text-white truncate max-w-[140px]">{user.full_name}</p>
                <p className="text-[10px] text-emerald-400/80 flex items-center gap-1 font-mono">
                  <Shield className="w-2.5 h-2.5 text-[#00ff66]" />
                  <span>{user.role || 'Investigator'}</span>
                </p>
              </div>
            </button>

            {/* Profile Menu Dropdown */}
            {showProfileMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-[#021309] border border-[#00ff66]/30 shadow-[0_10px_40px_rgba(0,0,0,0.8)] p-3 z-50 animate-fade-in font-sans space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                {/* User Header */}
                <div className="flex items-center gap-3 pb-2.5 border-b border-[#0d331d]">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00ff66] to-[#059669] flex items-center justify-center text-sm font-bold text-[#020b06] shadow-[0_0_10px_rgba(0,255,102,0.3)]">
                    {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-white truncate">{user.full_name}</p>
                    <p className="text-xs text-emerald-400/80 truncate font-mono">{user.email}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-slate-300 font-mono">
                  <div className="flex items-center justify-between py-1 px-2 rounded bg-[#041d0e] border border-[#0d331d]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-[#00ff66]" /> Role:
                    </span>
                    <span className="font-bold text-white uppercase">{user.role}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 px-2 rounded bg-[#041d0e] border border-[#0d331d]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <BadgeCheck className="w-3 h-3 text-cyan-400" /> Badge:
                    </span>
                    <span className="text-cyan-300 font-bold">{user.badge_number || 'INV-2026'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 px-2 rounded bg-[#041d0e] border border-[#0d331d]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Building className="w-3 h-3 text-purple-400" /> Unit:
                    </span>
                    <span className="text-purple-300 truncate max-w-[130px]">{user.organization || 'Cyber Crime Cell'}</span>
                  </div>
                </div>

                {/* Session Active indicator */}
                <div className="p-2 rounded bg-[#00ff66]/10 border border-[#00ff66]/30 text-[11px] font-mono text-emerald-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
                  <span>Isolated Active Investigator Session</span>
                </div>

                {/* Action Buttons */}
                <div className="pt-1 border-t border-[#0d331d] flex gap-2">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleLogout();
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-red-950/40 hover:bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Switch User / Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
