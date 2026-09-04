import React from 'react';
import { formatCurrency, formatDecimal } from '../../../lib/utils';
import { REPORT_MODES, ReportMode } from '../reportData';
import { Wallet, MessageCircle, Users, ShoppingBag, Target, MousePointerClick, TrendingUp, Banknote } from 'lucide-react';
interface Props {
  metrics: { spend: number; purchases: number; roas: number; revenue: number; messages?: number; costPerMessage?: number; leads?: number; clicks?: number; ctr?: number; currency?: string };
  narrative: string; onNarrativeChange: (value: string) => void; isEditing: boolean; mode?: ReportMode; dataAvailable?: boolean;
}
export function ExecutiveSummaryV2({ metrics, narrative, onNarrativeChange, isEditing, mode = 'ecommerce', dataAvailable = true }: Props) {
  const currency = metrics.currency || 'ARS';
  const event = REPORT_MODES[mode];
  const results = metrics[event.key] || 0;
  const cpa = results > 0 ? formatCurrency(metrics.spend / results, currency) : 'Sin resultados';
  const items = mode !== 'ecommerce' ? [
    ['Inversión', formatCurrency(metrics.spend, currency)], [event.result, formatDecimal(results, 0)], [event.cost, results > 0 ? cpa : '—'], ['CTR', formatDecimal(metrics.ctr || 0, 2) + '%'],
  ] : [
    ['Inversión', formatCurrency(metrics.spend, currency)], ['Compras', formatDecimal(results, 0)], ['ROAS', formatDecimal(metrics.roas, 2) + 'x'], ['Facturación', formatCurrency(metrics.revenue, currency)],
  ];
  const icons = [Wallet, mode === 'messaging' ? MessageCircle : mode === 'leads' ? Users : ShoppingBag, mode === 'ecommerce' ? TrendingUp : Target, mode === 'ecommerce' ? Banknote : MousePointerClick];
  const autoSummary = 'En el período se registraron ' + formatDecimal(results, 0) + ' ' + event.result.toLowerCase() + ' con una inversión de ' + formatCurrency(metrics.spend, currency) + (results > 0 ? '. El costo medio por ' + event.singular + ' fue de ' + cpa + '.' : '. No se puede calcular un costo por resultado.');
  return <section className="report-summary">
    <div className="report-kpis">{items.map(([label, value], index) => {
      const Icon = icons[index];
      return <div key={label} className={'report-kpi' + (index === 1 ? ' report-kpi-primary' : '')}>
        <div className="report-kpi-heading"><span>{label}</span><Icon aria-hidden="true" /></div>
        <strong>{dataAvailable ? value : '—'}</strong>
      </div>;
    })}</div>
    <div className="report-summary-reading"><h3>Lectura del mes</h3>
      {isEditing && <textarea className="report-screen-only" aria-label="Conclusión del mes" value={narrative} onChange={event => onNarrativeChange(event.target.value)} placeholder="Agregá tu análisis del mes. Si queda vacío, se imprimirá una síntesis factual de las métricas." />}
      <p className={isEditing ? 'report-print-only' : ''}>{narrative.trim() || (dataAvailable ? autoSummary : 'No hay métricas disponibles para este período. No se reemplazaron los datos faltantes por valores de ejemplo.')}</p>
      {!narrative.trim() && <small>Síntesis automática de métricas; no incluye una evaluación de rentabilidad.</small>}
    </div>
  </section>;
}

