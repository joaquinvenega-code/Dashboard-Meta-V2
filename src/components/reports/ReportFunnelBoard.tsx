import React from 'react';
import { formatCurrency, formatDecimal } from '../../lib/utils';
import { REPORT_MODES, ReportMode } from './reportData';
interface Props { spend: number; ctr: number; purchases: number; messages: number; leads?: number; atc: number; viewContent?: number; tracking: ReportMode | 'both'; impressions?: number; clicks?: number; reach?: number; currency?: string }
export function ReportFunnelBoard({ spend, purchases, messages, leads = 0, atc, tracking, impressions = 0, clicks = 0, reach, currency = 'ARS' }: Props) {
  const event = REPORT_MODES[tracking === 'both' ? 'ecommerce' : tracking];
  const acquisition = tracking === 'messaging' || tracking === 'leads';
  const results = { messages, purchases, leads }[event.key];
  const impressionsDescription = 'Veces que se mostraron los anuncios. Una persona puede verlos varias veces.';
  const clicksDescription = 'Clics en el anuncio, que pueden abrir un enlace u otra parte del anuncio.';
  const steps = acquisition ? [
    { label: 'Impresiones', value: impressions, color: '#2563eb', description: impressionsDescription },
    { label: 'Personas alcanzadas', value: reach, color: '#147ea0', description: 'Personas distintas que vieron los anuncios al menos una vez.' },
    { label: 'Clics en anuncios', value: clicks, color: '#0f9589', description: clicksDescription },
    { label: event.result, value: results, color: '#047857', description: tracking === 'leads' ? 'Contactos potenciales que Meta atribuye a los anuncios; todavía no son ventas.' : 'Conversaciones iniciadas que Meta atribuye a los anuncios, no la cantidad de mensajes enviados.' },
  ] : [
    { label: 'Impresiones', value: impressions, color: '#2563eb', description: impressionsDescription },
    { label: 'Clics en anuncios', value: clicks, color: '#147ea0', description: clicksDescription },
    { label: 'Agregados al carrito', value: atc, color: '#0f9589', description: 'Veces que se agregó un producto al carrito, sin que necesariamente se haya comprado.' },
    { label: 'Compras', value: purchases, color: '#047857', description: 'Compras registradas que Meta atribuye a los anuncios.' },
  ];
  return <section className="report-panel report-conversion">
    <header className="report-panel-heading"><h3>Análisis del funnel</h3><p>De la visibilidad a {event.destination}.</p></header>
    <svg className="report-funnel-svg" viewBox="0 0 360 314" role="img" aria-label="Embudo de conversión con cuatro etapas y sus resultados">
      {steps.map((step, index) => {
        const top = index * 78 + 2, inset = 6 + index * 22;
        return <g key={step.label}>
          <path d={`M ${inset} ${top} L ${360 - inset} ${top} L ${338 - inset} ${top + 67} Q 180 ${top + 77} ${inset + 22} ${top + 67} Z`} transform="translate(36 0) scale(0.8 1)" fill={step.color} />
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
    <div className="report-funnel-guide">
      <h4>Cómo leer el embudo</h4>
      <ol>{steps.map((step, index) => <li key={step.label}>
        <span className="report-funnel-step-number" style={{ backgroundColor: step.color }} aria-hidden="true">{index + 1}</span>
        <p><strong>{step.label}.</strong> {step.description}</p>
      </li>)}</ol>
    </div>
    <p className="report-caption">Esquema ilustrativo, no a escala. Cada etapa muestra un total del período, no el recorrido de las mismas personas.</p>
  </section>;
}
