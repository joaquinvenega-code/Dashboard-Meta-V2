export interface AdTrafficMetrics {
  clicks?: number;
  impressions?: number;
  ctr?: number;
  cpc?: number;
}

// Keep missing values distinct from an explicit zero returned by Meta.
function optionalMetric(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  if (typeof value === 'string' && !value.trim()) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

export const AD_TRAFFIC_FIELDS = 'spend,clicks,impressions,ctr';

export function adTrafficMetrics(raw: { clicks?: unknown; impressions?: unknown; ctr?: unknown; spend?: unknown }): AdTrafficMetrics {
  const clicks = optionalMetric(raw.clicks);
  const impressions = optionalMetric(raw.impressions);
  const spend = optionalMetric(raw.spend);
  return {
    clicks,
    impressions,
    ctr: optionalMetric(raw.ctr) ?? (clicks != null && impressions > 0 ? clicks / impressions * 100 : undefined),
    cpc: spend != null && clicks > 0 ? spend / clicks : undefined,
  };
}
