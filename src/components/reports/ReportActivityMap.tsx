import React from 'react';
import world from '../../assets/data/world_countries.json';
import regionsARG from '../../assets/data/regions_ARG.json';
import regionsBRA from '../../assets/data/regions_BRA.json';
import regionsUSA from '../../assets/data/regions_USA.json';
import regionsESP from '../../assets/data/regions_ESP.json';
import regionsPER from '../../assets/data/regions_PER.json';
import { countryLabel, GeographicResult, RegionResult, ReportMode, REPORT_MODES } from './reportData';
import { formatCurrency, formatDecimal } from '../../lib/utils';

const alpha3: Record<string, string> = { AR: 'ARG', PE: 'PER', US: 'USA', BR: 'BRA', ES: 'ESP', MX: 'MEX', CO: 'COL', CL: 'CHL', UY: 'URY', PY: 'PRY', BO: 'BOL', EC: 'ECU', VE: 'VEN', CA: 'CAN', GB: 'GBR', FR: 'FRA', DE: 'DEU', AU: 'AUS', IN: 'IND', JP: 'JPN', CN: 'CHN', IT: 'ITA', PT: 'PRT', CR: 'CRI', PA: 'PAN', DO: 'DOM', GT: 'GTM', SV: 'SLV', HN: 'HND', NI: 'NIC', CU: 'CUB', PR: 'PRI', NZ: 'NZL', ZA: 'ZAF' };
const regionalCartography: Record<string, Feature[]> = { ARG: regionsARG.features, BRA: regionsBRA.features, USA: regionsUSA.features, ESP: regionsESP.features, PER: regionsPER.features };
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
  if (regionalCartography[countryId]?.some(candidate => candidate.id === row.regionId)) return row.regionId === feature.id;
  const name = normalizeMapName(row.regionName.split(' · ')[0]);
  const featureName = normalizeMapName(feature.properties.name);
  const caba = ['ciudadautonomadebuenosaires', 'buenosairesfederaldistrict', 'distritofederal', 'capitalfederal', 'caba'];
  if (countryId === 'PER') {
    // Meta uses both Spanish and English names. Keep Lima department and city
    // separate; a single result must never paint both geometries.
    const aliases: Record<string, string[]> = {
      'PE-CAL': ['callao', 'elcallao', 'constitutionalprovinceofcallao'],
      'PE-LMA': ['limaprovince', 'provinciadelima', 'limametropolitana', 'metropolitanlima'],
      'PE-CUS': ['cuzco', 'cusco'],
    };
    const regionalName = name.replace(/^(regionde|departamentode)/, '').replace(/(region|department)$/, '');
    return regionalName === featureName || (aliases[feature.id] || []).includes(regionalName);
  }
  return name === featureName || (feature.id === 'AR-C' && caba.includes(name));
}
type Feature = { id: string; properties: any; geometry: any };
const rings = (feature: Feature): number[][][] => feature.geometry?.type === 'Polygon' ? feature.geometry.coordinates : feature.geometry?.type === 'MultiPolygon' ? feature.geometry.coordinates.flat() : [];
export const activityPalette = ['#f5b041', '#ed7926', '#d94024', '#991b35'];
export function activityColor(value: number | undefined, maximum: number) {
  return value == null ? '#cbd5e1' : value <= 0 ? '#ffffff' : activityPalette[Math.min(3, Math.floor(value / Math.max(Number.EPSILON, maximum) * 4))];
}
function MapDrawing({ features, focus, values, label, maximum, countryOnly = false }: { features: Feature[]; focus: Feature[]; values: Map<string, number>; label: string; maximum: number; countryOnly?: boolean }) {
  const points = (focus.length ? focus : features).flatMap(feature => rings(feature).flat());
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.max(-60, Math.min(...ys)), maxY = Math.min(84, Math.max(...ys));
  const cosine = Math.max(.25, Math.cos((minY + maxY) / 2 * Math.PI / 180));
  const width = 320, height = 262, pad = 10;
  const scale = Math.min((width - pad * 2) / Math.max(.1, (maxX - minX) * cosine), (height - pad * 2) / Math.max(.1, maxY - minY));
  const project = (p: number[]) => [(p[0] - (minX + maxX) / 2) * cosine * scale + width / 2, ((minY + maxY) / 2 - p[1]) * scale + height / 2];
  return <svg viewBox={`0 0 ${width} ${height}`} className="report-activity-svg" role="img" aria-label={label}>
    <rect width={width} height={height} rx="8" fill="#f1f5f9" />
    {features.map(feature => <path key={feature.id} d={rings(feature).map(ring => 'M' + ring.map(point => project(point).map(v => v.toFixed(2)).join(',')).join('L') + 'Z').join(' ')} fill={countryOnly ? '#2563eb' : activityColor(values.get(feature.id), maximum)} stroke="#64748b" strokeWidth=".65" strokeLinejoin="round" fillRule="evenodd"><title>{`${feature.properties.name}: ${values.has(feature.id) ? formatDecimal(values.get(feature.id)!, 0) : 'sin dato'}`}</title></path>)}
  </svg>;
}

