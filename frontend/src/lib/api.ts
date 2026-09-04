/**
 * CryptoTrace AI — API Client
 * Axios-based HTTP client with JWT interceptor.
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor: attach JWT token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('cryptotrace_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: handle 401 (token expired)
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('cryptotrace_token');
      localStorage.removeItem('cryptotrace_user');
      // Don't redirect if already on login page
      if (!window.location.pathname.includes('/login') && window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth Endpoints ──────────────────────────────────────────────────────────
import type {
  LoginRequest, RegisterRequest, TokenResponse,
  CaseCreate, Case, CaseListResponse, CaseNote,
  VictimCreate, Victim,
  TraceRequest, TraceResponse, TraceDetail, TraceHop, TraceStatus,
  RiskAnalysis, Evidence, AuditLog, Alert,
  DashboardStats, AppConfig, NormalizedTransaction, ChainIdentification,
  AIAssessment,
} from '@/types';

export const authAPI = {
  login: (data: LoginRequest) =>
    api.post<TokenResponse>('/api/auth/login', data),
  register: (data: RegisterRequest) =>
    api.post<TokenResponse>('/api/auth/register', data),
  me: () =>
    api.get('/api/auth/me'),
};

// ─── Cases ───────────────────────────────────────────────────────────────────
export const casesAPI = {
  list: (params?: { skip?: number; limit?: number; status?: string; priority?: string }) =>
    api.get<CaseListResponse>('/api/cases', { params }),
  get: (id: string) =>
    api.get<Case>(`/api/cases/${id}`),
  create: (data: CaseCreate) =>
    api.post<Case>('/api/cases', data),
  update: (id: string, data: Partial<Case>) =>
    api.patch<Case>(`/api/cases/${id}`, data),
  stats: () =>
    api.get<DashboardStats>('/api/cases/stats'),
  addNote: (caseId: string, content: string) =>
    api.post<CaseNote>(`/api/cases/${caseId}/notes`, { content }),
  getNotes: (caseId: string) =>
    api.get<CaseNote[]>(`/api/cases/${caseId}/notes`),
};

// ─── Victims ─────────────────────────────────────────────────────────────────
export const victimsAPI = {
  list: (caseId: string) =>
    api.get<Victim[]>(`/api/cases/${caseId}/victims`),
  create: (caseId: string, data: VictimCreate) =>
    api.post<Victim>(`/api/cases/${caseId}/victims`, data),
};

// ─── Tracing ─────────────────────────────────────────────────────────────────
export const tracingAPI = {
  start: (data: TraceRequest) =>
    api.post<TraceResponse>('/api/traces', data),
  list: () =>
    api.get<TraceDetail[]>('/api/traces'),
  get: (traceId: string) =>
    api.get<TraceDetail>(`/api/traces/${traceId}`),
  status: (traceId: string) =>
    api.get<TraceStatus>(`/api/traces/${traceId}/status`),
  hops: (traceId: string) =>
    api.get<TraceHop[]>(`/api/traces/${traceId}/hops`),
};

// ─── Blockchain ──────────────────────────────────────────────────────────────
export const blockchainAPI = {
  chains: () =>
    api.get('/api/blockchain/chains'),
  identify: (value: string) =>
    api.get<ChainIdentification>(`/api/blockchain/identify/${encodeURIComponent(value)}`),
  getTransaction: (chain: string, txHash: string) =>
    api.get<NormalizedTransaction>(`/api/blockchain/tx/${chain}/${txHash}`),
  getAddress: (chain: string, address: string) =>
    api.get(`/api/blockchain/address/${chain}/${address}`),
  getAddressTransactions: (chain: string, address: string, limit = 20) =>
    api.get<NormalizedTransaction[]>(`/api/blockchain/address/${chain}/${address}/transactions`, { params: { limit } }),
};

// ─── Analytics ───────────────────────────────────────────────────────────────
export const analyticsAPI = {
  risk: (data: { case_id?: string; trace_id?: string; victim_count?: number; reported_amount?: number }) =>
    api.post<RiskAnalysis>('/api/analytics/risk', data),
  aiInvestigation: (data: { trace_id?: string; case_id?: string }) =>
    api.post<AIAssessment>('/api/analytics/ai-investigation', data),
  getTraceAIInvestigation: (traceId: string) =>
    api.get<AIAssessment>(`/api/analytics/trace/${traceId}/ai-investigation`),
};

// ─── Evidence ────────────────────────────────────────────────────────────────
export const evidenceAPI = {
  list: (caseId?: string) =>
    api.get<Evidence[]>('/api/evidence', { params: caseId ? { case_id: caseId } : {} }),
};

// ─── Audit ───────────────────────────────────────────────────────────────────
export const auditAPI = {
  list: (limit = 50) =>
    api.get<AuditLog[]>('/api/audit-logs', { params: { limit } }),
};

// ─── Alerts ──────────────────────────────────────────────────────────────────
export const alertsAPI = {
  list: (params?: { case_id?: string; status?: string }) =>
    api.get<Alert[]>('/api/alerts', { params }),
};

// ─── App Config ──────────────────────────────────────────────────────────────
export const configAPI = {
  health: () => api.get('/api/health'),
  config: () => api.get<AppConfig>('/api/config'),
};
