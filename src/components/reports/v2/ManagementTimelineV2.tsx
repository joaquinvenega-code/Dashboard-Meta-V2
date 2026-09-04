import React from 'react';
import { Mic, PenLine, SlidersHorizontal, CalendarDays } from 'lucide-react';
import type { ReportLog } from '../reportLogs';
const categories: Record<string, string> = { observation: 'Observación', change: 'Cambio', meeting: 'Reunión', urgent: 'Prioridad', optimizacion: 'Optimización', estrategia: 'Estrategia', creativo: 'Creativos', config: 'Configuración', estructura: 'Estructura', testing: 'Prueba', escalado: 'Escalado', presupuesto: 'Presupuesto' };
export function ManagementTimelineV2({ logs, notice }: { logs: ReportLog[]; notice?: string }) {
  const rows = Array.from({ length: Math.ceil(logs.length / 2) }, (_, index) => logs.slice(index * 2, index * 2 + 2));
  return <section className="report-panel report-timeline">
    <header className="report-panel-heading"><h3><CalendarDays size={16} /> Bitácora de gestión</h3><p>{logs.length ? `${logs.length} registros del mes. Seguí los números para recorrer los cambios en orden cronológico.` : 'Historial de cambios, revisiones y decisiones del mes.'}</p></header>
    {notice && <p className="report-data-note">{notice}</p>}
    {logs.some(log => log.source?.startsWith('Meta')) && <p className="report-caption report-timeline-source">Los registros de Meta Ads muestran cambios registrados en la cuenta. Las notas de la agencia aportan el contexto y las decisiones.</p>}
    {logs.length ? <div className="report-timeline-path" role="list">{rows.map((row, rowIndex) => <div className={'report-timeline-row' + (rowIndex % 2 ? ' is-reversed' : '') + (rowIndex === rows.length - 1 ? ' is-last' : '')} key={rowIndex}>
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
    </div>)}</div> : <p className="report-empty">No se encontraron anotaciones ni cambios de gestión disponibles para esta cuenta y este mes. Las notas de voz, las notas guardadas y la actividad de Meta aparecen aquí con su fecha.</p>}
  </section>;
}
