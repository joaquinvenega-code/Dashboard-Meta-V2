import React from 'react';
import world from '../../assets/data/world_countries.json';
import regionsARG from '../../assets/data/regions_ARG.json';
import regionsBRA from '../../assets/data/regions_BRA.json';
import regionsUSA from '../../assets/data/regions_USA.json';
import regionsESP from '../../assets/data/regions_ESP.json';
import { countryLabel, GeographicResult, RegionResult, ReportMode } from './reportData';
import { formatCurrency, formatDecimal } from '../../lib/utils';

const alpha3: Record<string, string> = { AR: 'ARG', PE: 'PER', US: 'USA', BR: 'BRA', ES: 'ESP', MX: 'MEX', CO: 'COL', CL: 'CHL', UY: 'URY', PY: 'PRY', BO: 'BOL', EC: 'ECU', VE: 'VEN', CA: 'CAN', GB: 'GBR', FR: 'FRA', DE: 'DEU', AU: 'AUS', IN: 'IND', JP: 'JPN', CN: 'CHN', IT: 'ITA', PT: 'PRT', CR: 'CRI', PA: 'PAN', DO: 'DOM', GT: 'GTM', SV: 'SLV', HN: 'HND', NI: 'NIC', CU: 'CUB', PR: 'PRI', NZ: 'NZL', ZA: 'ZAF' };
const regionalCartography: Record<string, Feature[]> = { ARG: regionsARG.features, BRA: regionsBRA.features, USA: regionsUSA.features, ESP: regionsESP.features };
export const normalizeMapName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function mapCountryId(code: string) {
  const upper = code.toUpperCase();
  if (upper.length === 3) return upper;
  if (alpha3[upper]) return alpha3[upper];
  // The existing map assets include names, not a complete alpha-2 mapping.
  let english: string | undefined;
  try { english = new Intl.DisplayNames(['en'], { type: 'region' }).of(upper); } catch { return upper; }
  return world.features.find(feature => normalizeMapName(feature.properties.name) === normalizeMapName(english || ''))?.id || upper;
}
export function matchMapRegion(row: RegionResult, countryId: string, feature: any) {
  const rowCountry = row.countryId || row.regionId.split(/[_-]/)[0];
  if (mapCountryId(rowCountry) !== countryId) return false;
  if (row.regionId === feature.id) return true;
  const name = normalizeMapName(row.regionName.split(' · ')[0]);
  const featureName = normalizeMapName(feature.properties.name);
  const caba = ['ciudadautonomadebuenosaires', 'buenosairesfederaldistrict', 'distritofederal', 'capitalfederal', 'caba'];
  return name === featureName || (feature.id === 'AR-C' && caba.includes(name));
}
type Feature = { id: string; properties: any; geometry: any };
const rings = (feature: Feature): number[][][] => feature.geometry?.type === 'Polygon' ? feature.geometry.coordinates : feature.geometry?.type === 'MultiPolygon' ? feature.geometry.coordinates.flat() : [];
const colors = ['#fee8c8', '#fdbb84', '#fc8d59', '#d7301f'];
export function activityColor(value: number | undefined, maximum: number) {
  return value == null ? '#e2e8f0' : value <= 0 ? '#ffffff' : colors[Math.min(3, Math.floor(value / Math.max(1, maximum) * 4))];
}
function MapDrawing({ features, focus, values, label }: { features: Feature[]; focus: Feature[]; values: Map<string, number>; label: string }) {
  const points = (focus.length ? focus : features).flatMap(feature => rings(feature).flat());
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.max(-60, Math.min(...ys)), maxY = Math.min(84, Math.max(...ys));
  const cosine = Math.max(.25, Math.cos((minY + maxY) / 2 * Math.PI / 180));
  const width = 350, height = 238, pad = 12;
  const scale = Math.min((width - pad * 2) / Math.max(.1, (maxX - minX) * cosine), (height - pad * 2) / Math.max(.1, maxY - minY));
  const project = (p: number[]) => [(p[0] - (minX + maxX) / 2) * cosine * scale + width / 2, ((minY + maxY) / 2 - p[1]) * scale + height / 2];
  const max = Math.max(1, ...values.values());
  return <svg viewBox={`0 0 ${width} ${height}`} className="report-activity-svg" role="img" aria-label={label}>
    <rect width={width} height={height} rx="8" fill="#f5f9fc" />
    {features.map(feature => <path key={feature.id} d={rings(feature).map(ring => 'M' + ring.map(point => project(point).map(v => v.toFixed(2)).join(',')).join('L') + 'Z').join(' ')} fill={activityColor(values.get(feature.id), max)} stroke="#fff" strokeWidth=".65" fillRule="evenodd"><title>{`${feature.properties.name}: ${values.has(feature.id) ? formatDecimal(values.get(feature.id)!, 0) : 'sin dato'}`}</title></path>)}
  </svg>;
}

