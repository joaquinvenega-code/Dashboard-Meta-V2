import React from 'react';
import { formatCurrency, formatDecimal } from '../../lib/utils';
import { REPORT_MODES, ReportMode } from './reportData';
interface Props { spend: number; ctr: number; purchases: number; messages: number; leads?: number; atc: number; viewContent?: number; tracking: ReportMode | 'both'; impressions?: number; clicks?: number; reach?: number; currency?: string }
export function ReportFunnelBoard({ spend, purchases, messages, leads = 0, atc, tracking, impressions = 0, clicks = 0, reach, currency = 'ARS' }: Props) {
  const event = REPORT_MODES[tracking === 'both' ? 'ecommerce' : tracking];
  const acquisition = tracking === 'messaging' || tracking === 'leads';
  const results = { messages, purchases, leads }[event.key];
  const steps = acquisition ? [
    { label: 'Impresiones', value: impressions, color: '#2563eb' },
    { label: 'Personas alcanzadas', value: reach, color: '#147ea0' },
    { label: 'Clics en anuncios', value: clicks, color: '#0f9589' },
    { label: event.result, value: results, color: '#047857' },
  ] : [
    { label: 'Impresiones', value: impressions, color: '#2563eb' },
    { label: 'Clics en anuncios', value: clicks, color: '#147ea0' },
    { label: 'Agregados al carrito', value: atc, color: '#0f9589' },
    { label: 'Compras', value: purchases, color: '#047857' },
  ];
  return <section className="report-panel report-conversion">
    <header className="report-panel-heading"><h3>Análisis del funnel</h3><p>De la visibilidad a {event.destination}.</p></header>
    <svg className="report-funnel-svg" viewBox="0 0 360 314" role="img" aria-label="Embudo de conversión con cuatro etapas y sus resultados">
      {steps.map((step, index) => {
        const top = index * 78 + 2, inset = 6 + index * 22;
        return <g key={step.label}>
          <path d={`M ${inset} ${top} L ${360 - inset} ${top} L ${338 - inset} ${top + 67} Q 180 ${top + 77} ${inset + 22} ${top + 67} Z`} fill={step.color} />
          <text x="180" y={top + 25} textAnchor="middle" fill="white" fontSize="11">{step.label}</text>
          <text x="180" y={top + 53} textAnchor="middle" fill="white" fontSize={step.value == null ? '17' : '25'} fontWeight="750">{step.value == null ? 'No disponible' : formatDecimal(step.value, 0)}</text>
        </g>;
      })}
    </svg>
    <div className="report-funnel-rates">
      <div><span>{event.transition}</span><strong>{clicks ? formatDecimal(results / clicks * 100, 2) + '%' : 'No disponible'}</strong></div>
      <div><span>{event.cost}</span><strong>{results ? formatCurrency(spend / results, currency) : 'Sin resultados'}</strong></div>
    </div>
    {acquisition && reach != null && reach > 0 && <p className="report-funnel-frequency">Frecuencia: <strong>{formatDecimal(impressions / reach, 2)} veces</strong> por persona.</p>}
    <p className="report-caption">Esquema de etapas, no a escala. Son métricas agregadas, no personas seguidas de una etapa a otra.</p>
  </section>;
}
