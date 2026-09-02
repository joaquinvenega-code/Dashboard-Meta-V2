import React from 'react';
import { formatCurrency, formatDecimal } from '../../../lib/utils';
import { DemographicSegment } from '../reportData';
import { ReportDonut, reportChartColors } from '../ReportDonut';

export function DemographicsGeographyV2({ demoData = [], currency = 'ARS' }: { demoData?: DemographicSegment[]; currency?: string }) {
  const total = demoData.reduce((sum, row) => sum + (row.rawValue || 0), 0);
  const genders = [
    { name: 'Mujeres', value: demoData.reduce((sum, row) => sum + row.female, 0) },
    { name: 'Hombres', value: demoData.reduce((sum, row) => sum + row.male, 0) },
    { name: 'Sin especificar', value: demoData.reduce((sum, row) => sum + (row.unknown || 0), 0) },
  ].filter(row => row.value > 0);
  return <section className="report-panel report-audiences">
    <header className="report-panel-heading"><h3>Distribución de la inversión</h3><p>Inversión por edad y género, no volumen de ventas ni mensajes.</p></header>
    {total > 0 ? <div className="report-audience-grid">
      <div><h4>Por rango de edad</h4><div className="report-audience-rows">{demoData.map(row => <div key={row.age}>
        <span>{row.age.toLowerCase() === 'unknown' ? 'Sin dato' : row.age}</span><div className="report-bar-track"><span style={{ width: row.rawValue / total * 100 + '%' }} /></div><strong>{formatCurrency(row.rawValue, currency)}</strong>
      </div>)}</div></div>
      <div><h4>Por género</h4><div className="report-gender-chart"><ReportDonut values={genders.map(row => row.value)} label="Distribución de la inversión por género" center="100%" caption="inversión" /><ol className="report-ranking-rows">{genders.map((row, index) => <li key={row.name}>
        <div><span><i className="report-legend-dot" style={{ background: reportChartColors[index] }} />{row.name}</span><strong>{formatDecimal(row.value, 1)}%</strong></div>
      </li>)}</ol></div><p className="report-caption">Base demográfica disponible: {formatCurrency(total, currency)}. Los segmentos no disponibles no se estiman.</p></div>
    </div> : <p className="report-empty">No hay desglose demográfico disponible para este período.</p>}
  </section>;
}

