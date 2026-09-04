import React from 'react';
import { formatCurrency, formatDecimal } from '../../../lib/utils';
import { PlacementBasis } from '../reportData';
import { ReportDonut, reportChartColors } from '../ReportDonut';

interface PlacementsChartV2Props {
  data: { name: string; value: number; color?: string; rawValue?: number }[];
  basis?: PlacementBasis; currency?: string;
}
export function PlacementsChartV2({ data, basis = 'spend', currency = 'ARS' }: PlacementsChartV2Props) {
  const rows = [...data].filter(row => row.value > 0).sort((a, b) => b.value - a.value);
  const label = basis === 'messages' ? 'mensajes' : basis === 'purchases' ? 'compras' : basis === 'leads' ? 'clientes potenciales' : 'inversión';
  return <section className="report-panel report-placement-ranking">
    <header className="report-panel-heading"><h3>Distribución de ubicaciones</h3><p>Participación de {label} en el desglose disponible.</p></header>
    {rows.length > 0 && <div className="report-placement-donut">
      <ReportDonut values={rows.map(row => row.value)} label={`Distribución de ${label} por ubicación`} />
      <div className="report-placement-summary">
        <span>Ubicación principal</span>
        <strong>{formatDecimal(rows[0].value, 1)}%</strong>
        <span className="report-placement-name">{rows[0].name}</span>
      </div>
    </div>}
    {rows.length ? <ol className="report-ranking-rows">{rows.map((row, index) => <li key={row.name}>
      <div><span>{row.name}</span><strong>{row.value < 0.1 ? '<0,1' : formatDecimal(row.value, 1)}%</strong></div>
      <div className="report-bar-track"><span style={{ width: Math.min(100, row.value) + '%', background: reportChartColors[index % reportChartColors.length] }} /></div>
      {row.rawValue != null && <small>{basis === 'spend' ? formatCurrency(row.rawValue, currency) : formatDecimal(row.rawValue, 0) + ' ' + label}</small>}
    </li>)}</ol> : <p className="report-empty">No hay datos de ubicaciones para este período.</p>}
    <p className="report-caption">{basis === 'spend' ? 'Base: inversión. No hay conversiones disponibles por ubicación.' : 'Base: resultados atribuidos por ubicación.'} Los porcentajes pueden diferir de 100% por redondeo.</p>
  </section>;
}
