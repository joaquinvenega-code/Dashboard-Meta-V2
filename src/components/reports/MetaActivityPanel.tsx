import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useMetaActivity } from './useMetaActivity';

export function MetaActivityPanel({ accountIds, since, until }: { accountIds: string[]; since: string; until: string }) {
  const activity = useMetaActivity(accountIds, since, until);
  return <section className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 print:bg-white print:border-neutral-200">
    <header className="flex items-center justify-between gap-4"><div>
      <h3 className="text-sm font-bold text-white print:text-neutral-900">Actividad de Meta en la bitácora</h3>
      <p className="mt-1 text-xs text-neutral-400 print:text-neutral-600">Del {since.split('-').reverse().join('/')} al {until.split('-').reverse().join('/')}. Los cambios se incluyen automáticamente en el informe mensual correspondiente.</p>
    </div><button type="button" onClick={activity.refresh} disabled={activity.loading} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-blue-300 disabled:opacity-50 print:hidden"><RefreshCw size={14} className={activity.loading ? 'animate-spin' : ''} /><span>Actualizar actividad de Meta</span></button></header>
    {activity.loading && <p role="status" className="mt-4 text-sm text-neutral-400">Consultando cambios en Meta…</p>}
    {activity.notice && <p role="status" className="mt-4 text-sm text-amber-400 print:text-neutral-700">{activity.notice}</p>}
    {!activity.loading && !activity.logs.length && !activity.notice && <p className="mt-4 text-sm text-neutral-400">No se encontraron cambios de gestión en Meta para este período.</p>}
    <ol className="mt-4 grid gap-3 md:grid-cols-2">{activity.logs.map(log => <li key={log.id} className="rounded-xl border border-white/10 bg-black/20 p-4 print:bg-white print:border-neutral-200 print:break-inside-avoid"><div className="mb-2 flex justify-between text-xs text-blue-300 print:text-blue-700"><time>{log.date}</time><span>{log.source}</span></div><p className="text-sm text-neutral-200 print:text-neutral-800">{log.description}</p>{log.actor && <p className="mt-2 text-xs text-neutral-500">Registrado por: {log.actor}</p>}</li>)}</ol>
    {!!activity.automatic.length && <details className="mt-4 text-xs text-neutral-400 print:hidden"><summary className="cursor-pointer">Eventos técnicos automáticos ({activity.automatic.length}) · fuera del informe</summary><ul className="mt-3 space-y-2">{activity.automatic.map(log => <li key={log.id}>{log.date} · {log.description}</li>)}</ul></details>}
  </section>;
}
