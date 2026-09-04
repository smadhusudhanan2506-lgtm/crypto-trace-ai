/**
 * CryptoTrace AI — Auth Store (Zustand)
 * Manages authentication state with localStorage persistence.
 */
'use client';

import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (token: string, user: User) => void;
  logout: () => void;
  hydrate: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: (token: string, user: User) => {
    localStorage.setItem('cryptotrace_token', token);
    localStorage.setItem('cryptotrace_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('cryptotrace_token');
    localStorage.removeItem('cryptotrace_user');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  hydrate: () => {
    if (typeof window === 'undefined') {
      set({ isLoading: false });
      return;
    }
    const token = localStorage.getItem('cryptotrace_token');
    const userStr = localStorage.getItem('cryptotrace_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        set({ user, token, isAuthenticated: true, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));
