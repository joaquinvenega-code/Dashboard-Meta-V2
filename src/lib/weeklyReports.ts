import type { AccountGroup, AccountNote, AccountSettings, AdAccount, ClientCategory, DailyMetric } from '../types';

export interface Portfolio {
  version: 1;
  settings: Record<string, AccountSettings>;
  groups: AccountGroup[];
  categories: ClientCategory[];
  visibleAccountIds: string[];
  notes: AccountNote[];
}

export const cleanAccountId = (id: string) => id.replace(/^act_/i, '');
export const metaAccountId = (id: string) => `act_${cleanAccountId(id)}`;

export function portfolioFingerprint(value: unknown): string {
  const ordered = (v: any): any => Array.isArray(v) ? v.map(ordered) : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => [k, ordered(v[k])])) : v;
  return JSON.stringify(ordered(value));
}

export function validatePortfolio(value: unknown): Portfolio {
  const p = value as Portfolio;
  if (!p || p.version !== 1 || !p.settings || typeof p.settings !== 'object' || Array.isArray(p.settings)
    || !Array.isArray(p.groups) || !Array.isArray(p.categories) || !Array.isArray(p.visibleAccountIds)
    || !Array.isArray(p.notes) || p.visibleAccountIds.some(id => typeof id !== 'string')
    || p.groups.some(g => !g || typeof g.id !== 'string' || typeof g.name !== 'string' || !Array.isArray(g.accountIds) || g.accountIds.some(id => typeof id !== 'string'))
    || p.categories.some(c => !c || typeof c.id !== 'string' || typeof c.name !== 'string')
    || Object.values(p.settings).some(s => !s || !['ecommerce', 'messaging', 'both', 'all', 'leads'].includes(s.tracking))) {
    throw new Error('La cartera guardada no tiene un formato válido.');
  }
  if (new TextEncoder().encode(JSON.stringify(p)).length > 800_000) {
    throw new Error('La cartera supera el tamaño permitido. Exportá un respaldo antes de reducir las notas o logos.');
  }
  return p;
}

export function detailOptions(settings?: AccountSettings): NonNullable<AccountSettings['detailReport']> {
  const saved = settings?.detailReport;
  return {
    topN: [3, 5].includes(saved?.topN) ? saved!.topN : 5,
    sortBy: saved && ['roas', 'messages', 'leads', 'purchases', 'revenue', 'spend'].includes(saved.sortBy)
      ? saved.sortBy : settings?.tracking === 'messaging' ? 'messages' : settings?.tracking === 'leads' ? 'leads' : 'roas',
    showMetrics: saved?.showMetrics !== false,
    showObservations: saved?.showObservations === true,
  };
}

export function offlineRevenueForPeriod(settings: AccountSettings | undefined, since: string, until: string): number {
  const entries = Object.values(settings?.offlineSalesLogByMonth || {}).flat();
  if (entries.length) return entries.filter(e => e.date >= since && e.date <= until).reduce((sum, e) => sum + e.amount, 0);
  const month = since.slice(0, 7);
  const end = new Date(`${month}-01T12:00:00Z`); end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0);
  const fullMonth = since === `${month}-01` && until === end.toISOString().slice(0, 10);
  return fullMonth ? settings?.manualRevenueByMonth?.[month] || 0 : 0;
}

export function trackingMetrics(tracking: AccountSettings['tracking']): string[] {
  if (tracking === 'messaging') return ['messages', 'cpm_real', 'spend', 'total_revenue', 'roas', 'ctr'];
  if (tracking === 'leads') return ['leads', 'cpl', 'spend', 'total_revenue', 'roas', 'ctr'];
  if (tracking === 'both') return ['messages', 'cpm_real', 'purchases', 'spend', 'total_revenue', 'roas', 'ctr'];
  if (tracking === 'all') return ['messages', 'leads', 'purchases', 'spend', 'total_revenue', 'roas', 'ctr'];
  return ['spend', 'total_revenue', 'roas', 'purchases', 'objective', 'progress_revenue', 'progress_budget', 'ctr'];
}

