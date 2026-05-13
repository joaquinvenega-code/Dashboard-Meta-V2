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
  
  // Logic 2: Prepaid Funds (Fondos) - New standard Meta API field
  // User's screenshot shows: Total Funds - Owed = Available.
  if (acc.prepaid_balance?.amount) {
    const totalFunds = parseInt(acc.prepaid_balance.amount, 10);
    // Return available funds: Total - Owed
    return (totalFunds - rawBalance) / 100;
  }

  // Logic 3: Legacy/Manual Prepago - Argentina style
  const isPrepaid = acc.is_prepaid_account === true ||
                    acc.funding_source_details?.type === 'PREPAID' || 
                    acc.account_type === '2' || 
                    acc.account_type === 2;

  if (isPrepaid) {
    // Check if fondos are in extended credit (sometimes used for high-volume manual accounts)
    if (acc.extended_credit_invoice_group?.balance?.amount) {
      return parseInt(acc.extended_credit_invoice_group.balance.amount, 10) / 100;
    }

    // In some prepaid accounts, the funds simply show as a negative balance.
    if (rawBalance < 0) return Math.abs(rawBalance) / 100;

    // Last resort: try to parse numeric values from the display string
    // Highly specific to cases where Meta puts the balance in the description
    const display = acc.funding_source_details?.display_string;
    if (display) {
      const match = display.match(/[0-9.,]+/);
      if (match && match[0]) {
        // Clean up formatting (Meta often uses 64.111,59 format in ARS)
        const clean = match[0].replace(/\./g, "").replace(/,/g, ".");
        const val = parseFloat(clean);
        if (!isNaN(val) && val > 5) return val; // Heuristic: valid funds usually > $5
      }
    }
    
    // If it's prepaid but balance is positive, it might still have funds. 
    // If we can't find them, we return null to avoid showing false 0.
  }

  return null;
}
