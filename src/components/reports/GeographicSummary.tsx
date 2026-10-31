import React from 'react';
import { formatCurrency, formatDecimal } from '../../lib/utils';
import { countryLabel, isUnspecifiedGeography, regionLabel, GeographicResult, RegionResult, ReportMode, REPORT_MODES } from './reportData';
import { ReportActivityMap } from './ReportActivityMap';

export function GeographicSummary({ countries, regions, mode, currency, expectedResults, concise = false }: { countries: GeographicResult[]; regions: RegionResult[]; mode: ReportMode; currency: string; expectedResults: number; concise?: boolean }) {
  const key = REPORT_MODES[mode].key;
  const label = mode === 'messaging' ? 'Mensajes' : REPORT_MODES[mode].result;
  const total = countries.reduce((sum, row) => sum + (row[key] || 0), 0);
  const spendOnly = total === 0;
  const rankedCountries = [...countries].sort((a, b) => spendOnly ? b.spend - a.spend : (b[key] || 0) - (a[key] || 0));
  const rankedRegions = [...regions].sort((a, b) => spendOnly ? b.spend - a.spend : (b[key] || 0) - (a[key] || 0));
  const mismatch = countries.length > 0 && Math.abs(total - expectedResults) > 0.01;
  const identifiedCountries = countries.filter(row => !isUnspecifiedGeography(row.countryId)).length;
  const identifiedRegions = regions.filter(row => !isUnspecifiedGeography(row.regionName.split(' · ')[0])).length;
  const hasUnspecified = identifiedCountries !== countries.length || identifiedRegions !== regions.length;
  return <section className="report-panel report-geography">
    <header className="report-panel-heading"><h3>Distribución geográfica</h3><p>{identifiedCountries} {identifiedCountries === 1 ? 'país identificado' : 'países identificados'} y {identifiedRegions} {identifiedRegions === 1 ? 'región identificada' : 'regiones identificadas'}.{!concise && hasUnspecified && ' También hay datos sin ubicación informada.'}</p></header>
    {countries.length ? <>
      <ReportActivityMap concise={concise} countries={countries} regions={regions} mode={mode} currency={currency} />
      <details className="report-screen-only report-geo-details"><summary>Ver cifras por país</summary><div>
        <div><h4>Por país</h4><table><thead><tr><th>País</th><th>{label}</th><th>Inversión</th></tr></thead><tbody>{rankedCountries.map(row => <tr key={row.countryId}><td>{countryLabel(row.countryId)}</td><td>{formatDecimal(row[key], 0)}</td><td>{formatCurrency(row.spend, currency)}</td></tr>)}</tbody></table></div>
      </div></details>
      {mismatch && <p className="report-data-note"><strong>Diferencia a revisar:</strong> {concise ? <>Meta informa {formatDecimal(total, 0)} {label.toLowerCase()} en el desglose geográfico y {formatDecimal(expectedResults, 0)} en el total. Se conservan ambas cifras, sin sumarlas.</> : <>el desglose geográfico suma {formatDecimal(total, 0)} {label.toLowerCase()} y el total del informe es {formatDecimal(expectedResults, 0)}. Se conservan ambas consultas de Meta sin ajustar cifras ni sumarlas entre sí.</>}</p>}
      {spendOnly && <p className="report-caption">No hay resultados geográficos registrados. El orden se basa en inversión; no se estiman conversiones a partir del gasto.</p>}
      {hasUnspecified && <p className="report-caption">{concise ? '«No informada»: Meta no detalló esa ubicación. Sus cifras se conservan.' : '«No informada» significa que Meta no indicó el país o la región para esas cifras. Se conservan en los totales y en el detalle, sin asignarlas a una ubicación.'}</p>}
      <div className="report-region-list">
        <h4>Detalle completo por región</h4>
        <p className="report-caption">{concise ? 'Desglose de Meta por región, no por ciudad.' : <>Todas las zonas disponibles, ordenadas por {spendOnly ? 'inversión' : label.toLowerCase()}. Meta entrega este desglose por región, no por ciudad.</>}</p>
        {rankedRegions.length ? <table aria-label="Detalle completo por región" className="report-region-table">
          <thead><tr><th scope="col">Región / país</th><th scope="col">{label}</th><th scope="col">Inversión</th></tr></thead>
          <tbody>{rankedRegions.map(row => <tr key={row.regionId}>
            <td>{regionLabel(row)}</td>
            <td>{formatDecimal(row[key] || 0, 0)}</td><td>{formatCurrency(row.spend, currency)}</td>
          </tr>)}</tbody>
        </table> : <p className="report-empty">Sin detalle regional disponible.</p>}
      </div>
    </> : <p className="report-empty">No hay desglose geográfico disponible para este período.</p>}
  </section>;
}
