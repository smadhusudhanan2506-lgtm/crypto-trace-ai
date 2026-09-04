'use client';

import { create } from 'zustand';

interface SidebarState {
  collapsedDesktop: boolean;
  openMobile: boolean;
  toggleDesktop: () => void;
  toggleMobile: () => void;
  setOpenMobile: (open: boolean) => void;
  setCollapsedDesktop: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsedDesktop: false,
  openMobile: false,
  toggleDesktop: () => set((state) => ({ collapsedDesktop: !state.collapsedDesktop })),
  toggleMobile: () => set((state) => ({ openMobile: !state.openMobile })),
  setOpenMobile: (open: boolean) => set({ openMobile: open }),
  setCollapsedDesktop: (collapsed: boolean) => set({ collapsedDesktop: collapsed }),
}));
