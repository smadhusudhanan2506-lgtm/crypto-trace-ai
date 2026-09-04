'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/auth';
import { useSidebarStore } from '@/lib/sidebar';
import { Bell, Search, Shield, Wifi, WifiOff, Menu } from 'lucide-react';

interface HeaderProps {
  appMode?: string;
}

export default function Header({ appMode = 'demo' }: HeaderProps) {
  const { user } = useAuthStore();
  const { toggleMobile } = useSidebarStore();
  const [searchQuery, setSearchQuery] = useState('');
  const isLive = appMode === 'live';

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
        {/* Mode Badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border font-mono ${
          isLive
            ? 'bg-[#00ff66]/15 text-[#00ff66] border-[#00ff66]/40 shadow-[0_0_10px_rgba(0,255,102,0.2)]'
            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
        }`}>
          {isLive ? <Wifi className="w-3 h-3 text-[#00ff66]" /> : <WifiOff className="w-3 h-3" />}
          {isLive ? 'LIVE' : 'DEMO'}
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-emerald-300/80 hover:text-[#00ff66] hover:bg-[#072414] transition-all border border-transparent hover:border-[#0d331d]">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
        </button>

        {/* User Avatar */}
        {user && (
          <div className="flex items-center gap-2.5 pl-2 border-l border-[#0d331d]/80">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00ff66] to-[#059669] flex items-center justify-center text-xs font-bold text-[#020b06] shadow-[0_0_10px_rgba(0,255,102,0.3)]">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-medium text-white">{user.full_name}</p>
              <p className="text-[10px] text-emerald-400/80 flex items-center gap-1 font-mono">
                <Shield className="w-2.5 h-2.5 text-[#00ff66]" />
                {user.role}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
