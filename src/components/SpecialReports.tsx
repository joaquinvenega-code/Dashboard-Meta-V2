import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Copy, FileText, Loader2, Plus, Printer, Save, Trash2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import type { AccountNote, AccountSettings, AdAccount } from '../types';
import type { AgencyBrandSettings } from './reports/ReportBrandSettings';
import { MonthlyReportDocument } from './reports/MonthlyReportDocument';
import { REPORT_MODES, type ReportMode } from './reports/reportData';
import { deleteSpecialDraft, duplicateSpecialReport, finalizeSpecialReport, listSpecialReports, reportValidation, saveSpecialReport, SPECIAL_SECTIONS, type SpecialReport } from '../lib/specialReports';
import { fetchReportCampaigns } from '../services/facebook';
import { loadSpecialReport } from '../services/specialReportData';
import './reports/report-editorial.css';

interface Props {
  accounts: AdAccount[]; visibleAccountIds: string[]; settings: Record<string, AccountSettings>;
  notes: AccountNote[]; agencySettings?: AgencyBrandSettings;
}
const field = 'w-full rounded-lg border border-white/15 bg-[#0c1119] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400';
const button = 'inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-neutral-200 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed';
const primary = button + ' bg-blue-600 hover:bg-blue-500 text-white border-blue-500';
const periodLabel = (report: SpecialReport) => `${format(new Date(report.since + 'T12:00:00'), 'dd/MM/yyyy')} – ${format(new Date(report.until + 'T12:00:00'), 'dd/MM/yyyy')}`;

