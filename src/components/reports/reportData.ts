import { metaLeadCount } from '../../lib/metaLeads';
export type ReportMode = 'ecommerce' | 'messaging' | 'leads';
export const REPORT_MODES = {
  ecommerce: { label: 'E-commerce', key: 'purchases', result: 'Compras', singular: 'compra', cost: 'Costo por compra', compactCost: 'Costo / compra', transition: 'Clic a compra', destination: 'la compra' },
  messaging: { label: 'Mensajería', key: 'messages', result: 'Mensajes iniciados', singular: 'mensaje', cost: 'Costo por mensaje', compactCost: 'Costo / mensaje', transition: 'Clic a conversación', destination: 'la conversación' },
  leads: { label: 'Clientes potenciales', key: 'leads', result: 'Clientes potenciales', singular: 'cliente potencial', cost: 'Costo por lead (CPL)', compactCost: 'Costo / lead (CPL)', transition: 'Clic a cliente potencial', destination: 'la captación' },
} as const satisfies Record<ReportMode, { label: string; key: 'purchases' | 'messages' | 'leads'; result: string; singular: string; cost: string; compactCost: string; transition: string; destination: string }>;
export type PlacementBasis = 'messages' | 'purchases' | 'leads' | 'spend';
export interface DailyReportPoint { date: string; revenue: number | null; purchases: number | null; messages?: number | null; leads?: number | null; spend?: number | null }
export interface PlacementResult { name: string; value: number; rawValue: number; color: string }
export interface DemographicSegment { age: string; male: number; female: number; unknown?: number; rawValue: number }
export interface ReportMetrics { spend: number; purchases: number; revenue: number; roas: number; messages: number; costPerMessage: number; leads?: number; costPerLead?: number; ctr: number; clicks: number; impressions: number; reach?: number; atc: number; viewContent?: number; currency: string }
export interface GeographicResult { countryId: string; spend: number; purchases: number; revenue: number; messages: number; leads?: number }
export interface RegionResult extends Omit<GeographicResult, 'countryId'> { regionId: string; regionName: string; countryId?: string }

export const positiveNumber = (value: unknown) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

// Respect an explicit zero: aliases are alternatives, never additive measures.
export function reportAction(actions: any[] | undefined, ...types: string[]) {
  for (const type of types) {
    const action = actions?.find(item => item.action_type === type);
    if (action) return positiveNumber(action.value);
  }
  return 0;
}

export function aggregatePlacements(rows: any[], mode: ReportMode): { data: PlacementResult[]; basis: PlacementBasis } {
  const groups = new Map<string, { spend: number; results: number }>();
  for (const row of rows) {
    const platform = String(row.publisher_platform || '').toLowerCase();
    const position = String(row.platform_position || '').toLowerCase();
    const platformName = ({ instagram: 'Instagram', facebook: 'Facebook', messenger: 'Messenger', audience_network: 'Audience Network' } as Record<string, string>)[platform] || 'Otras ubicaciones';
    const positionName = /stor(y|ies)/.test(position) ? 'Stories' : /reel/.test(position) ? 'Reels' : /feed|explore/.test(position) ? 'Feed' : 'Otros';
    const name = ['facebook', 'instagram'].includes(platform) ? `${platformName} ${positionName}` : platformName;
    const current = groups.get(name) || { spend: 0, results: 0 };
    current.spend += positiveNumber(row.spend);
    current.results += mode === 'messaging'
      ? reportAction(row.actions, 'onsite_conversion.messaging_conversation_started_7d', 'onsite_conversion.total_messaging_connection')
      : mode === 'leads' ? metaLeadCount(row.actions) : reportAction(row.actions, 'purchase', 'offsite_conversion.fb_pixel_purchase');
    groups.set(name, current);
  }
  const resultTotal = [...groups.values()].reduce((sum, row) => sum + row.results, 0);
  const basis = resultTotal > 0 ? REPORT_MODES[mode].key : 'spend';
  const values = [...groups].map(([name, row]) => ({ name, rawValue: basis === 'spend' ? row.spend : row.results }));
  const total = values.reduce((sum, row) => sum + row.rawValue, 0);
  return { basis, data: values.filter(row => row.rawValue > 0).sort((a, b) => b.rawValue - a.rawValue).map(row => ({ ...row, value: row.rawValue / total * 100, color: '#2563eb' })) };
}

export function aggregateDemographics(rows: any[]): DemographicSegment[] {
  const groups = new Map<string, { male: number; female: number; unknown: number; spend: number }>();
  let total = 0;
  for (const row of rows) {
    const age = row.age || 'Sin especificar';
    const group = groups.get(age) || { male: 0, female: 0, unknown: 0, spend: 0 };
    const spend = positiveNumber(row.spend);
    const gender = row.gender === 'male' || row.gender === 'female' ? row.gender : 'unknown';
    group[gender] += spend;
    group.spend += spend;
    total += spend;
    groups.set(age, group);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).filter(([, group]) => group.spend > 0).map(([age, group]) => ({ age, rawValue: group.spend, male: total ? group.male / total * 100 : 0, female: total ? group.female / total * 100 : 0, unknown: total ? group.unknown / total * 100 : 0 }));
}

