import React from 'react';
import { Mic, PenLine, SlidersHorizontal, CalendarDays } from 'lucide-react';
import type { ReportLog } from '../reportLogs';
const categories: Record<string, string> = { observation: 'Observación', change: 'Cambio', meeting: 'Reunión', urgent: 'Prioridad', optimizacion: 'Optimización', estrategia: 'Estrategia', creativo: 'Creativos', config: 'Configuración', estructura: 'Estructura', testing: 'Prueba', escalado: 'Escalado', presupuesto: 'Presupuesto' };
export function conciseManagementNotice(notice: string) {
  return notice
    .replace('La bitácora del servidor no estuvo disponible. Se conservan las notas locales.', 'Historial parcial: algunas notas no estuvieron disponibles.')
    .replace('La bitácora corresponde a toda la cuenta durante el período; no está filtrada por campaña. Las métricas sí corresponden a las campañas seleccionadas.', 'La bitácora abarca toda la cuenta; las métricas, solo las campañas elegidas.')
    .replace('No se pudo consultar la actividad de Meta; se conservan las notas disponibles.', 'Historial parcial: actividad de Meta no disponible.');
}
export function ManagementTimelineV2({ logs, notice, concise = false }: { logs: ReportLog[]; notice?: string; concise?: boolean }) {
  const rows = Array.from({ length: Math.ceil(logs.length / 2) }, (_, index) => logs.slice(index * 2, index * 2 + 2));
  return <section className="report-panel report-timeline">
    <header className="report-panel-heading"><h3><CalendarDays size={16} /> Bitácora de gestión</h3><p>{logs.length ? concise ? `${logs.length} acciones registradas en el período.` : `${logs.length} registros del período. Seguí los números para recorrer los cambios en orden cronológico.` : 'Historial de cambios, revisiones y decisiones del período.'}</p></header>
    {notice && <p className="report-data-note">{concise ? conciseManagementNotice(notice) : notice}</p>}
    {!concise && logs.some(log => log.source?.startsWith('Meta')) && <p className="report-caption report-timeline-source">Los registros de Meta Ads muestran cambios registrados en la cuenta. Las notas de la agencia aportan el contexto y las decisiones.</p>}
    {concise && logs.length > 0 && <table className="report-log-print" aria-label="Bitácora de gestión por fecha">
      <thead><tr><th scope="col">Fecha</th><th scope="col">Acción</th><th scope="col">Registrado por</th></tr></thead>
      <tbody>{logs.map(log => <tr key={log.id}>
        <td><time>{log.date}</time></td>
        <td><small>{categories[log.category || ''] || 'Gestión'} · {log.source || 'Gestión'}</small><p>{log.description}</p></td>
        <td>{log.actor || '—'}</td>
      </tr>)}</tbody>
    </table>}
    {logs.length ? <div className={'report-timeline-path' + (concise ? ' report-screen-only' : '')} role="list">{rows.map((row, rowIndex) => <div className={'report-timeline-row' + (rowIndex % 2 ? ' is-reversed' : '') + (rowIndex === rows.length - 1 ? ' is-last' : '')} key={rowIndex}>
      {row.map((log, index) => {
        const Icon = log.source === 'Voz' ? Mic : log.source === 'Manual' ? PenLine : SlidersHorizontal;
        return <article key={log.id} role="listitem" className="report-timeline-entry">
          <span className="report-timeline-node">{rowIndex * 2 + index + 1}</span>
          <div className="report-timeline-card"><div className="report-timeline-meta"><time>{log.date}</time><span><Icon size={11} />{log.source || 'Gestión'}</span></div>
            <h4>{categories[log.category || ''] || 'Registro de gestión'}</h4><p>{log.description}</p>
            {log.actor && <small className="report-timeline-actor">Registrado por: {log.actor}</small>}
          </div>
        </article>;
      })}
    </div>)}</div> : <p className="report-empty">No se encontraron anotaciones ni cambios de gestión disponibles para esta cuenta y este período. Las notas de voz, las notas guardadas y la actividad de Meta aparecen aquí con su fecha.</p>}
  </section>;
}