export function SpecialReports({ accounts, visibleAccountIds, settings, notes, agencySettings }: Props) {
  const [library, setLibrary] = useState<SpecialReport[]>([]);
  const [report, setReport] = useState<SpecialReport | null>(null);
  const [screen, setScreen] = useState<'library' | 'configure' | 'preview'>('library');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignError, setCampaignError] = useState('');
  const [campaignRevision, setCampaignRevision] = useState(0);
  const clients = accounts.filter(a => visibleAccountIds.includes(a.id));
  const clientName = (account: AdAccount) => settings[account.id]?.customName || account.name;

  useEffect(() => {
    let cancelled = false;
    listSpecialReports().then(items => { if (!cancelled) { setLibrary(items); setReady(true); } })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    if (!dirty || busy || !ready || !report || report.status !== 'draft') return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      const saved = { ...report, updatedAt: new Date().toISOString() };
      saveSpecialReport(saved).then(() => {
        if (cancelled) return;
        setLibrary(current => [saved, ...current.filter(item => item.id !== saved.id)]);
        setReport(saved); setDirty(false); setMessage('Guardado en este navegador.');
      }).catch(e => { if (!cancelled) setError(e.message); });
    }, 700);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [report, dirty, busy, ready]);
  useEffect(() => {
    let cancelled = false;
    setCampaigns([]); setCampaignError(''); setCampaignSearch('');
    if (!report?.accountId || report.scope !== 'campaigns' || screen !== 'configure') { setCampaignsLoading(false); return; }
    setCampaignsLoading(true);
    fetchReportCampaigns(report.accountId).then(items => { if (!cancelled) setCampaigns(items); })
      .catch(e => { if (!cancelled) setCampaignError(e.message); })
      .finally(() => { if (!cancelled) setCampaignsLoading(false); });
    return () => { cancelled = true; };
  }, [report?.accountId, report?.scope, screen, campaignRevision]);

  function update(patch: Partial<SpecialReport>, invalidate = true) {
    setReport(current => current && current.status === 'draft' ? { ...current, ...patch, ...(invalidate ? { snapshot: undefined } : {}) } : current);
    setDirty(true); setMessage(''); setError('');
  }
  async function persist(next: SpecialReport) {
    const saved = { ...next, updatedAt: new Date().toISOString() };
    await saveSpecialReport(saved);
    setLibrary(current => [saved, ...current.filter(item => item.id !== saved.id)]);
    setReport(saved); setDirty(false); setMessage('Guardado en este navegador.');
    return saved;
  }
  async function save() {
    if (!report) return;
    setBusy(true); setError('');
    try { await persist(report); } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  function create() {
    const now = new Date().toISOString();
    const account = clients[0];
    setReport({ version: 1, id: crypto.randomUUID(), status: 'draft', createdAt: now, updatedAt: now,
      accountId: account?.id || '', clientName: account ? clientName(account) : '', title: '', objective: '',
      since: format(subDays(new Date(), 7), 'yyyy-MM-dd'), until: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
      mode: 'ecommerce', theme: 'light', scope: 'account', campaigns: [],
      sections: { performance: true, assets: true, geography: true, management: true }, texts: {},
    });
    setScreen('configure'); setDirty(true); setEditing(true); setError(''); setMessage('');
  }
  function open(item: SpecialReport) {
    setReport(structuredClone(item)); setScreen(item.snapshot ? 'preview' : 'configure');
    setDirty(false); setEditing(item.status === 'draft'); setError(''); setMessage('');
  }
  async function back() {
    setBusy(true); setError('');
    try { if (report && dirty) await persist(report); setScreen('library'); setReport(null); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function generate() {
    if (!report) return;
    const invalid = reportValidation(report);
    const account = clients.find(a => a.id === report.accountId);
    if (invalid || !account) { setError(invalid || 'El cliente ya no está disponible. Elegí otro cliente.'); return; }
    setBusy(true); setError(''); setMessage('Consultando los datos del período…');
    try {
      const next = { ...report, clientName: clientName(account) };
      const snapshot = await loadSpecialReport(next, { currency: account.currency || 'ARS', logo: settings[account.id]?.customLogo, agencyName: agencySettings?.agencyName, agencyLogo: agencySettings?.logoUrl }, notes);
      const generated = { ...next, snapshot };
      setReport(generated); setDirty(true); setScreen('preview'); setEditing(true);
      await persist(generated);
    } catch (e) { setMessage(''); setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function finalize() {
    if (!report) return;
    setBusy(true); setError('');
    try { await persist(finalizeSpecialReport(report)); setEditing(false); setMessage('Informe finalizado. Los datos y textos quedaron guardados.'); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function duplicate(item: SpecialReport) {
    setBusy(true); setError('');
    try { const copy = await persist(duplicateSpecialReport(item)); setReport(copy); setScreen('configure'); setEditing(true); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function removeDraft(item: SpecialReport) {
    const title = item.title.trim() || 'Informe sin título';
    if (!window.confirm(`¿Eliminar el borrador «${title}»? Esta acción no se puede deshacer.`)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await deleteSpecialDraft(item.id);
      setLibrary(current => current.filter(entry => entry.id !== item.id));
      setMessage(`Se eliminó el borrador «${title}».`);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function print() {
    if (!report?.snapshot) return;
    setBusy(true); setError(''); setEditing(false);
    const oldTitle = document.title;
    try {
      if (dirty) await persist(report);
      document.title = `${report.clientName} - ${report.title}`;
      await document.fonts?.ready;
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await Promise.race([
        Promise.all(Array.from(document.querySelectorAll<HTMLImageElement>('.special-report-root .report-editorial img')).map(image => image.decode().catch(() => undefined))),
        new Promise(resolve => setTimeout(resolve, 3000)),
      ]);
      window.print();
    } catch (e) { setError((e as Error).message); }
    finally { document.title = oldTitle; setBusy(false); }
  }
  const feedback = <div className="print:hidden" aria-live="polite">
    {error && <p role="alert" className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">{error}</p>}
    {message && <p className="mt-2 text-xs text-neutral-400">{message}</p>}
  </div>;
  if (screen === 'library' || !report) return <div className="space-y-5">
    <section className="rounded-xl border border-white/10 bg-[#11161e] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-white">Informes especiales</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-400">Analizá promociones, lanzamientos y eventos con las fechas y campañas que necesites. Prepará el análisis y entregalo como PDF.</p></div>
        <button type="button" className={primary} onClick={create} disabled={!ready || busy || !clients.length}><Plus size={16} />Nuevo informe</button></div>
      <p className="mt-4 text-xs text-neutral-500">Biblioteca guardada en este navegador. Los informes finalizados conservan sus métricas y textos; descargá el PDF para compartirlo o conservar una copia fuera de Orion.</p>
    </section>
    {feedback}
    {!ready && !error && <p role="status" className="text-sm text-neutral-400">Cargando biblioteca…</p>}
    {ready && !clients.length && <p className="text-sm text-neutral-400">Habilitá un cliente en tu cartera para crear un informe.</p>}
    {library.length > 0 && <input className={field} aria-label="Buscar informe especial" placeholder="Buscar por título o cliente" value={search} onChange={e => setSearch(e.target.value)} />}
    <div className="grid gap-3 md:grid-cols-2">{library.filter(item => `${item.title} ${item.clientName}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(item =>
      <article key={item.id} className="rounded-xl border border-white/10 bg-[#11161e] p-5">
        <div className="flex items-start justify-between gap-3"><FileText className="text-blue-400" size={20} /><span className={'rounded-full px-2.5 py-1 text-xs ' + (item.status === 'final' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-200')}>{item.status === 'final' ? 'Finalizado' : 'Borrador'}</span></div>
        <h3 className="mt-3 break-words text-base font-semibold text-white">{item.title || 'Informe sin título'}</h3><p className="mt-1 text-sm text-neutral-300">{item.clientName || 'Sin cliente'}</p>
        <p className="mt-2 text-xs text-neutral-500">{item.since && item.until ? periodLabel(item) : 'Período por definir'} · {REPORT_MODES[item.mode].label}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => open(item)} disabled={busy} className={button}>{item.status === 'final' ? 'Ver informe' : 'Continuar'}</button>
          <button type="button" onClick={() => void duplicate(item)} disabled={busy} className={button} aria-label={`Duplicar ${item.title}`}><Copy size={15} />Duplicar</button>
          {item.status === 'draft' && <button type="button" onClick={() => void removeDraft(item)} disabled={busy} className={button + ' text-red-300'} aria-label={`Eliminar borrador: ${item.title || 'Informe sin título'}`}><Trash2 size={15} />Eliminar borrador</button>}
        </div>
      </article>)}
    </div>
    {ready && !library.length && <div className="rounded-xl border border-dashed border-white/15 p-10 text-center"><FileText className="mx-auto mb-3 text-neutral-500" size={30} /><p className="text-sm text-neutral-300">Tu primer análisis especial empieza acá.</p><p className="mt-1 text-xs text-neutral-500">Por ejemplo: Cyber Monday, una apertura o el lanzamiento de un producto.</p></div>}
    {library.length > 0 && !library.some(item => `${item.title} ${item.clientName}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())) && <p className="text-sm text-neutral-400">No hay informes que coincidan.</p>}
  </div>;

  const frozen = report.status === 'final';
  return <div className={screen === 'preview' ? 'monthly-report-print-root special-report-root space-y-5 pb-16' : 'space-y-5 pb-16'}>
    <div className="print:hidden flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#11161e] p-4">
      <button type="button" onClick={() => void back()} disabled={busy} className={button}><ArrowLeft size={16} />Biblioteca</button>
      <span className="text-xs text-neutral-400">{busy ? 'Procesando…' : frozen ? 'Finalizado · Copia guardada' : dirty ? 'Cambios sin guardar' : 'Borrador guardado'}</span>
      <div className="flex flex-wrap gap-2">
        {!frozen && <button type="button" onClick={() => void save()} disabled={busy} className={button}><Save size={15} />Guardar borrador</button>}
        {screen === 'preview' && <>
          {!frozen && <button type="button" onClick={() => { setScreen('configure'); setEditing(true); }} disabled={busy} className={button}>Configurar</button>}
          {!frozen && <button type="button" onClick={() => setEditing(!editing)} disabled={busy} className={button}>{editing ? 'Vista de entrega' : 'Editar análisis'}</button>}
          {!frozen && <button type="button" onClick={() => void finalize()} disabled={busy} className={button}><Check size={15} />Finalizar</button>}
          {frozen && <button type="button" onClick={() => void duplicate(report)} disabled={busy} className={button}><Copy size={15} />Crear una copia</button>}
          <button type="button" onClick={() => void print()} disabled={busy} className={primary}><Printer size={15} />Imprimir / Guardar PDF</button>
        </>}
      </div>
    </div>
    {feedback}
    {screen === 'configure' && <form onSubmit={e => { e.preventDefault(); void generate(); }} className="rounded-xl border border-white/10 bg-[#11161e] p-5 sm:p-7">
      <h2 className="text-xl font-semibold text-white">Preparar informe especial</h2><p className="mt-1 text-sm text-neutral-400">Definí el evento y los datos que querés analizar.</p>
      <fieldset disabled={busy} className="mt-6 space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="space-y-2 text-sm text-neutral-300"><span>Cliente</span><select className={field} value={report.accountId} onChange={e => { const account = clients.find(a => a.id === e.target.value); update({ accountId: e.target.value, clientName: account ? clientName(account) : '', campaigns: [] }); }} required><option value="" disabled>Elegí un cliente</option>{clients.map(a => <option key={a.id} value={a.id}>{clientName(a)}</option>)}</select></label>
          <label className="space-y-2 text-sm text-neutral-300"><span>Nombre del informe</span><input className={field} value={report.title} onChange={e => update({ title: e.target.value })} placeholder="Resultados Cyber Monday" maxLength={120} required /></label>
          <label className="space-y-2 text-sm text-neutral-300"><span>Desde</span><input className={field} type="date" value={report.since} max={report.until || format(new Date(), 'yyyy-MM-dd')} onChange={e => update({ since: e.target.value })} required /></label>
          <label className="space-y-2 text-sm text-neutral-300"><span>Hasta</span><input className={field} type="date" value={report.until} min={report.since} max={format(new Date(), 'yyyy-MM-dd')} onChange={e => update({ until: e.target.value })} required /></label>
        </div>
        <label className="block space-y-2 text-sm text-neutral-300"><span>Objetivo del evento <span className="text-neutral-500">· opcional</span></span><textarea className={field} rows={3} value={report.objective} maxLength={1200} onChange={e => update({ objective: e.target.value })} placeholder="Qué buscábamos lograr y qué queremos evaluar con este informe." /></label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="space-y-2 text-sm text-neutral-300"><span>Resultado principal</span><select className={field} value={report.mode} onChange={e => update({ mode: e.target.value as ReportMode })}>{Object.entries(REPORT_MODES).map(([id, mode]) => <option value={id} key={id}>{mode.label}</option>)}</select></label>
          <label className="space-y-2 text-sm text-neutral-300"><span>Vista previa</span><select className={field} value={report.theme} onChange={e => update({ theme: e.target.value as 'light' | 'dark' }, false)}><option value="light">Claro</option><option value="dark">Oscuro</option></select></label>
        </div>
        <div><h3 className="text-sm font-medium text-white">Alcance del análisis</h3><div className="mt-3 flex flex-wrap gap-5 text-sm text-neutral-300">{(['account', 'campaigns'] as const).map(scope => <label key={scope} className="flex items-center gap-2"><input type="radio" name="special-scope" checked={report.scope === scope} onChange={() => update({ scope })} className="accent-blue-500" />{scope === 'account' ? 'Toda la cuenta' : 'Campañas específicas'}</label>)}</div>
          {report.scope === 'campaigns' && <div className="mt-4 rounded-lg border border-white/10 p-4">
            <input className={field} aria-label="Buscar campaña" placeholder="Buscar campaña por nombre" value={campaignSearch} onChange={e => setCampaignSearch(e.target.value)} />
            <p className="my-3 text-xs text-neutral-400">{report.campaigns.length} seleccionadas · Incluye campañas de eventos anteriores.</p>
            {campaignsLoading && <p role="status" className="text-sm text-neutral-400">Cargando campañas…</p>}
            {campaignError && <div role="alert" className="text-sm text-amber-200">{campaignError}<button type="button" className={button + ' ml-3'} onClick={() => setCampaignRevision(n => n + 1)}>Reintentar</button></div>}
            <div className="max-h-64 space-y-2 overflow-y-auto">{[...campaigns, ...report.campaigns.filter(c => !campaigns.some(item => item.id === c.id))].filter(c => c.name.toLocaleLowerCase().includes(campaignSearch.toLocaleLowerCase())).map(c => <label key={c.id} className="flex items-start gap-3 rounded-md p-2 text-sm text-neutral-300 hover:bg-white/5"><input type="checkbox" className="mt-1 accent-blue-500" checked={report.campaigns.some(item => item.id === c.id)} onChange={e => update({ campaigns: e.target.checked ? [...report.campaigns, c] : report.campaigns.filter(item => item.id !== c.id) })} />{c.name}</label>)}</div>
            {!campaignsLoading && !campaignError && !campaigns.length && <p className="text-xs text-neutral-400">No se encontraron campañas para esta cuenta.</p>}
          </div>}
        </div>
        <div><h3 className="text-sm font-medium text-white">Secciones del informe</h3><p className="mt-1 text-xs text-neutral-500">El resumen de resultados y el embudo se incluyen siempre.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{Object.entries(SPECIAL_SECTIONS).map(([id, label]) => <label key={id} className="flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" className="accent-blue-500" checked={report.sections[id as keyof typeof SPECIAL_SECTIONS]} onChange={e => update({ sections: { ...report.sections, [id]: e.target.checked } })} />{label}</label>)}</div></div>
        <div className="flex flex-wrap gap-3"><button className={primary} type="submit" disabled={busy || (report.scope === 'campaigns' && !report.campaigns.length)}>{busy ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}Generar vista previa</button>{report.snapshot && <button type="button" className={button} onClick={() => setScreen('preview')}>Volver a la vista previa</button>}</div>
      </fieldset>
    </form>}
    {screen === 'preview' && report.snapshot && <>
      <p className="print:hidden text-xs text-neutral-400">{frozen ? 'Esta versión conserva los datos y textos de la entrega. Para modificarla, creá una copia.' : 'Editá el análisis antes de finalizar. Si cambiás fechas, campañas o secciones, generá nuevamente la vista previa.'}</p>
      <div><MonthlyReportDocument {...report.snapshot} theme={report.theme} sections={report.sections} texts={report.texts} isEditing={!frozen && editing && !busy} onUpdate={(key, value) => update({ texts: { ...report.texts, [key]: value } }, false)} /></div>
    </>}
  </div>;
}
