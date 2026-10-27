import React, { useMemo, useState } from 'react';
import { CalendarDays, Check, Search } from 'lucide-react';
import type { AccountGroup, AccountSettings, AdAccount, ClientCategory } from '../types';
import { buildClientEntities, isClientVisible, weeklyClientChoices } from '../lib/clientEntities';
import { cn } from '../lib/utils';
import { connectPortfolio } from '../services/portfolioStore';
import type { usePortfolioCloud } from './PortfolioCloud';
import { WeeklyDownloads } from './WeeklyDownloads';

type Props = {
  accounts: AdAccount[]; groups: AccountGroup[]; categories: ClientCategory[];
  settings: Record<string, AccountSettings>; visibleAccountIds: string[];
  cloud: ReturnType<typeof usePortfolioCloud>;
  onSettingsChange: (id: string, settings: AccountSettings) => void;
  onManageClients: () => void; children: React.ReactNode;
};
const types: Record<AccountSettings['tracking'], string> = {
  ecommerce: 'Compras web', messaging: 'Mensajería', both: 'Compras + mensajería', leads: 'Clientes potenciales', all: 'Multicanal',
};

export function ReportsHub({ children, ...props }: Props) {
  const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly');
  const [monthlyOpened, setMonthlyOpened] = useState(false);
  return <div className="space-y-5">
    <div role="tablist" aria-label="Tipo de informe" className="flex gap-2 rounded-xl border border-white/10 bg-[#11161e] p-1.5 print:hidden">
      {([{ id: 'weekly', title: 'Semanales', detail: 'Resumen automático' }, { id: 'monthly', title: 'Mensuales', detail: 'Análisis completo' }] as const).map(t =>
        <button key={t.id} type="button" role="tab" id={`reports-${t.id}-tab`} aria-controls={`reports-${t.id}`} aria-selected={tab === t.id}
          onClick={() => { setTab(t.id); if (t.id === 'monthly') setMonthlyOpened(true); }} className={cn('flex-1 rounded-lg px-4 py-3 text-left', tab === t.id ? 'bg-blue-500/15 text-white ring-1 ring-blue-400/20' : 'text-neutral-400 hover:bg-white/5')}>
          <span className="block text-sm font-semibold">{t.title}</span><span className="mt-0.5 block text-xs text-neutral-400">{t.detail}</span>
        </button>)}
    </div>
    <div role="tabpanel" id="reports-weekly" aria-labelledby="reports-weekly-tab" hidden={tab !== 'weekly'} className={tab !== 'weekly' ? 'hidden' : ''}><WeeklyReports {...props} /></div>
    <div role="tabpanel" id="reports-monthly" aria-labelledby="reports-monthly-tab" hidden={tab !== 'monthly'} className={tab !== 'monthly' ? 'hidden' : ''}>{monthlyOpened && children}</div>
  </div>;
}

