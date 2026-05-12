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
  // Meta API values for spend_cap, amount_spent and balance are in cents (base currency unit * 100)
  
  // Logic 1: Spending Limit (Importe restante)
  if (acc.spend_cap && acc.spend_cap !== "0" && acc.spend_cap !== "null") {
    const cap = parseInt(acc.spend_cap, 10);
    const spent = parseInt(acc.amount_spent || "0", 10);
    if (cap > 0) return (cap - spent) / 100;
  }
  
  // Logic 2: Prepaid Funds (Fondos)
  // funding_source_details.amount usually represents the wallet balance
  if (acc.funding_source_details?.amount) {
    const funds = parseInt(acc.funding_source_details.amount, 10);
    const owed = acc.balance || 0;
    return (funds - owed) / 100;
  }

  // Fallback: If no cap and no specific funds, we might just have the balance.
  // But standard post-paid accounts don't really have a "remaining" amount unless there's a cap.
  return null;
}
