import React, { useState, useMemo, useEffect } from 'react';
import { 
  AdAccount, 
  AccountSettings, 
  AccountNote, 
} from '../types';
import { 
  FileText, 
  Printer, 
  BarChart3,
  Loader2,
  Sun,
  Moon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import { MonthlyReportDocument } from './reports/MonthlyReportDocument';
import './reports/report-editorial.css';
import { collectReportLogs, ReportLog } from './reports/reportLogs';
import { aggregateDemographics, aggregateGeography, aggregatePlacements, completeDailySeries, reportPeriodMetrics, ReportMetrics, PlacementBasis, ReportMode, REPORT_MODES } from './reports/reportData';
import { fetchAccountDailyPerformance, fetchReportPeriodTotals, fetchDemographics, fetchGeography, fetchTopAds, fetchPlacements } from '../services/facebook';

interface ReportsSectionProps {
  accounts: AdAccount[];
  visibleAccountIds: string[];
  settings: Record<string, AccountSettings>;
  notes: AccountNote[];
  setDateRange?: (range: { since: string; until: string }) => void;
  onGeneratingChange?: (generating: boolean) => void;
}

export function ReportsSection({ accounts, visibleAccountIds, settings, notes, setDateRange, onGeneratingChange }: ReportsSectionProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [reportMonth, setReportMonth] = useState<string>(format(subMonths(new Date(), 1), 'yyyy-MM'));
  const [reportType, setReportType] = useState<ReportMode>('ecommerce');
  const [reportTheme, setReportTheme] = useState<'light' | 'dark'>('light');
  const [isReportGenerated, setIsReportGenerated] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [bitacora, setBitacora] = useState<ReportLog[]>([]);
  const [bitacoraNotice, setBitacoraNotice] = useState('');
  const [loadingBitacora, setLoadingBitacora] = useState(false);

  // Estados reales
  const [realMetrics, setRealMetrics] = useState<ReportMetrics>({
    spend: 0, 
    purchases: 0, 
    roas: 0, 
    revenue: 0, 
    impressions: 0, 
    reach: undefined,
    clicks: 0, 
    atc: 0, 
    viewContent: 0, 
    messages: 0,
    costPerMessage: 0,
    leads: 0,
    costPerLead: 0,
    ctr: 0,
    currency: 'ARS' 
  });
  const [realDailyData, setRealDailyData] = useState<any[]>([]);
  const [realTopAds, setRealTopAds] = useState<any[]>([]);
  const [realDemographics, setRealDemographics] = useState<any[]>([]);
  const [realGeography, setRealGeography] = useState<any[]>([]);
  const [realGeographyRegions, setRealGeographyRegions] = useState<any[]>([]);
  const [realPlacements, setRealPlacements] = useState<any[]>([]);
  const [placementBasis, setPlacementBasis] = useState<PlacementBasis>('spend');
  const [hasReportData, setHasReportData] = useState(false);
  const [loadingRealData, setLoadingRealData] = useState(false);

  // Estados para campos editables persistentes localmente
  const [reportTexts, setReportTexts] = useState<Record<string, any>>({
    narrative: '',
    learnings: '',
    actionPlan: '',
    clientRequests: ''
  });

  // Cargar datos guardados cuando cambia la cuenta o el mes
  useEffect(() => {
    if (onGeneratingChange) {
      onGeneratingChange(loadingRealData || loadingBitacora);
    }
  }, [loadingRealData, loadingBitacora, onGeneratingChange]);

  useEffect(() => {
    if (!selectedAccountId) return;
    const saved = localStorage.getItem(`report_texts_${selectedAccountId}_${reportMonth}_${reportType}`);
    if (saved) {
      setReportTexts(JSON.parse(saved));
    } else {
      setReportTexts({ narrative: '', learnings: '', actionPlan: '', clientRequests: '' });
    }
  }, [selectedAccountId, reportMonth, reportType]);

  const updateReportText = (field: string, val: string) => {
    setReportTexts(prev => {
      const next = { ...prev, [field]: val };
      localStorage.setItem(`report_texts_${selectedAccountId}_${reportMonth}_${reportType}`, JSON.stringify(next));
      return next;
    });
  };

  // Sincronizar cuenta seleccionada
  useEffect(() => {
    if ((!selectedAccountId || !visibleAccountIds.includes(selectedAccountId)) && visibleAccountIds.length > 0) {
      setSelectedAccountId(visibleAccountIds[0]);
    }
  }, [visibleAccountIds, selectedAccountId]);

  // Reseteamos el estado de generación si cambia la cuenta o el mes
  useEffect(() => {
    setIsReportGenerated(false);
  }, [selectedAccountId, reportMonth]);

  // Keep voice/manual notes and API mirrors in chronological, month-scoped order.
  useEffect(() => {
    if (!selectedAccountId || !isReportGenerated) { setLoadingBitacora(false); return; }
    const controller = new AbortController();
    let cancelled = false;
    const local = collectReportLogs(notes, [], selectedAccountId, reportMonth);
    setBitacora(local.logs);
    setBitacoraNotice('');
    setLoadingBitacora(true);
    const timeout = setTimeout(() => controller.abort(), 8000);
    async function fetchBitacora() {
      let remote: any[] = [];
      let failed = false;
      try {
        const res = await fetch(`/api/bitacora/${encodeURIComponent(selectedAccountId)}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Bitácora no disponible');
        const result = await res.json();
        if (!result.success || !Array.isArray(result.data)) throw new Error('Respuesta inválida');
        remote = result.data;
      } catch { failed = true; }
      finally {
        clearTimeout(timeout);
        if (!cancelled) {
          const combined = collectReportLogs(notes, remote, selectedAccountId, reportMonth);
          setBitacora(combined.logs);
          setBitacoraNotice([
            failed ? 'No se pudo consultar la bitácora del servidor. Se muestran las notas locales disponibles; el historial puede estar incompleto.' : '',
            combined.unresolved ? `${combined.unresolved} registros no tienen una fecha completa verificable. Revisá su fecha para incluirlos en el mes correcto.` : '',
          ].filter(Boolean).join(' '));
          setLoadingBitacora(false);
        }
      }
    }
    fetchBitacora();
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [selectedAccountId, reportMonth, isReportGenerated, notes]);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  // Keep real period totals separate from breakdowns. Missing data is never
  // replaced with samples or conversions estimated from spend.
  useEffect(() => {
    if (!selectedAccountId || !isReportGenerated) { setLoadingRealData(false); return; }
    let cancelled = false;
    async function loadData() {
      setLoadingRealData(true);
      setHasReportData(false);
      try {
        const start = startOfMonth(parseISO(reportMonth + '-01'));
        const since = format(start, 'yyyy-MM-dd');
        const until = format(endOfMonth(start), 'yyyy-MM-dd');
        const [daily, topAds, demo, geography, placements, period] = await Promise.all([
          fetchAccountDailyPerformance(selectedAccountId, since, until),
          fetchTopAds(selectedAccountId, since, until, 5, reportType === 'leads' ? 'leads' : 'spend'),
          fetchDemographics(selectedAccountId, since, until),
          fetchGeography(selectedAccountId, since, until),
          fetchPlacements(selectedAccountId, since, until),
          fetchReportPeriodTotals(selectedAccountId, since, until),
        ]);
        if (cancelled) return;
        setHasReportData(Boolean(period) || daily.length > 0);
        setRealMetrics(reportPeriodMetrics(period, daily, selectedAccount?.currency || 'ARS'));
        setRealDailyData(completeDailySeries(daily, reportMonth));
        setRealTopAds(topAds.map(ad => ({ ...ad, thumbnail: ad.thumbnail || '', originalThumbnailUrl: ad.originalThumbnailUrl || ad.thumbnail || '', roas: ad.spend > 0 ? ad.revenue / ad.spend : 0 })));
        setRealDemographics(aggregateDemographics(demo));
        const distribution = aggregatePlacements(placements, reportType);
        setRealPlacements(distribution.data);
        setPlacementBasis(distribution.basis);
        const geographicData = aggregateGeography(geography);
        setRealGeography(geographicData.countries);
        setRealGeographyRegions(geographicData.regions);
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching report data', error);
        setRealMetrics(reportPeriodMetrics(null, [], selectedAccount?.currency || 'ARS'));
        setRealDailyData([]); setRealTopAds([]); setRealDemographics([]);
        setRealPlacements([]); setRealGeography([]); setRealGeographyRegions([]);
      } finally {
        if (!cancelled) setLoadingRealData(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [selectedAccountId, reportMonth, reportType, isReportGenerated, selectedAccount?.currency]);

  // Sustituimos metrics mockeados por los de realMetrics
  const metrics = { ...realMetrics };

  // Real daily data is fetched in useEffect, so we don't mock it here
  const dailyPerformanceData = realDailyData.length > 0 ? realDailyData : [];
  const reportAssets = realTopAds;

  const handlePrint = async () => {
    setIsEditing(false);

    // Wait for the editing controls to disappear and for web fonts/charts to
    // settle before Chromium takes its print-layout snapshot.
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const images = Array.from(document.querySelectorAll<HTMLImageElement>('.report-editorial img'));
    await Promise.race([
      Promise.all(images.map(image => image.decode().catch(() => undefined))),
      new Promise<void>(resolve => setTimeout(resolve, 3000)),
    ]);
    window.print();
  };

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => {
      const date = subMonths(new Date(), i + 1);
      return {
        label: format(date, 'MMMM yyyy', { locale: es }),
        value: format(date, 'yyyy-MM')
      };
    });
  }, []);

  if (!selectedAccount) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-600 bg-[#111] rounded-xl border border-white/5 border-dashed">
        <FileText className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm font-black uppercase tracking-widest text-center">Selecciona una cuenta para generar el informe modular</p>
      </div>
    );
  }

  if (!isReportGenerated) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#0a0a0a] rounded-xl border border-white/5">
        <FileText className="w-16 h-16 mb-6 text-blue-500/50" />
        <h2 className="text-xl font-black text-white uppercase tracking-widest mb-8">Generador de Informes</h2>
        
        <div className="flex flex-col gap-6 w-full max-w-sm">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Cuenta Activa</label>
            <select 
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-[#111] border border-white/10 rounded px-4 py-3 text-sm font-black text-white uppercase tracking-widest outline-none focus:border-blue-500/50"
            >
              <option value="" disabled>Selecciona una cuenta</option>
              {accounts.filter(a => visibleAccountIds.includes(a.id)).map(acc => (
                <option key={acc.id} value={acc.id} className="bg-[#111]">{settings[acc.id]?.customName || acc.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Período</label>
            <select 
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="bg-[#111] border border-white/10 rounded px-4 py-3 text-sm font-black text-white uppercase tracking-widest outline-none focus:border-blue-500/50"
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-[#111]">{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label id="report-event-label" className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Evento principal del informe</label>
            <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="report-event-label">
              <button
                type="button"
                onClick={() => setReportType('ecommerce')}
                aria-pressed={reportType === 'ecommerce'}
                className={cn(
                  "py-3 px-2 rounded text-[10px] font-black uppercase tracking-wider border transition-all text-center",
                  reportType === 'ecommerce'
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                    : "bg-[#111] border-white/10 text-slate-400 hover:text-white"
                )}
              >
                Solo E-commerce
              </button>
              <button
                type="button"
                onClick={() => setReportType('messaging')}
                aria-pressed={reportType === 'messaging'}
                className={cn(
                  "py-3 px-2 rounded text-[10px] font-black uppercase tracking-wider border transition-all text-center",
                  reportType === 'messaging'
                    ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : "bg-[#111] border-white/10 text-slate-400 hover:text-white"
                )}
              >
                Solo Mensajería
              </button>
              <button
                type="button"
                onClick={() => setReportType('leads')}
                aria-pressed={reportType === 'leads'}
                className={cn(
                  "col-span-2 py-3 px-2 rounded text-[10px] font-black uppercase tracking-wider border transition-all text-center",
                  reportType === 'leads'
                    ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/20"
                    : "bg-[#111] border-white/10 text-slate-400 hover:text-white"
                )}
              >
                Clientes potenciales
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {reportType === 'leads'
                ? 'Evento: cliente potencial (lead) de Meta. El informe mostrará leads y costo por cliente potencial (CPL), sin mezclarlos con mensajes o compras.'
                : reportType === 'messaging' ? 'Evento: conversaciones iniciadas. El informe mostrará mensajes y costo por mensaje.' : 'Evento: compras atribuidas. El informe mostrará compras, facturación y ROAS.'}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Estilo Visual</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReportTheme('light')}
                className={cn(
                  "py-2.5 px-3 rounded text-[10px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-2",
                  reportTheme === 'light'
                    ? "bg-white border-white text-slate-900 shadow-md"
                    : "bg-[#111] border-white/10 text-slate-400 hover:text-white"
                )}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                Modo Claro
              </button>
              <button
                type="button"
                onClick={() => setReportTheme('dark')}
                className={cn(
                  "py-2.5 px-3 rounded text-[10px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-2",
                  reportTheme === 'dark'
                    ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20"
                    : "bg-[#111] border-white/10 text-slate-400 hover:text-white"
                )}
              >
                <Moon className="w-3.5 h-3.5 text-blue-300" />
                Modo Oscuro
              </button>
            </div>
          </div>

          <button
            onClick={() => setIsReportGenerated(true)}
            className={cn(
              "mt-4 text-white font-black text-xs uppercase tracking-widest py-4 px-6 rounded-md transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer",
              reportType === 'ecommerce' 
                ? "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20" 
                : reportType === 'leads' ? "bg-violet-600 hover:bg-violet-500 shadow-violet-500/20" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            Generar Informe
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="monthly-report-print-root space-y-6 pb-20 animate-in fade-in duration-700">
      {/* TOOLBAR */}
      <div className="bg-[#0a0a0a] rounded-lg border border-white/5 p-4 flex flex-wrap items-center justify-between gap-4 print:hidden sticky top-4 z-[110] backdrop-blur-md bg-opacity-90 shadow-2xl">
        <div className="flex items-end gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest">Cuenta Activa</span>
            <div className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[10px] font-black text-white uppercase tracking-widest">
              {settings[selectedAccountId]?.customName || selectedAccount.name}
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest">Período</span>
             <div className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[10px] font-black text-white uppercase tracking-widest">
              {monthOptions.find(o => o.value === reportMonth)?.label || reportMonth}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest">Paquete</span>
            <div className={cn(
              "border rounded px-3 py-1.5 text-[10px] font-black uppercase tracking-widest",
              reportType === 'ecommerce' 
                ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                : reportType === 'leads' ? "border-violet-500/20 bg-violet-500/10 text-violet-400" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            )}>
              {REPORT_MODES[reportType].label}
            </div>
          </div>

          <button
            onClick={() => setIsReportGenerated(false)}
            className="ml-1 px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/5 text-slate-400 transition-all cursor-pointer"
          >
            Cambiar
          </button>

          {(loadingRealData || loadingBitacora) && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-md text-blue-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-[8px] font-black uppercase tracking-widest">Orion Procesando</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Selector Toggle */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-md p-1">
            <button
              type="button"
              onClick={() => setReportTheme('light')}
              title="Ver informe en Modo Claro"
              className={cn(
                "px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                reportTheme === 'light'
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Sun className="w-3 h-3 text-amber-500" />
              Claro
            </button>
            <button
              type="button"
              onClick={() => setReportTheme('dark')}
              title="Ver informe en Modo Oscuro"
              className={cn(
                "px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                reportTheme === 'dark'
                  ? "bg-blue-600 text-white shadow shadow-blue-500/30"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Moon className="w-3 h-3 text-blue-300" />
              Oscuro
            </button>
          </div>

          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "px-4 py-2 rounded-md text-[9px] font-black uppercase tracking-[0.2em] transition-all border cursor-pointer",
              isEditing 
                ? "bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-600/20" 
                : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10"
            )}
          >
            {isEditing ? 'Bloquear para Envío' : 'Habilitar Edición'}
          </button>
          
          <button 
            onClick={handlePrint}
            disabled={loadingRealData || loadingBitacora}
            className="flex items-center gap-2 px-5 py-2 bg-white text-black rounded-md text-[9px] font-black uppercase tracking-[0.2em] hover:bg-neutral-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Exportar / Imprimir
          </button>
        </div>
      </div>

      <div className="relative">
        {(loadingRealData || loadingBitacora) && <div className="print:hidden absolute inset-0 z-50 bg-white/80 flex items-start justify-center pt-16"><div className="bg-slate-900 text-white px-6 py-4 rounded-xl flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin" />Actualizando informe...</div></div>}
        <MonthlyReportDocument
          name={settings[selectedAccountId]?.customName || selectedAccount.name}
          logo={settings[selectedAccountId]?.customLogo}
          month={reportMonth} mode={reportType} theme={reportTheme}
          metrics={metrics} dataAvailable={hasReportData}
          daily={dailyPerformanceData} assets={reportAssets}
          demographics={realDemographics} countries={realGeography} regions={realGeographyRegions}
          placements={realPlacements} placementBasis={placementBasis}
          texts={reportTexts} onUpdate={updateReportText} isEditing={isEditing} logs={bitacora} logsNotice={bitacoraNotice}
        />
      </div>
    </div>
  );
}


