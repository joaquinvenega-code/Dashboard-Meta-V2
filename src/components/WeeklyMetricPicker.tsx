import React, { useId, useState } from 'react';
import { ChevronDown, Settings2 } from 'lucide-react';
import type { AccountSettings } from '../types';
import { DETAIL_METRICS, detailVisibleMetrics } from '../lib/detailMetrics';
import { detailOptions } from '../lib/weeklyReports';

export function WeeklyMetricPicker({ name, settings, disabled, onChange }: {
  name: string; settings: AccountSettings; disabled: boolean;
  onChange: (settings: AccountSettings) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const metrics = detailVisibleMetrics(settings);
  const options = detailOptions(settings);
  return <div className="mt-3">
    <button type="button" aria-expanded={open} aria-controls={id} aria-label={`Métricas del PDF de ${name}`}
      onClick={() => setOpen(value => !value)} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-blue-200 hover:bg-white/5">
      <Settings2 className="h-3.5 w-3.5" />Métricas del PDF
      <span className="text-neutral-400">· {options.showMetrics ? `${metrics.length} elegidas` : 'Ocultas'}</span>
      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div id={id} role="group" aria-label={`Métricas del PDF de ${name}`} className="mt-3 space-y-4 rounded-lg border border-white/10 bg-black/20 p-4">
      <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={options.showMetrics} disabled={disabled}
        onChange={event => onChange({ ...settings, detailReport: { ...options, showMetrics: event.target.checked } })}
        className="h-4 w-4 accent-blue-500 disabled:opacity-40" />Mostrar métricas en el PDF</label>
      <fieldset disabled={disabled || !options.showMetrics} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 disabled:opacity-40">
        <legend className="sr-only">Elegí las métricas de {name}</legend>
        {DETAIL_METRICS.map(metric => <label key={metric.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-neutral-200 hover:bg-white/5">
          <input type="checkbox" checked={metrics.includes(metric.id)} onChange={event => onChange({ ...settings,
            visibleMetrics: event.target.checked ? [...metrics, metric.id] : metrics.filter(value => value !== metric.id),
          })} className="h-4 w-4 shrink-0 accent-blue-500" />{metric.label}
        </label>)}
      </fieldset>
      {options.showMetrics && !metrics.length && <p role="status" className="text-xs text-amber-200">Sin métricas elegidas, este bloque no aparecerá en el PDF.</p>}
      <p className="text-xs text-neutral-500">Se guarda automáticamente y también se aplica en Detalle de cuentas. Los PDF ya generados no cambian.</p>
    </div>}
  </div>;
}
