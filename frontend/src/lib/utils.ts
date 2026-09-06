/**
 * CryptoTrace AI — Utility Functions
 */

/** Format a number as currency (INR by default, with robust NaN / wei / large number handling) */
export function formatCurrency(amount: number | string | null | undefined, currency = 'INR'): string {
  if (amount === null || amount === undefined || amount === '') {
    return (currency || 'INR').toUpperCase() === 'INR' ? '₹0.00' : '$0.00';
  }

  let num: number;
  if (typeof amount === 'number') {
    num = amount;
  } else if (typeof amount === 'string') {
    const cleaned = amount.replace(/[^0-9.-]+/g, '');
    num = parseFloat(cleaned);
  } else {
    num = 0;
  }

  if (isNaN(num) || !isFinite(num)) {
    return (currency || 'INR').toUpperCase() === 'INR' ? '₹0.00' : '$0.00';
  }

  // Auto-detect and normalize wei (e.g. > 10^12) if raw blockchain wei is passed into currency formatter
  if (num > 1e12) {
    num = num / 1e18;
  }

  const curr = (currency || 'INR').toUpperCase();
  if (curr === 'INR') {
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      }).format(num);
    } catch {
      return `₹${num.toLocaleString('en-IN')}`;
    }
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(num);
  } catch {
    return `$${num.toLocaleString('en-US')}`;
  }
}

/** Format a crypto amount with appropriate precision */
export function formatCrypto(amount: number, asset = 'BTC'): string {
  const decimals = asset === 'BTC' ? 8 : asset === 'ETH' ? 6 : 2;
  return `${amount.toFixed(decimals)} ${asset}`;
}

/** Truncate a blockchain address for display */
export function truncateAddress(address: string, chars = 6): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/** Truncate a tx hash for display */
export function truncateHash(hash: string, chars = 8): string {
  if (!hash) return '';
  if (hash.length <= chars * 2 + 3) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

/** Format a date string to a human-readable format */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Get relative time (e.g., "2 hours ago") */
export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(dateStr);
}

/** Get color classes for risk score */
export function getRiskColor(score: number): string {
  if (score >= 80) return 'text-red-400';
  if (score >= 60) return 'text-orange-400';
  if (score >= 40) return 'text-amber-400';
  if (score >= 20) return 'text-yellow-400';
  return 'text-green-400';
}

/** Get background color class for risk level */
export function getRiskBg(score: number): string {
  if (score >= 80) return 'bg-red-500/20 border-red-500/30';
  if (score >= 60) return 'bg-orange-500/20 border-orange-500/30';
  if (score >= 40) return 'bg-amber-500/20 border-amber-500/30';
  if (score >= 20) return 'bg-yellow-500/20 border-yellow-500/30';
  return 'bg-green-500/20 border-green-500/30';
}

/** Get priority badge info */
export function getPriorityInfo(priority: string): { label: string; color: string; bg: string } {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    critical: { label: 'P1 Critical', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/40' },
    high: { label: 'P2 High', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/40' },
    medium: { label: 'P3 Medium', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/40' },
    low: { label: 'P4 Low', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/40' },
    info: { label: 'P5 Info', color: 'text-slate-400', bg: 'bg-slate-500/20 border-slate-500/40' },
  };
  return map[priority] || map['medium'];
}

/** Get status badge info */
export function getStatusInfo(status: string): { label: string; color: string; bg: string } {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    open: { label: 'Open', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/40' },
    active: { label: 'Active', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/40' },
    investigating: { label: 'Investigating', color: 'text-cyan-400', bg: 'bg-cyan-500/20 border-cyan-500/40' },
    pending_report: { label: 'Pending Report', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/40' },
    closed: { label: 'Closed', color: 'text-slate-400', bg: 'bg-slate-500/20 border-slate-500/40' },
    archived: { label: 'Archived', color: 'text-slate-500', bg: 'bg-slate-600/20 border-slate-600/40' },
  };
  return map[status] || { label: status, color: 'text-slate-400', bg: 'bg-slate-500/20 border-slate-500/40' };
}

/** Get severity badge info for alerts */
export function getSeverityInfo(severity: string): { color: string; bg: string } {
  const map: Record<string, { color: string; bg: string }> = {
    critical: { color: 'text-red-400', bg: 'bg-red-500/20' },
    high: { color: 'text-orange-400', bg: 'bg-orange-500/20' },
    medium: { color: 'text-amber-400', bg: 'bg-amber-500/20' },
    low: { color: 'text-blue-400', bg: 'bg-blue-500/20' },
  };
  return map[severity] || map['medium'];
}

/** Classnames helper (simplified) */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
