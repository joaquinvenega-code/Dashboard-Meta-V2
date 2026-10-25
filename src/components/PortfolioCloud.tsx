import React, { useEffect, useRef, useState } from 'react';
import { firebaseConfigured } from '../services/firebaseService';
import { connectPortfolio, disconnectPortfolio, readPortfolio, watchPortfolioUser, writePortfolio } from '../services/portfolioStore';
import { validatePortfolio, portfolioFingerprint, type Portfolio } from '../lib/weeklyReports';

// Mounted by App even outside Configuration so edits in Detail are also saved.
export function usePortfolioCloud(portfolio: Portfolio, restore: (p: Portfolio) => void) {
  const [uid, setUid] = useState<string | null>(null);
  const [status, setStatus] = useState('La cartera se guarda en este navegador.');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [hasRemote, setHasRemote] = useState(false);
  const revision = useRef(0);
  const saved = useRef('');
  const latest = useRef(portfolio); latest.current = portfolio;
  const restoreRef = useRef(restore); restoreRef.current = restore;
  const userRef = useRef(uid); userRef.current = uid;
  const lock = useRef(false);
  const [tick, setTick] = useState(0);
  const json = portfolioFingerprint(portfolio);

  useEffect(() => watchPortfolioUser(setUid), []);
  useEffect(() => {
    setReady(false); setHasRemote(false); setChecking(Boolean(uid)); revision.current = 0; saved.current = '';
    if (!uid) { setStatus('La cartera se guarda en este navegador.'); return; }
    let cancelled = false;
    setStatus('Consultando la cartera guardada…');
    readPortfolio(uid).then(remote => {
      if (cancelled) return;
      setHasRemote(Boolean(remote));
      revision.current = remote?.revision || 0;
      if (remote && portfolioFingerprint(remote.portfolio) === portfolioFingerprint(latest.current)) {
        saved.current = portfolioFingerprint(remote.portfolio); setReady(true); setStatus('Cartera guardada en la nube.');
      } else {
        setStatus(remote ? 'Hay una cartera en la nube. Elegí cargarla o guardar la de este navegador.' : 'Guardá esta cartera para habilitar la sincronización automática.');
      }
    }).catch(() => { if (!cancelled) setStatus('No se pudo leer la cartera. Revisá la conexión y los permisos de Firebase.'); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [uid]);

  const save = async () => {
    if (!uid || lock.current) return;
    lock.current = true; setBusy(true);
    const payload = portfolioFingerprint(latest.current);
    try {
      const nextRevision = await writePortfolio(uid, latest.current, revision.current);
      if (userRef.current !== uid) return;
      revision.current = nextRevision; saved.current = payload;
      setReady(true); setHasRemote(true); setStatus('Cartera guardada en la nube.');
    } catch (error) {
      if (userRef.current === uid) { setReady(false); setStatus(error instanceof Error ? error.message : 'No se pudo guardar. Los cambios siguen en este navegador.'); }
    } finally { lock.current = false; setBusy(false); setTick(t => t + 1); }
  };
  useEffect(() => {
    if (!ready || !uid || json === saved.current || busy) return;
    setStatus('Cambios pendientes de guardar…');
    const timer = setTimeout(() => void save(), 1200);
    return () => clearTimeout(timer);
  }, [json, ready, uid, busy, tick]);

  const load = async () => {
    if (!uid || lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const remote = await readPortfolio(uid);
      if (userRef.current !== uid) return;
      if (!remote) throw new Error('Todavía no hay una cartera guardada.');
      // Keep a recoverable local backup before replacing any local configuration.
      localStorage.setItem('cr_portfolio_before_cloud_load', JSON.stringify(latest.current));
      revision.current = remote.revision; saved.current = portfolioFingerprint(remote.portfolio);
      restoreRef.current(remote.portfolio); setReady(true); setHasRemote(true); setStatus('Cartera cargada. Los próximos cambios se guardarán automáticamente.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'No se pudo cargar la cartera.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return { uid, status, busy, ready, checking, hasRemote, synced: ready && json === saved.current, save, load, setStatus };
}

export function PortfolioCloudPanel({ cloud, portfolio, onImport }: {
  cloud: ReturnType<typeof usePortfolioCloud>; portfolio: Portfolio; onImport: (p: Portfolio) => void;
}) {
  const buttonClass = 'rounded-lg border border-white/15 px-3 py-2 text-xs text-blue-200 disabled:opacity-40';
  const exportBackup = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(portfolio, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'orion-cartera.json'; a.click(); URL.revokeObjectURL(url);
  };
  return <section className="mb-5 space-y-3 rounded-xl border border-blue-400/20 bg-blue-400/5 p-4 text-sm print:hidden">
    <h3 className="font-semibold text-white">Guardado de cartera</h3>
    <p role="status" className="text-xs text-neutral-300">{cloud.status}</p>
    {!firebaseConfigured && <p className="text-xs text-amber-200">Falta conectar Firebase para sincronizar dispositivos y generar los informes de los lunes. Podés configurar clientes y exportar un respaldo mientras tanto.</p>}
    <div className="flex flex-wrap gap-2">
      {firebaseConfigured && !cloud.uid && <button className={buttonClass} onClick={() => void connectPortfolio().catch(() => cloud.setStatus('No se pudo conectar. Revisá el acceso con Google en Firebase.'))}>Conectar con Google</button>}
      {cloud.uid && <><button className={buttonClass} disabled={cloud.busy} onClick={() => void cloud.save()}>Guardar esta cartera</button><button className={buttonClass} disabled={cloud.busy} onClick={() => void cloud.load()}>Cargar cartera guardada</button><button className={buttonClass} disabled={cloud.busy} onClick={() => void disconnectPortfolio()}>Desconectar</button></>}
      <button className={buttonClass} onClick={exportBackup}>Exportar respaldo</button>
      <label className={`${buttonClass} cursor-pointer`}>Importar respaldo<input type="file" accept="application/json" className="hidden" onChange={async event => {
        const file = event.target.files?.[0]; if (!file) return;
        try { const p = validatePortfolio(JSON.parse(await file.text())); localStorage.setItem('cr_portfolio_before_import', JSON.stringify(portfolio)); onImport(p); }
        catch { cloud.setStatus('No se pudo importar: el archivo no es una cartera válida.'); }
        event.target.value = '';
      }} /></label>
    </div>
    {cloud.uid && <details className="text-xs text-neutral-400"><summary>Datos para activar la automatización</summary><p className="mt-2 break-all">Identificador de cartera: {cloud.uid}</p></details>}
  </section>;
}
