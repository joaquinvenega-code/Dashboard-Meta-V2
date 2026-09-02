import React from 'react';
interface Props { learnings: string; actionPlan: string; clientRequests: string; onUpdate: (field: string, value: string) => void; isEditing: boolean }
export function RoadmapSectionV2({ learnings, actionPlan, clientRequests, onUpdate, isEditing }: Props) {
  const cards = [{ field: 'learnings', title: 'Aprendizajes', value: learnings }, { field: 'actionPlan', title: 'Próximas acciones', value: actionPlan }, { field: 'clientRequests', title: 'Necesidades del cliente', value: clientRequests }];
  const populated = cards.filter(card => card.value?.trim());
  return <section className={'report-panel report-next-steps' + (!populated.length ? ' report-screen-only' : '')}>
    <header className="report-panel-heading"><h3>Conclusiones y próximos pasos</h3></header>
    {isEditing && <div className="report-roadmap-edit report-screen-only">{cards.map(card => <label key={card.field}>{card.title}<textarea value={card.value || ''} onChange={event => onUpdate(card.field, event.target.value)} placeholder={'Definir ' + card.title.toLowerCase()} /></label>)}</div>}
    <dl className={isEditing ? 'report-next-list report-print-only' : 'report-next-list'}>{populated.map(card => <div key={card.field}><dt>{card.title}</dt><dd>{card.value}</dd></div>)}</dl>
    {!populated.length && !isEditing && <p className="report-empty">Sin conclusiones cargadas. Este bloque no aparece en el PDF.</p>}
  </section>;
}
