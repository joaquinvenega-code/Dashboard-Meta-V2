import React, { useEffect, useState } from 'react';
import { AccountDetailView } from './AccountDetailView';
import { setFacebookAccessToken } from '../services/facebook';
import { loadWeeklySnapshot } from '../services/weeklyReportData';
import { validatePortfolio, type Portfolio } from '../lib/weeklyReports';
import type { WeeklySnapshot } from '../lib/weeklySnapshot';

declare global {
  interface Window {
    orionWeekly?: {
      load: (input: { portfolio: Portfolio; targetId: string; period: WeeklySnapshot['period']; accessToken: string }) => Promise<void>;
      preview: (snapshot: WeeklySnapshot) => void;
    };
  }
}
const noop = () => {};
export default function WeeklyPrintApp() {
  const [snapshot, setSnapshot] = useState<WeeklySnapshot | null>(null);
  useEffect(() => {
    window.orionWeekly = {
      async load(input) {
        setSnapshot(null);
        setFacebookAccessToken(input.accessToken);
        try { setSnapshot(await loadWeeklySnapshot(validatePortfolio(input.portfolio), input.targetId, input.period)); }
        finally { setFacebookAccessToken(null); }
      },
      preview(value) { setSnapshot(value); },
    };
    return () => { delete window.orionWeekly; setFacebookAccessToken(null); };
  }, []);
  if (!snapshot) return <p>Cargando informe semanal…</p>;
  const { account, portfolio, period } = snapshot;
  return <main data-weekly-ready={account.id}>
    <AccountDetailView key={`${account.id}-${period.since}`} snapshot={snapshot} accounts={[account]} visibleAccountIds={[account.id]}
      accountGroups={portfolio.groups} settings={portfolio.settings} onSaveSettings={noop}
      dateRange={period} setDateRange={noop} isCustomDate={true} setIsCustomDate={noop} onRefresh={noop}
      notes={portfolio.notes} onAddNote={noop} onDeleteNote={noop} clientCategories={portfolio.categories} />
  </main>;
}
