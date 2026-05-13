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
  const rawBalance = parseInt(acc.balance || "0", 10);
  
  // Logic 1: Spending Limit (Importe restante) - Luqui Baby style
  if (acc.spend_cap && acc.spend_cap !== "0" && acc.spend_cap !== "null") {
    const cap = parseInt(acc.spend_cap, 10);
    const spent = parseInt(acc.amount_spent || "0", 10);
    if (cap > 0) return (cap - spent) / 100;
  }
  
  // Logic 2: Prepaid Balance (Fondos) - Official Meta API field
  // User's screenshot shows: Total Funds - Owed (Saldo a pagar) = Available.
  if (acc.prepaid_balance?.amount) {
    const totalFunds = parseInt(acc.prepaid_balance.amount, 10);
    // If the account has a debt (positive balance), we subtract it from the total funds
    // to show what's actually "Available" to be spent.
    const debt = Math.max(0, rawBalance);
    return (totalFunds - debt) / 100;
  }

  // Logic 3: Extended Credit Invoice Group
  if (acc.extended_credit_invoice_group?.balance?.amount) {
    return parseInt(acc.extended_credit_invoice_group.balance.amount, 10) / 100;
  }

  // Logic 4: Manual Prepaid/Negative Balance Fallback
  const isPrepaid = acc.is_prepaid_account === true ||
                    acc.funding_source_details?.type === 'PREPAID' || 
                    acc.account_type === '2' || 
                    acc.account_type === 2;

  if (isPrepaid) {
    // In some prepaid accounts, the funds show as a negative balance.
    if (rawBalance < 0) return Math.abs(rawBalance) / 100;

    // Last resort: try to parse numeric values from the display string
    // Only if it looks like a currency string (contains $ or common currency markers)
    const display = acc.funding_source_details?.display_string;
    if (display && (display.includes('$') || display.includes('ARS') || display.includes('Balance') || display.includes('Saldo'))) {
      const match = display.match(/[0-9.,]+/);
      if (match && match[0]) {
        // Clean up format: 64.111,59 -> 64111.59
        const clean = match[0].replace(/\./g, "").replace(/,/g, ".");
        const val = parseFloat(clean);
        // Heuristic: valid balance strings usually have decimals and are not just years or card digits
        if (!isNaN(val) && val > 10 && clean.includes('.')) return val;
      }
    }
  }

  return null;
}