export function WeeklyReports({ accounts, groups, categories, settings, visibleAccountIds, cloud, onSettingsChange, onManageClients }: Omit<Props, 'children'>) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const entities = useMemo(() => buildClientEntities(accounts, groups, settings), [accounts, groups, settings]);
  const clients = weeklyClientChoices(entities, settings, visibleAccountIds);
  const filtered = clients.filter(e => (category === 'all' || (settings[e.id]?.categoryId || '') === category) && e.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const enabled = clients.filter(e => settings[e.id]?.weeklyReportEnabled).length;
  const disabled = !cloud.ready || cloud.checking;
  const button = 'rounded-lg border border-white/15 px-3 py-2 text-xs text-blue-200 disabled:opacity-40';
  return <div className="space-y-5">
    <WeeklyDownloads />
    <section aria-label="Automatización semanal" className="overflow-hidden rounded-xl border border-white/10 bg-[#11161e]">
      <div className="space-y-3 border-b border-white/10 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-white">¿Para qué clientes automatizamos el informe?</h3>
          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-200">{enabled} {enabled === 1 ? 'seleccionado' : 'seleccionados'}</span>
        </div>
        <p className="flex items-center gap-2 text-xs text-neutral-400"><CalendarDays className="h-4 w-4" />Entrega prevista: lunes 08:00 h Argentina · lunes a domingo anterior</p>
        <div role="status" className="flex flex-wrap items-center gap-2 text-xs">
          {cloud.checking ? <span className="text-neutral-400">Cargando tu selección…</span> : cloud.ready ?
            <span className={cloud.synced && !cloud.busy ? 'flex items-center gap-1 text-emerald-300' : 'text-neutral-400'}>{cloud.synced && !cloud.busy ? <><Check className="h-3.5 w-3.5" />Cambios guardados</> : 'Guardando selección…'}</span> : <>
              <span className="text-neutral-300">{!cloud.uid ? 'Conectá tu cartera para guardar la selección.' : cloud.hasRemote ? 'Continuá con tu cartera guardada o usá la de este navegador.' : cloud.status}</span>
              {!cloud.uid ? <button type="button" className={button} onClick={() => void connectPortfolio().catch(() => cloud.setStatus('No se pudo conectar con Google. Volvé a intentarlo.'))}>Conectar con Google</button> : <>
                {cloud.hasRemote && <button type="button" disabled={cloud.busy} className={button} onClick={() => void cloud.load()}>Cargar cartera guardada</button>}
                <button type="button" disabled={cloud.busy} className={button} onClick={() => void cloud.save()}>{cloud.hasRemote ? 'Usar la de este navegador' : 'Guardar cartera'}</button>
              </>}
              {(cloud.hasRemote || !cloud.uid) && /No se pudo|cambió|error/i.test(cloud.status) && <span role="alert" className="w-full text-amber-200">{cloud.status}</span>}
            </>}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 px-4 py-3 sm:px-5">
        <label className="relative min-w-40 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" /><input aria-label="Buscar cliente para automatizar" placeholder="Buscar cliente" value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-xs text-white" /></label>
        {categories.length > 0 && <select aria-label="Grupo de clientes" value={category} onChange={e => setCategory(e.target.value)} className="rounded-lg border border-white/10 bg-[#11161e] px-3 py-2 text-xs text-neutral-200"><option value="all">Todos los grupos</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="">Sin grupo</option></select>}
      </div>
      <div className="divide-y divide-white/10 px-4 sm:px-5">
        {filtered.map(e => <div key={e.id} className="flex items-center justify-between gap-4 py-4">
          <div className="min-w-0"><p className="break-words text-sm font-medium text-white">{e.name}</p>
            <p className="mt-1 text-xs text-neutral-500">{[categories.find(c => c.id === settings[e.id]?.categoryId)?.name, types[settings[e.id].tracking], e.isConsolidated ? `${e.memberAccounts.length} cuentas` : '', !isClientVisible(e, visibleAccountIds) ? 'Oculto en tableros' : ''].filter(Boolean).join(' · ')}</p>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-neutral-200"><input type="checkbox" role="switch" aria-label={`Automatizar informe de ${e.name}`} checked={settings[e.id]?.weeklyReportEnabled === true} disabled={disabled}
            onChange={event => onSettingsChange(e.id, { ...settings[e.id], weeklyReportEnabled: event.target.checked })} className="h-4 w-4 accent-blue-500 disabled:opacity-40" />Automatizar</label>
        </div>)}
        {!filtered.length && <p className="py-6 text-center text-sm text-neutral-400">{search || category !== 'all' ? 'No hay clientes que coincidan.' : 'Tus clientes activos y visibles aparecerán acá.'}</p>}
      </div>
      <div className="border-t border-white/10 px-4 py-3 sm:px-5"><button type="button" onClick={onManageClients} className="text-xs text-neutral-400 underline underline-offset-4 hover:text-white">Administrar clientes</button></div>
    </section>
  </div>;
}
