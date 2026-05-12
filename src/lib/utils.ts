import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency: string = 'ARS') {
  const symbols: Record<string, string> = {
    ARS: '$',
    USD: 'U$D ',
    EUR: '€',
    BRL: 'R$ ',
    MXN: '$',
    CLP: '$',
  };
  const sym = symbols[currency] || '$';
  const val = typeof value === 'number' && !isNaN(value) ? value : 0;
  return sym + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(val);
}

export function formatNumber(value: number) {
  const val = typeof value === 'number' && !isNaN(value) ? value : 0;
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(val);
}

export function formatDecimal(value: number, decimals: number = 2) {
  const val = typeof value === 'number' && !isNaN(value) ? value : 0;
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function calculateEffectiveBalance(acc: any) {
  // Logic 1: Spending Limit (Importe restante) - Luqui Baby style
  // Prioritize this if a cap is set and being consumed.
  if (acc.spend_cap && acc.spend_cap !== "0" && acc.spend_cap !== "null") {
    const cap = parseInt(acc.spend_cap, 10);
    const spent = parseInt(acc.amount_spent || "0", 10);
    // If cap is valid and has some usage, or is clearly a "limit" style
    if (cap > 0 && spent > 0) {
      return (cap - spent) / 100;
    }
  }
  
  // Logic 2: Prepaid Funds (Fondos) - Productos de Fierro style
  const funds = parseInt(acc.funding_source_details?.amount || "0", 10);
  const rawBalance = acc.balance || 0; // In Ads API, positive balance is money owed to FB
  
  // If we have funding details with an amount
  if (funds > 0) {
    return (funds - rawBalance) / 100;
  }

  // If it's explicitly a prepaid account, balance often represents the credit (if negative)
  // or the remaining funds if they are tracked in the balance field for some account types.
  if (acc.funding_source_details?.type === 'PREPAID' || acc.account_type === 'PREPAID') {
    if (rawBalance < 0) return Math.abs(rawBalance) / 100;
    return 0;
  }

  // Fallback check for accounts where credit might show as negative balance without funding info
  if (rawBalance < 0) {
    return Math.abs(rawBalance) / 100;
  }

  return null;
}
