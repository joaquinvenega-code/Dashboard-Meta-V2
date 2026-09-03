import React from 'react';
import { formatCurrency, formatDecimal } from '../../lib/utils';
import { countryLabel, GeographicResult, RegionResult, ReportMode, REPORT_MODES } from './reportData';
import { ReportActivityMap } from './ReportActivityMap';

export function GeographicSummary({ countries, regions, mode, currency, expectedResults }: { countries: GeographicResult[]; regions: RegionResult[]; mode: ReportMode; currency: string; expectedResults: number }) {
  const key = REPORT_MODES[mode].key;
  const label = mode === 'messaging' ? 'Mensajes' : REPORT_MODES[mode].result;
  const total = countries.reduce((sum, row) => sum + (row[key] || 0), 0);
  const spendOnly = total === 0;
  const rankedCountries = [...countries].sort((a, b) => spendOnly ? b.spend - a.spend : (b[key] || 0) - (a[key] || 0));
  const rankedRegions = [...regions].sort((a, b) => spendOnly ? b.spend - a.spend : (b[key] || 0) - (a[key] || 0));
  const mismatch = countries.length > 0 && Math.abs(total - expectedResults) > 0.01;
  return <section className="report-panel report-geography">
    <header className="report-panel-heading"><h3>Distribución geográfica</h3><p>{countries.length} {countries.length === 1 ? 'país' : 'países'} y {regions.length} {regions.length === 1 ? 'región' : 'regiones'} con datos disponibles.</p></header>
    {countries.length ? <>
      <ReportActivityMap countries={countries} regions={regions} mode={mode} currency={currency} />
      <details className="report-screen-only report-geo-details"><summary>Ver cifras por país y región</summary><div className="report-geography-grid">
        <div><h4>Por país</h4><table><thead><tr><th>País</th><th>{label}</th><th>Inversión</th></tr></thead><tbody>{rankedCountries.map(row => <tr key={row.countryId}><td>{countryLabel(row.countryId)}</td><td>{formatDecimal(row[key], 0)}</td><td>{formatCurrency(row.spend, currency)}</td></tr>)}</tbody></table></div>
        <div><h4>Todas las regiones</h4>{rankedRegions.length ? <table><thead><tr><th>Región</th><th>{label}</th><th>Inversión</th></tr></thead><tbody>{rankedRegions.map(row => <tr key={row.regionId}><td>{row.regionName}</td><td>{formatDecimal(row[key], 0)}</td><td>{formatCurrency(row.spend, currency)}</td></tr>)}</tbody></table> : <p className="report-empty">Sin detalle regional disponible.</p>}</div>
      </div></details>
      {mismatch && <p className="report-data-note"><strong>Diferencia a revisar:</strong> el desglose geográfico suma {formatDecimal(total, 0)} {label.toLowerCase()} y el total del informe es {formatDecimal(expectedResults, 0)}. Se conservan ambas consultas de Meta sin ajustar cifras ni sumarlas entre sí.</p>}
      {spendOnly && <p className="report-caption">No hay resultados geográficos registrados. El orden se basa en inversión; no se estiman conversiones a partir del gasto.</p>}
    </> : <p className="report-empty">No hay desglose geográfico disponible para este período.</p>}
  </section>;
}
