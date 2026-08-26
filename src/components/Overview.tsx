import React from 'react';
import { format, parseISO } from 'date-fns';
import { AdAccount, AccountSettings, ClientCategory } from '../types';
import { cn, formatCurrency, formatDecimal } from '../lib/utils';
import { RocketLoader } from './AccountDetailView';

interface OverviewProps {
  accounts: AdAccount[];
  settings: Record<string, AccountSettings>;
  dateRange: { since: string; until: string };
  clientCategories: ClientCategory[];
  filterCategoryId: string;
  onFilterCategoryChange: (categoryId: string) => void;
  loading?: boolean;
}

export function Overview({
  accounts,
  settings,
  dateRange,
  clientCategories,
  filterCategoryId,
  onFilterCategoryChange,
  loading = false,
}: OverviewProps) {
  const periodKey = format(parseISO(dateRange.since), 'yyyy-MM');

  const getManualRevenue = (accountSettings: AccountSettings | undefined) => {
    if (!accountSettings) return 0;

    if (accountSettings.offlineSalesLogByMonth) {
      const entries = Object.values(accountSettings.offlineSalesLogByMonth).flatMap((list) =>
        Array.isArray(list) ? list : [],
      );
      if (entries.length > 0) {
        return entries
          .filter((entry) => entry.date >= dateRange.since && entry.date <= dateRange.until)
          .reduce((sum, entry) => sum + entry.amount, 0);
      }
    }

    return accountSettings.manualRevenueByMonth?.[periodKey] || 0;
  };

  const totalsByCurrency: Record<string, { spend: number; revenue: number }> = {};
  accounts.forEach((account) => {
    const accountSettings = settings[account.id];
    const currency = (accountSettings?.currency || account.currency || 'ARS').toUpperCase();
    if (!totalsByCurrency[currency]) totalsByCurrency[currency] = { spend: 0, revenue: 0 };
    totalsByCurrency[currency].spend += account.spend || 0;
    totalsByCurrency[currency].revenue += (account.revenue || 0) + getManualRevenue(accountSettings);
  });

  const currencies = Object.keys(totalsByCurrency);
  const totalSpend = currencies.length
    ? currencies.map((currency) => formatCurrency(totalsByCurrency[currency].spend, currency)).join(' + ')
    : '—';
  const totalRevenue = currencies.length
    ? currencies.map((currency) => formatCurrency(totalsByCurrency[currency].revenue, currency)).join(' + ')
    : '—';

  const globalSpend = accounts.reduce((sum, account) => sum + (account.spend || 0), 0);
  const globalRevenue = accounts.reduce(
    (sum, account) => sum + (account.revenue || 0) + getManualRevenue(settings[account.id]),
    0,
  );
  const averageRoas = globalSpend > 0 ? globalRevenue / globalSpend : 0;
  const accountsOnTarget = accounts.filter((account) => {
    const accountSettings = settings[account.id];
    if (!accountSettings?.objective) return false;
    return (account.revenue || 0) + getManualRevenue(accountSettings) >= accountSettings.objective;
  }).length;

  const filterOptions = [
    { id: 'all', label: 'Todos' },
    ...clientCategories.map((category) => ({ id: category.id, label: category.name })),
  ];

  if (loading) return <RocketLoader />;

  return (
    <section aria-label="Resumen de la cartera" className="space-y-4">
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar">
        {filterOptions.map((option) => (
          <button
            type="button"
            key={option.id}
            onClick={() => onFilterCategoryChange(option.id)}
            aria-pressed={filterCategoryId === option.id}
            className={cn(
              'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              filterCategoryId === option.id
                ? 'bg-blue-500/12 text-blue-300 ring-1 ring-inset ring-blue-400/20'
                : 'text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-300',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard label="Inversión general" value={totalSpend} note="Reportado por Meta" />
        <SummaryCard label="Facturación general" value={totalRevenue} note="Período seleccionado" />
        <SummaryCard label="ROAS general" value={`×${formatDecimal(averageRoas, 1)}`} note="Promedio de la cartera" />
        <SummaryCard
          label="Cuentas en objetivo"
          value={`${accountsOnTarget} / ${accounts.length}`}
          note="Según objetivos configurados"
        />
      </div>
    </section>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="min-w-0 rounded-xl border border-white/[0.07] bg-[#12161d] px-4 py-3.5">
      <p className="text-[11px] font-medium text-neutral-500">{label}</p>
      <p className="mt-2 truncate text-xl font-semibold tracking-[-0.025em] text-neutral-100 tabular-nums" title={value}>
        {value}
      </p>
      <p className="mt-1 text-[10px] text-neutral-600">{note}</p>
    </article>
  );
}
