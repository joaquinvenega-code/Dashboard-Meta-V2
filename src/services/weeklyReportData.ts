import { getAdAccount, fetchInsights, fetchAccountDailyPerformance, fetchTopAds, fetchDailySeries, fetchAccountActivity } from './facebook';
import { consolidateAccounts, consolidateDaily, detailOptions, weeklyTargets, type Portfolio } from '../lib/weeklyReports';
import { collectMetaActivity } from '../lib/metaActivity';
import type { WeeklySnapshot } from '../lib/weeklySnapshot';

export async function loadWeeklySnapshot(portfolio: Portfolio, targetId: string, period: WeeklySnapshot['period']): Promise<WeeklySnapshot> {
  const target = weeklyTargets(portfolio).find(t => t.id === targetId);
  if (!target) throw new Error('Cliente no habilitado para informes semanales.');
  const options = detailOptions(target.settings);
  for (const month of new Set([period.since.slice(0, 7), period.until.slice(0, 7)])) {
    if (target.settings.manualRevenueByMonth?.[month] && !target.settings.offlineSalesLogByMonth?.[month]?.length) {
      throw new Error('Hay ventas manuales mensuales sin fecha. Registrá sus fechas antes de emitir el informe semanal.');
    }
  }
  const accounts = [], daily = [], ads = [], logs = [];
  // Limit Meta concurrency and keep failures isolated to this client.
  for (const id of target.accountIds) {
    const account = await getAdAccount(id);
    const metrics = await fetchInsights(id, period.since, period.until, true);
    accounts.push({ ...account, ...metrics });
    daily.push(...await fetchAccountDailyPerformance(id, period.since, period.until));
    const top = await fetchTopAds(id, period.since, period.until, options.topN, options.sortBy);
    if (top.length) {
      const series = await fetchDailySeries(id, period.since, period.until, top.map(a => a.id));
      top.forEach(a => { a.dailySeries = series[a.id] || []; });
    }
    ads.push(...top);
    const activity = await fetchAccountActivity(id, period.since, period.until);
    if (!activity.complete || !activity.timezone_name) throw new Error('Actividad de Meta incompleta. Reintentá este cliente.');
    const collected = collectMetaActivity(activity.data, id, period.since, period.until, activity.currency || account.currency, activity.timezone_name);
    if (collected.unresolved) throw new Error('Actividad de Meta con fechas incompletas.');
    logs.push(...collected.logs);
  }
  const account = consolidateAccounts(target.id, target.settings.customName || (target.accountIds.length === 1 ? accounts[0].name : target.name), accounts);
  const rank = (ad: typeof ads[number]) => Number(ad[options.sortBy]) || 0;
  const sourceIds = new Set([target.id, ...target.accountIds, ...target.accountIds.map(id => id.replace(/^act_/, ''))]);
  return {
    account, portfolio: { ...portfolio, notes: portfolio.notes.filter(n => sourceIds.has(n.accountId)).map(n => ({ ...n, accountId: target.id })) },
    period, daily: consolidateDaily(daily), ads: ads.sort((a, b) => rank(b) - rank(a)).slice(0, options.topN),
    activity: { logs: logs.sort((a, b) => (a.sortDate || '').localeCompare(b.sortDate || '')), automatic: [], notice: '' },
  };
}
