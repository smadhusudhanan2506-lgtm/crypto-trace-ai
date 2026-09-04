'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import MatrixBackground from '@/components/layout/MatrixBackground';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { configAPI } from '@/lib/api';

import { useSidebarStore } from '@/lib/sidebar';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, hydrate } = useAuthStore();
  const { collapsedDesktop } = useSidebarStore();
  const router = useRouter();
  const [appMode, setAppMode] = useState('demo');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    configAPI.config().then((res) => {
      setAppMode(res.data.mode);
    }).catch(() => {});
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020b06]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-[#00ff66] rounded-full animate-spin mx-auto mb-4 shadow-[0_0_20px_rgba(0,255,102,0.3)]" />
          <p className="text-sm text-emerald-400 font-mono tracking-wider">INITIALIZING CRYPTOTRACE MATRIX...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#020b06] text-[#f0fdf4]">
      <MatrixBackground />
      <Sidebar />
      <div className={cn(
        'min-h-screen relative flex flex-col transition-all duration-300',
        collapsedDesktop ? 'md:ml-[68px]' : 'md:ml-[260px]',
        'ml-0'
      )}>
        <Header appMode={appMode} />
        <main className="p-3 sm:p-4 md:p-6 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
