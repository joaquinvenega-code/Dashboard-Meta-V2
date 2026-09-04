import React, { useId, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronDown, X } from 'lucide-react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { dashboardDatePresets, dateRangeError, DashboardDateRange } from '../lib/dashboardDates';

export function DashboardDateFilter({ value, onChange }: { value: DashboardDateRange; onChange: (value: DashboardDateRange) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [selected, setSelected] = useState('custom');
  const presets = dashboardDatePresets();
  const today = format(new Date(), 'yyyy-MM-dd');
  const applied = presets.find(preset => preset.since === value.since && preset.until === value.until);
  const error = dateRangeError(draft, today);
  const dateLabel = (date: string) => format(parseISO(date), 'd MMM yyyy', { locale: es });
  const rangeLabel = (range: DashboardDateRange) => range.since === range.until ? dateLabel(range.since) : `${dateLabel(range.since)} — ${dateLabel(range.until)}`;
  const open = () => {
    setDraft(value);
    setSelected(applied?.id || 'custom');
    dialog.current?.showModal();
  };
  return <>
    <button type="button" onClick={open} aria-haspopup="dialog" aria-label={`Filtrar por fecha: ${applied?.label || 'Personalizado'}. ${rangeLabel(value)}`} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#161c25] px-4 py-2 text-left transition hover:border-blue-400/50 hover:bg-[#1b2431] focus-visible:outline-2 focus-visible:outline-blue-400">
      <CalendarDays className="h-5 w-5 shrink-0 text-blue-400" />
      <span><span className="block text-sm font-semibold text-neutral-100">{applied?.label || 'Personalizado'}</span><span className="block text-xs text-neutral-400">{rangeLabel(value)}</span></span>
      <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-neutral-400" />
    </button>
    <dialog ref={dialog} aria-labelledby={`${id}-title`} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} className="dashboard-date-dialog fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#161c25] p-0 text-neutral-100 shadow-2xl backdrop:bg-black/65 backdrop:backdrop-blur-sm">
      <div className="p-5 sm:p-6">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div><h3 id={`${id}-title`} className="text-lg font-semibold">Elegí el período</h3><p className="mt-1 text-sm text-neutral-400">Compará el rendimiento en las fechas que necesitás.</p></div>
          <button type="button" aria-label="Cerrar selector de fechas" onClick={() => dialog.current?.close()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-neutral-400 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400"><X className="h-5 w-5" /></button>
        </header>
        <div className="grid gap-5 sm:grid-cols-[170px_minmax(0,1fr)]">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-1" role="group" aria-label="Períodos rápidos">
            {[...presets, { id: 'custom', label: 'Personalizado' }].map(preset => <button type="button" key={preset.id} aria-pressed={selected === preset.id} onClick={() => {
              setSelected(preset.id);
              if ('since' in preset) setDraft({ since: preset.since, until: preset.until });
            }} className={`flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-blue-400 ${selected === preset.id ? 'bg-blue-500/15 font-semibold text-blue-300 ring-1 ring-inset ring-blue-400/30' : 'text-neutral-300 hover:bg-white/5'}`}>
              {preset.label}{selected === preset.id && <Check className="h-4 w-4 shrink-0" />}
            </button>)}
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <p className="mb-4 text-sm font-medium">Rango de fechas</p>
            <div className="grid gap-4">
              {([{ key: 'since', label: 'Desde' }, { key: 'until', label: 'Hasta' }] as const).map(field => <label key={field.key} className="block text-xs font-medium text-neutral-400">
                {field.label}
                <input type="date" value={draft[field.key]} max={today} aria-describedby={error ? `${id}-error` : undefined} aria-invalid={Boolean(error)} onChange={event => {
                  setSelected('custom');
                  setDraft(current => ({ ...current, [field.key]: event.target.value }));
                }} className="mt-2 block min-h-12 w-full min-w-0 rounded-lg border border-white/15 bg-[#1c2532] px-3 py-3 text-base text-neutral-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20" />
              </label>)}
            </div>
            <div className="mt-4 min-h-12" aria-live="polite">
              {error ? <p id={`${id}-error`} role="alert" className="text-sm text-amber-300">{error}</p> : <><p className="text-sm font-medium text-blue-300">{differenceInCalendarDays(parseISO(draft.until), parseISO(draft.since)) + 1} {draft.since === draft.until ? 'día seleccionado' : 'días seleccionados'}</p><p className="mt-1 text-xs text-neutral-400">{rangeLabel(draft)}</p></>}
            </div>
          </div>
        </div>
        <footer className="mt-5 flex justify-end gap-3 border-t border-white/10 pt-5">
          <button type="button" onClick={() => dialog.current?.close()} className="min-h-11 rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-neutral-300 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-blue-400">Cancelar</button>
          <button type="button" disabled={Boolean(error)} onClick={() => {
            if (dateRangeError(draft, today)) return;
            if (draft.since !== value.since || draft.until !== value.until) onChange(draft);
            dialog.current?.close();
          }} className="min-h-11 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-blue-300 disabled:cursor-not-allowed disabled:opacity-40">Aplicar período</button>
        </footer>
      </div>
    </dialog>
  </>;
}