export function ReportActivityMap({ countries, regions, mode, currency }: { countries: GeographicResult[]; regions: RegionResult[]; mode: ReportMode; currency: string }) {
  const resultKey = REPORT_MODES[mode].key;
  const totalResults = countries.reduce((sum, row) => sum + (row[resultKey] || 0), 0);
  const basis = totalResults > 0 ? resultKey : 'spend';
  const label = basis === 'messages' ? 'mensajes' : basis === 'purchases' ? 'compras' : basis === 'leads' ? 'clientes potenciales' : 'inversión';
  const ranked = [...countries].sort((a, b) => (b[basis] || 0) - (a[basis] || 0));
  const total = ranked.reduce((sum, row) => sum + (row[basis] || 0), 0);
  const maps = ranked.map(country => {
    const id = mapCountryId(country.countryId);
    const features = regionalCartography[id] || [];
    const countryRows = regions.filter(row => mapCountryId(row.countryId || row.regionId.split(/[_-]/)[0]) === id);
    const values = new Map<string, number>();
    const matched = new Set<RegionResult>();
    for (const feature of features) {
      const rows = countryRows.filter(row => matchMapRegion(row, id, feature));
      if (rows.length) { values.set(feature.id, rows.reduce((sum, row) => sum + (row[basis] || 0), 0)); rows.forEach(row => matched.add(row)); }
    }
    return { country, id, features, values, matched, countryRows, outline: world.features.filter(feature => feature.id === id) };
  });
  // One scale across all regional maps: equal colors always mean equal activity.
  const maximum = Math.max(0, ...maps.flatMap(map => [...map.values.values()]));
  const valueText = (value = 0) => basis === 'spend' ? formatCurrency(value, currency) : `${formatDecimal(value, 0)} ${label}`;
  return <div className="report-activity-map">
    <div className={'report-map-grid' + (maps.length > 2 ? ' report-map-grid-multiple' : '')}>
      {maps.map(map => {
        const name = countryLabel(map.country.countryId);
        const regional = map.features.length > 0;
        const topRegions = [...map.countryRows].sort((a, b) => (b[basis] || 0) - (a[basis] || 0)).slice(0, 3);
        const missing = map.countryRows.length - map.matched.size;
        return <figure className="report-country-map" key={map.id}>
          <figcaption><span>{name}<small>{regional ? 'Detalle regional' : 'Vista del país'}</small></span><strong>{valueText(map.country[basis])}<small>{total > 0 ? `${formatDecimal((map.country[basis] || 0) / total * 100, 1)}% del desglose geográfico` : 'Sin actividad registrada'}</small></strong></figcaption>
          {regional || map.outline.length > 0 ? <MapDrawing features={regional ? map.features : map.outline} focus={regional ? map.features : map.outline} values={regional ? map.values : new Map([[map.id, map.country[basis] || 0]])} maximum={maximum} countryOnly={!regional} label={`${regional ? 'Mapa regional' : 'Contorno'} de ${name} según ${label}`} /> : <div className="report-map-unavailable">Sin contorno disponible para {name}.</div>}
          <div className="report-map-region-highlights"><h4>Zonas con mayor {basis === 'spend' ? 'inversión' : 'actividad'}</h4>{topRegions.length ? topRegions.map(row => <div key={row.regionId}><span><i style={{ background: map.matched.has(row) ? activityColor(row[basis], maximum) : '#cbd5e1' }} />{row.regionName.split(' · ')[0]}{!map.matched.has(row) && <small>Sin ubicar en el mapa</small>}</span><strong>{valueText(row[basis])}</strong></div>) : <p>Sin desglose regional disponible.</p>}</div>
          {!regional ? <p className="report-caption">Sin cartografía regional. El azul identifica el país; no representa intensidad.</p> : missing > 0 ? <p className="report-caption">{missing} {missing === 1 ? 'región sin ubicar' : 'regiones sin ubicar'}. Sus cifras se conservan en el detalle.</p> : null}
        </figure>;
      })}
    </div>
    <div className="report-heat-legend"><span>Menor actividad</span><span className="report-heat-scale">{activityPalette.map(color => <i key={color} style={{ background: color }} />)}</span><span>Mayor actividad</span><small>{maximum > 0 ? `Máximo regional: ${valueText(maximum)}` : 'Sin actividad regional registrada'}</small></div>
    <p className="report-caption">Escala de color compartida: {label} por región. Gris: sin dato asociado. Blanco: cero registrado. Cada país se amplía por separado; los tamaños no comparan superficies.</p>
  </div>;
}
