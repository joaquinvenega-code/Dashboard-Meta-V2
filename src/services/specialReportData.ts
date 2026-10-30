import type { AccountNote } from '../types';
import type { SpecialReport, SpecialSnapshot } from '../lib/specialReports';
import { specialDailySeries } from '../lib/specialReports';
import { aggregateDemographics, aggregateGeography, aggregatePlacements, reportPeriodMetrics } from '../components/reports/reportData';
import { collectReportLogs } from '../components/reports/reportLogs';
import { collectMetaActivity } from '../lib/metaActivity';
import { fetchAccountActivity, fetchAccountDailyPerformance, fetchDemographics, fetchGeography, fetchPlacements, fetchSpecialReportTotals, fetchTopAds } from './facebook';

/** Metrics share exactly one scope. Account notes remain explicitly contextual. */
export async function loadSpecialReport(report: SpecialReport, brand: { logo?: string; agencyName?: string; agencyLogo?: string; currency: string }, notes: AccountNote[]): Promise<SpecialSnapshot> {
  const { accountId, since, until, mode } = report;
  const campaignIds = report.scope === 'campaigns' ? report.campaigns.map(c => c.id) : undefined;
  const [period, daily, ads, demo, geography, placements] = await Promise.all([
    fetchSpecialReportTotals(accountId, since, until, campaignIds),
    fetchAccountDailyPerformance(accountId, since, until, campaignIds),
    report.sections.assets ? fetchTopAds(accountId, since, until, 5, mode === 'leads' ? 'leads' : mode === 'messaging' ? 'messages' : 'spend', campaignIds) : [],
    report.sections.performance ? fetchDemographics(accountId, since, until, campaignIds) : [],
    report.sections.geography ? fetchGeography(accountId, since, until, campaignIds) : [],
    fetchPlacements(accountId, since, until, campaignIds),
  ]);
  if (!period && !daily.length) throw new Error('No hay métricas disponibles para este período y alcance. Revisá las fechas y las campañas.');
  const notices: string[] = [];
  let remote: any[] = [];
  let activityLogs: SpecialSnapshot['logs'] = [];
  if (report.sections.management) {
    const results = await Promise.allSettled([
      fetch(`/api/bitacora/${encodeURIComponent(accountId)}`, { signal: AbortSignal.timeout(8000) }).then(async res => {
        if (!res.ok) throw new Error('Bitácora no disponible');
        const data = await res.json();
        if (!data.success || !Array.isArray(data.data)) throw new Error('Bitácora inválida');
        return data.data;
      }),
      fetchAccountActivity(accountId, since, until),
    ]);
    if (results[0].status === 'fulfilled') remote = results[0].value;
    else notices.push('La bitácora del servidor no estuvo disponible. Se conservan las notas locales.');
    if (results[1].status === 'fulfilled') {
      const result = results[1].value;
      const activity = collectMetaActivity(result.data, accountId, since, until, result.currency || brand.currency, result.timezone_name || 'UTC');
      activityLogs = activity.logs;
      if (!result.complete || activity.unresolved) notices.push('El historial de Meta puede estar incompleto.');
      if (!result.timezone_name) notices.push('Meta no informó la zona horaria; su actividad se muestra en UTC.');
    } else notices.push('No se pudo consultar la actividad de Meta; se conservan las notas disponibles.');
    if (campaignIds) notices.push('La bitácora corresponde a toda la cuenta durante el período; no está filtrada por campaña. Las métricas sí corresponden a las campañas seleccionadas.');
  }
  const local = collectReportLogs(notes, remote, accountId, since, until);
  if (local.unresolved && report.sections.management) notices.push('Se omitieron notas sin fecha verificable.');
  const distribution = aggregatePlacements(placements, mode);
  const geo = aggregateGeography(geography);
  return {
    name: report.clientName, logo: brand.logo, agencyName: brand.agencyName, agencyLogo: brand.agencyLogo,
    month: since.slice(0, 7), mode, dataAvailable: true,
    special: { title: report.title, objective: report.objective, since, until, scope: campaignIds ? report.campaigns.map(c => c.name).join(' · ') : 'Toda la cuenta publicitaria' },
    metrics: reportPeriodMetrics(period, daily, brand.currency), daily: specialDailySeries(daily, since, until),
    assets: ads.map(ad => ({ ...ad, thumbnail: ad.thumbnail || '', roas: ad.spend > 0 ? ad.revenue / ad.spend : 0 })),
    demographics: aggregateDemographics(demo), countries: geo.countries, regions: geo.regions,
    placements: distribution.data, placementBasis: distribution.basis,
    logs: report.sections.management ? [...local.logs, ...activityLogs].sort((a, b) => (a.sortDate || '').localeCompare(b.sortDate || '')) : [],
    logsNotice: notices.join(' '),
  };
}