export function reportPeriodMetrics(raw: any, daily: any[], currency: string): ReportMetrics {
  const sum = (key: string) => daily.reduce((total, day) => total + positiveNumber(day[key]), 0);
  const spend = raw ? positiveNumber(raw.spend) : sum('spend');
  const messages = raw ? reportAction(raw.actions, 'onsite_conversion.messaging_conversation_started_7d', 'onsite_conversion.total_messaging_connection') : sum('messages');
  const purchases = raw ? reportAction(raw.actions, 'purchase', 'offsite_conversion.fb_pixel_purchase') : sum('purchases');
  const leads = raw ? metaLeadCount(raw.actions) : sum('leads');
  const revenue = raw ? reportAction(raw.action_values, 'purchase', 'offsite_conversion.fb_pixel_purchase') : sum('revenue');
  const clicks = raw ? positiveNumber(raw.clicks) : sum('clicks');
  const impressions = raw ? positiveNumber(raw.impressions) : sum('impressions');
  return { spend, messages, purchases, leads, costPerLead: leads ? spend / leads : 0, revenue, clicks, impressions, reach: raw?.reach != null ? positiveNumber(raw.reach) : undefined, currency, roas: spend ? revenue / spend : 0, costPerMessage: messages ? spend / messages : 0, ctr: impressions ? clicks / impressions * 100 : 0, atc: raw ? reportAction(raw.actions, 'add_to_cart', 'offsite_conversion.fb_pixel_add_to_cart') : sum('atc'), viewContent: raw ? reportAction(raw.actions, 'view_content', 'offsite_conversion.fb_pixel_view_content') : sum('viewContent') };
}

export function completeDailySeries(rows: any[], month: string): DailyReportPoint[] {
  if (!rows.length) return [];
  const [year, monthNumber] = month.split('-').map(Number);
  const count = new Date(year, monthNumber, 0).getDate();
  const byDate = new Map(rows.map(row => [row.date, row]));
  return Array.from({ length: count }, (_, index) => {
    const day = String(index + 1).padStart(2, '0');
    const row = byDate.get(`${month}-${day}`);
    return { date: `${day}/${String(monthNumber).padStart(2, '0')}`, revenue: row ? positiveNumber(row.revenue) : null, purchases: row ? positiveNumber(row.purchases) : null, spend: row ? positiveNumber(row.spend) : null, messages: row ? positiveNumber(row.messages) : null, leads: row ? positiveNumber(row.leads) : null };
  });
}

export function countryLabel(code: string) {
  const alpha2: Record<string, string> = { ARG: 'AR', USA: 'US', BRA: 'BR', ESP: 'ES', MEX: 'MX', CAN: 'CA', GBR: 'GB', DEU: 'DE', FRA: 'FR', COL: 'CO', CHL: 'CL', PER: 'PE', JPN: 'JP', AUS: 'AU', IND: 'IN' };
  try { return new Intl.DisplayNames(['es'], { type: 'region' }).of(alpha2[code] || code) || code; } catch { return code || 'Sin especificar'; }
}

export function aggregateGeography(rows: any[]) {
  const countries = new Map<string, GeographicResult>();
  const regions = new Map<string, RegionResult>();
  for (const row of rows) {
    const countryId = String(row.country || 'ZZ').toUpperCase();
    const values = {
      spend: positiveNumber(row.spend),
      purchases: reportAction(row.actions, 'purchase', 'offsite_conversion.fb_pixel_purchase'),
      revenue: reportAction(row.action_values, 'purchase', 'offsite_conversion.fb_pixel_purchase'),
      messages: reportAction(row.actions, 'onsite_conversion.messaging_conversation_started_7d', 'onsite_conversion.total_messaging_connection'),
      leads: metaLeadCount(row.actions),
    };
    const country = countries.get(countryId) || { countryId, spend: 0, purchases: 0, revenue: 0, messages: 0, leads: 0 };
    for (const key of ['spend', 'purchases', 'revenue', 'messages', 'leads'] as const) country[key] = (country[key] || 0) + values[key];
    countries.set(countryId, country);
    if (row.region) {
      const regionId = countryId + '_' + row.region;
      const region = regions.get(regionId) || { regionId, countryId, regionName: row.region + ' · ' + countryLabel(countryId), spend: 0, purchases: 0, revenue: 0, messages: 0, leads: 0 };
      for (const key of ['spend', 'purchases', 'revenue', 'messages', 'leads'] as const) region[key] = (region[key] || 0) + values[key];
      regions.set(regionId, region);
    }
  }
  return { countries: [...countries.values()], regions: [...regions.values()] };
}
