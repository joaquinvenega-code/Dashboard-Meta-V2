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
    if (cap > 0) {
      return (cap - spent) / 100;
    }
  }
  
  // Logic 2: Prepaid Funds (Fondos) - Productos de Fierro style
  // funding_source_details.amount typically represents the wallet/prepaid balance
  const funds = parseInt(acc.funding_source_details?.amount || "0", 10);
  
  if (funds > 0) {
    // Return the gross funds as requested specifically by the user
    return funds / 100;
  }

  // Logic 3: Explicit Prepaid accounts with negative balance representing credit
  // Only use this if we are SURE it's a prepaid account to avoid showing credit on postpaid ones.
  const isPrepaid = acc.funding_source_details?.type === 'PREPAID' || 
                    acc.account_type === 2 || // Meta often uses 2 for Prepaid
                    acc.account_type === 'PREPAID';

  if (isPrepaid) {
    const rawBalance = acc.balance || 0;
    if (rawBalance < 0) return Math.abs(rawBalance) / 100;
    return 0;
  }

  return null;
}