export function ReportActivityMap({ countries, regions, mode, currency }: { countries: GeographicResult[]; regions: RegionResult[]; mode: ReportMode; currency: string }) {
  const resultKey = mode === 'messaging' ? 'messages' : 'purchases';
  const totalResults = countries.reduce((sum, row) => sum + row[resultKey], 0);
  const basis = totalResults > 0 ? resultKey : 'spend';
  const label = basis === 'messages' ? 'mensajes' : basis === 'purchases' ? 'compras' : 'inversión';
  const ranked = [...countries].sort((a, b) => b[basis] - a[basis]);
  const values = new Map(ranked.map(row => [mapCountryId(row.countryId), row[basis]]));
  const active = world.features.filter(feature => (values.get(feature.id) || 0) > 0);
  const supported = ranked.filter(row => regionalCartography[mapCountryId(row.countryId)]);
  const [selection, setSelection] = React.useState('');
  const selected = supported.find(row => row.countryId === selection) || supported[0];
  const selectedId = selected ? mapCountryId(selected.countryId) : '';
  const regionalFeatures = regionalCartography[selectedId] || [];
  const regionValues = new Map<string, number>();
  const matched = new Set<string>();
  for (const feature of regionalFeatures) {
    const rows = regions.filter(row => matchMapRegion(row, selectedId, feature));
    if (rows.length) { regionValues.set(feature.id, rows.reduce((sum, row) => sum + row[basis], 0)); rows.forEach(row => matched.add(row.regionId)); }
  }
  const unmappedCountries = ranked.filter(row => !world.features.some(feature => feature.id === mapCountryId(row.countryId)));
  const countryRows = regions.filter(row => mapCountryId(row.countryId || row.regionId.split(/[_-]/)[0]) === selectedId);
  const topRegions = [...(selected ? countryRows : regions)].sort((a, b) => b[basis] - a[basis]).slice(0, 3);
  const missing = countryRows.filter(row => !matched.has(row.regionId)).length;
  const valueText = (value: number) => basis === 'spend' ? formatCurrency(value, currency) : `${formatDecimal(value, 0)} ${label}`;
  return <div className="report-activity-map">
    <div className="report-map-grid">
      <figure><figcaption>Actividad por país</figcaption><MapDrawing features={world.features.filter(feature => feature.id !== 'ATA')} focus={active} values={values} label={`Mapa de actividad por país según ${label}`} /><div className="report-map-tags">{ranked.map(row => <span key={row.countryId}><i style={{ background: activityColor(row[basis], Math.max(1, ...values.values())) }} />{countryLabel(row.countryId)} <strong>{valueText(row[basis])}</strong></span>)}</div></figure>
      <figure><figcaption>{selected ? `Detalle regional · ${countryLabel(selected.countryId)}` : 'Zonas con mayor actividad'}{supported.length > 1 && <select className="report-screen-only" aria-label="País del mapa regional" value={selected?.countryId} onChange={event => setSelection(event.target.value)}>{supported.map(row => <option value={row.countryId} key={row.countryId}>{countryLabel(row.countryId)}</option>)}</select>}</figcaption>
        {regionalFeatures.length ? <MapDrawing features={regionalFeatures} focus={regionalFeatures} values={regionValues} label={`Mapa regional de ${countryLabel(selected!.countryId)} según ${label}`} /> : <div className="report-map-unavailable">No hay cartografía regional disponible para estos países. La actividad se conserva en el mapa por país y en el detalle de zonas.</div>}
        <div className="report-map-region-highlights">{topRegions.map(row => <span key={row.regionId}>{row.regionName}<strong>{valueText(row[basis])}</strong></span>)}</div>
      </figure>
    </div>
    <div className="report-heat-legend"><span>Menor actividad</span><i /><span>Mayor actividad</span><small>Base: {label}. Escala propia de cada mapa.</small></div>
    <p className="report-caption">Gris: sin dato asociado a la zona. Blanco: cero registrado.{missing > 0 ? ` ${missing} regiones de ${countryLabel(selected!.countryId)} no se pudieron ubicar y se conservan en el detalle.` : ''}{unmappedCountries.length > 0 ? ` Sin contorno disponible: ${unmappedCountries.map(row => countryLabel(row.countryId)).join(', ')}.` : ''}</p>
  </div>;
}
