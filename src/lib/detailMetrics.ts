import type { AccountSettings } from '../types';
import { detailOptions, trackingMetrics } from './weeklyReports';

export const DETAIL_METRICS = [
    { id: 'spend', label: 'Inversión' },
    { id: 'revenue', label: 'Facturación Ads' },
    { id: 'manual_revenue', label: 'Ventas Offline' },
    { id: 'total_revenue', label: 'Facturación Total' },
    { id: 'roas', label: 'ROAS Real' },
    { id: 'objective', label: 'Objetivo' },
    { id: 'progress_revenue', label: '% Objetivo' },
    { id: 'progress_budget', label: '% Presupuesto' },
    { id: 'ctr', label: 'CTR' },
    { id: 'clicks', label: 'Clics' },
    { id: 'purchases', label: 'Compras' },
    { id: 'atc', label: 'Agreg. carrito' },
    { id: 'ic', label: 'Pagos iniciados' },
    { id: 'cpp', label: 'Costo x compra' },
    { id: 'messages', label: 'Mensajes' },
    { id: 'cpm', label: 'Costo x mensaje' },
    { id: 'messages_real', label: 'Mensajes Reales' },
    { id: 'cpm_real', label: 'Costo Mensaje Real' },
    { id: 'leads', label: 'Clientes Potenciales (Leads)' },
    { id: 'cpl', label: 'Costo x Lead' },
    { id: 'leads_real', label: 'Leads Reales' },
    { id: 'cpl_real', label: 'Costo Lead Real' },
];

/** Shared with the detail view so the weekly selector describes the same PDF. */
export function detailVisibleMetrics(settings?: AccountSettings | null, sortBy = detailOptions(settings || undefined).sortBy): string[] {
  if (Array.isArray(settings?.visibleMetrics)) return settings.visibleMetrics;
  if (settings?.tracking === 'leads' || sortBy === 'leads') return trackingMetrics('leads');
  if (settings?.tracking === 'messaging' || sortBy === 'messages') return trackingMetrics('messaging');
  return trackingMetrics(settings?.tracking || 'ecommerce');
}
