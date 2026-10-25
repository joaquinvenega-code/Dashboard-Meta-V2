import React, { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { watchPortfolioUser } from '../services/portfolioStore';
import { listWeeklyDownloads, downloadWeeklyReport } from '../services/weeklyDownloadsStore';
import type { DownloadBatch } from '../lib/weeklyDownloads';

const dateLabel = (date: string) => date.slice(0, 10).split('-').reverse().join('/');
export function WeeklyDownloadsView({ batches, busy, downloading, message, connected, refresh, download }: {
  batches: DownloadBatch[]; busy: boolean; downloading: string; message: string; connected: boolean;
  refresh: () => void; download: (batch: string, report: string) => void;
}) {
  return <section className="space-y-4 rounded-xl border border-blue-400/20 bg-blue-500/[0.04] p-4" aria-label="Descargas semanales">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-semibold text-white">PDF disponibles</h3><p className="mt-1 text-xs text-neutral-400">Últimas cuatro semanas · resumen de Detalle de cuentas</p></div>
      {connected && <button type="button" disabled={busy || Boolean(downloading)} onClick={refresh} className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs text-blue-200 disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" />Actualizar</button>}
    </div>
    <p role="status" className="text-xs text-neutral-300">{!connected ? 'Conectá tu cartera con Google para ver tus informes privados.' : busy ? 'Buscando informes…' : message || (!batches.length ? 'Todavía no hay informes disponibles. Aparecerán aquí después de la próxima generación semanal.' : 'Elegí el cliente y descargá su PDF para enviarlo.')}</p>
    {connected && !busy && batches.map(batch => <div key={batch.id} className="space-y-2">
      <h4 className="text-sm font-semibold text-blue-100">Semana del {dateLabel(batch.since)} al {dateLabel(batch.until)}</h4>
      <p className="text-[11px] text-neutral-500">Generado el {dateLabel(batch.generatedAt)} · disponible hasta el {dateLabel(batch.expiresAt)}</p>
      <div className="divide-y divide-white/10">{batch.reports.map(report => <div key={report.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <span className="text-sm text-neutral-200">{report.name}</span>
        {report.status === 'listo' ? <button type="button" disabled={Boolean(downloading)} onClick={() => download(batch.id, report.id)} className="flex items-center gap-2 rounded-lg bg-blue-500/15 px-3 py-2 text-xs font-medium text-blue-200 hover:bg-blue-500/25 disabled:opacity-50"><Download className="h-4 w-4" />{downloading === `${batch.id}/${report.id}` ? 'Descargando…' : 'Descargar PDF'}</button> : <span className="text-xs text-amber-200">Requiere revisión · PDF no disponible</span>}
      </div>)}</div>
    </div>)}
  </section>;
}

export function WeeklyDownloads() {
  const [uid, setUid] = useState<string | null>(null);
  const [batches, setBatches] = useState<DownloadBatch[]>([]);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState('');
  const [message, setMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const userRef = useRef(uid); userRef.current = uid;
  useEffect(() => watchPortfolioUser(setUid), []);
  useEffect(() => {
    let cancelled = false;
    setBatches([]); setMessage(''); setDownloading(''); setBusy(Boolean(uid));
    if (uid) listWeeklyDownloads(uid).then(result => { if (!cancelled) setBatches(result); })
      .catch(() => { if (!cancelled) setMessage('No se pudo consultar los informes. Revisá tu conexión y volvé a actualizar.'); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [uid, refreshKey]);
  const download = async (batch: string, report: string) => {
    if (!uid || downloading) return;
    const owner = uid;
    setDownloading(`${batch}/${report}`); setMessage('');
    try {
      const file = await downloadWeeklyReport(owner, batch, report);
      if (userRef.current !== owner) return;
      const url = URL.createObjectURL(new Blob([file.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = file.file; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMessage('PDF descargado. Lo vas a encontrar en las descargas de tu navegador.');
    } catch (error) { if (userRef.current === owner) setMessage(error instanceof Error ? error.message : 'No se pudo descargar el PDF.'); }
    finally { if (userRef.current === owner) setDownloading(''); }
  };
  return <WeeklyDownloadsView batches={batches} busy={busy} downloading={downloading} message={message} connected={Boolean(uid)} refresh={() => setRefreshKey(n => n + 1)} download={(b, r) => void download(b, r)} />;
}