/** Calendar weeks in Argentina; independent of the runner's local time zone. */
export function previousWeek(now = new Date()): { since: string; until: string } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const field = (name: string) => parts.find(p => p.type === name)!.value;
  const monday = new Date(`${field('year')}-${field('month')}-${field('day')}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  const until = new Date(monday); until.setUTCDate(until.getUTCDate() - 1);
  const since = new Date(monday); since.setUTCDate(since.getUTCDate() - 7);
  return { since: since.toISOString().slice(0, 10), until: until.toISOString().slice(0, 10) };
}

export function weeklyTargets(portfolio: Portfolio) {
  const claimed = new Set<string>();
  const grouped = new Set(portfolio.groups.flatMap(g => g.accountIds.map(cleanAccountId)));
  return Object.entries(portfolio.settings).filter(([, s]) => s.activeClient === true && s.weeklyReportEnabled === true).map(([id, settings]) => {
    const group = portfolio.groups.find(g => g.id === id);
    if (!group && grouped.has(cleanAccountId(id))) return null; // Consolidated members never print twice.
    const accountIds = [...new Set((group ? group.accountIds : [id]).map(metaAccountId))];
    if (!accountIds.length || accountIds.some(accountId => !/^act_\d+$/.test(accountId))) throw new Error(`Revisá las cuentas del cliente ${id}.`);
    for (const accountId of accountIds) {
      if (claimed.has(accountId)) throw new Error('Una cuenta pertenece a más de un cliente semanal. Revisá las agrupaciones.');
      claimed.add(accountId);
    }
    return { id, name: settings.customName || group?.name || id, accountIds, settings };
  }).filter((target): target is NonNullable<typeof target> => target !== null);
}

export function consolidateAccounts(id: string, name: string, accounts: AdAccount[]): AdAccount {
  if (!accounts.length || new Set(accounts.map(a => a.currency)).size !== 1) throw new Error('No se pueden consolidar cuentas vacías o con monedas diferentes.');
  const sum = (key: keyof AdAccount) => accounts.reduce((total, a) => total + (typeof a[key] === 'number' ? a[key] as number : 0), 0);
  const spend = sum('spend'), purchases = sum('purchases'), messages = sum('messages'), leads = sum('leads');
  const realMessages = sum('messagesReal');
  const messageSpend = accounts.reduce((total, a) => total + (a.messagesReal || 0) * (a.costPerMessageReal || 0), 0);
  return { id, account_id: accounts.length > 1 ? 'GRUPO' : accounts[0].account_id, name,
    account_status: accounts.some(a => a.account_status === 1) ? 1 : 0, currency: accounts[0].currency,
    spend, purchases, messages, leads, revenue: sum('revenue'), clicks: sum('clicks'), impressions: sum('impressions'),
    addToCart: sum('addToCart'), viewContent: sum('viewContent'), checkouts: sum('checkouts'),
    ctr: sum('impressions') ? sum('clicks') / sum('impressions') * 100 : 0,
    costPerPurchase: purchases ? spend / purchases : 0, costPerMessage: messages ? spend / messages : 0,
    costPerLead: leads ? spend / leads : 0, messagesReal: realMessages, costPerMessageReal: realMessages ? messageSpend / realMessages : 0 };
}

export function consolidateDaily(rows: DailyMetric[]): DailyMetric[] {
  const days = new Map<string, DailyMetric>();
  for (const row of rows) {
    const d = days.get(row.date) || { date: row.date, spend: 0, revenue: 0, purchases: 0, messages: 0, leads: 0, clicks: 0, roas: 0 };
    for (const key of ['spend', 'revenue', 'purchases', 'messages', 'leads', 'clicks'] as const) d[key] = (d[key] || 0) + (row[key] || 0);
    d.roas = d.spend ? d.revenue / d.spend : 0; d.costPerLead = d.leads ? d.spend / d.leads : 0;
    days.set(row.date, d);
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}
