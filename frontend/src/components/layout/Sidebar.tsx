'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { useSidebarStore } from '@/lib/sidebar';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Search, FileSearch, Network, Shield,
  Users, Archive, FileText, Bell, ScrollText, Settings,
  ChevronLeft, ChevronRight, LogOut, Fingerprint, Wallet,
  Activity, Globe, X,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/investigations', label: 'Investigations', icon: FileSearch },
  { href: '/tracer', label: 'TXID Tracer', icon: Search },
  { href: '/graph', label: 'Transaction Graph', icon: Network },
  { href: '/analytics', label: 'Analytics', icon: Activity },
  { href: '/vasp', label: 'VASP Intelligence', icon: Globe },
  { href: '/victims', label: 'Victims', icon: Users },
  { href: '/evidence', label: 'Evidence', icon: Archive },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/audit', label: 'Audit Logs', icon: ScrollText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { collapsedDesktop, openMobile, toggleDesktop, setOpenMobile } = useSidebarStore();

  return (
    <>
      {/* Mobile Backdrop */}
      {openMobile && (
        <div
          onClick={() => setOpenMobile(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden animate-fade-in"
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300',
          'bg-[#03130a]/96 backdrop-blur-2xl border-r border-[#0d331d]/90 shadow-[4px_0_30px_rgba(0,0,0,0.6)]',
          // Desktop sizing
          collapsedDesktop ? 'md:w-[68px]' : 'md:w-[260px]',
          // Mobile drawer slide
          openMobile ? 'translate-x-0 w-[270px]' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo & Mobile Close */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-[#0d331d]/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00ff66] to-[#059669] flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,255,102,0.4)]">
              <Fingerprint className="w-5 h-5 text-[#020b06]" />
            </div>
            {(!collapsedDesktop || openMobile) && (
              <div className="overflow-hidden">
                <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                  <span>CryptoTrace</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] animate-pulse" />
                </h1>
                <p className="text-[10px] text-[#00ff66]/90 font-mono uppercase tracking-widest">CYBER INVESTIGATOR</p>
              </div>
            )}
          </div>

          {/* Mobile close X button */}
          <button
            onClick={() => setOpenMobile(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#072414]"
            title="Close Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto scrollbar-thin">
          <ul className="space-y-1 px-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/');
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpenMobile(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      'hover:bg-[#072414] hover:text-white group',
                      isActive
                        ? 'bg-[#00ff66]/15 text-[#00ff66] border border-[#00ff66]/40 shadow-[0_0_16px_rgba(0,255,102,0.18)] font-semibold'
                        : 'text-emerald-100/70 border border-transparent'
                    )}
                    title={collapsedDesktop && !openMobile ? label : undefined}
                  >
                    <Icon className={cn(
                      'w-[18px] h-[18px] shrink-0 transition-colors',
                      isActive ? 'text-[#00ff66] drop-shadow-[0_0_8px_rgba(0,255,102,0.6)]' : 'text-emerald-500/70 group-hover:text-emerald-300'
                    )} />
                    {(!collapsedDesktop || openMobile) && <span>{label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User & Collapse */}
        <div className="border-t border-[#0d331d]/80 p-3 shrink-0 space-y-2 bg-[#020f07]/80">
          {/* User info */}
          {user && (!collapsedDesktop || openMobile) && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#041d0e]/60 border border-[#0d331d]/60">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00ff66] to-[#059669] flex items-center justify-center text-xs font-bold text-[#020b06] shrink-0 shadow-[0_0_10px_rgba(0,255,102,0.3)]">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-white truncate">{user.full_name}</p>
                <p className="text-[10px] text-emerald-400/80 truncate font-mono">{user.role}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={logout}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                'text-emerald-400/70 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent',
                collapsedDesktop && !openMobile ? 'w-full justify-center' : 'flex-1'
              )}
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              {(!collapsedDesktop || openMobile) && <span>Logout</span>}
            </button>

            <button
              onClick={toggleDesktop}
              className="hidden md:flex p-2 rounded-lg text-emerald-400/70 hover:text-[#00ff66] hover:bg-[#072414] transition-all border border-transparent hover:border-[#0d331d]"
              title={collapsedDesktop ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsedDesktop ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
