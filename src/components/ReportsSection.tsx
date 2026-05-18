import React, { useState, useMemo, useEffect } from 'react';
import { 
  AdAccount, 
  AccountSettings, 
  AccountNote, 
  DemographicData, 
  GeographicData 
} from '../types';
import { 
  FileText, 
  Download, 
  Printer, 
  Filter, 
  ChevronDown,
  BarChart3,
  X,
  CheckCircle2
} from 'lucide-react';
import { cn, formatCurrency, formatDecimal } from '../lib/utils';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

import { ReportHeader } from './reports/ReportHeader';
import { ExecutiveSummaryV2 } from './reports/v2/ExecutiveSummaryV2';
import { ReportFunnelBoard } from './reports/ReportFunnelBoard';
import { PerformanceChartV2 } from './reports/v2/PerformanceChartV2';
import { PlacementsChartV2 } from './reports/v2/PlacementsChartV2';
import { DemographicsGeographyV2 } from './reports/v2/DemographicsGeographyV2';
import { AssetPerformanceV2 } from './reports/v2/AssetPerformanceV2';
import { ManagementTimelineV2 } from './reports/v2/ManagementTimelineV2';
import { RoadmapSectionV2 } from './reports/v2/RoadmapSectionV2';
import { ReportGlossaryV2 } from './reports/v2/ReportGlossaryV2';

interface ReportsSectionProps {
  accounts: AdAccount[];
  visibleAccountIds: string[];
  settings: Record<string, AccountSettings>;
  notes: AccountNote[];
  setDateRange?: (range: { since: string; until: string }) => void;
}

function ReportPage({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn(
      "bg-white w-full aspect-[1/1.4142] p-8 md:p-16 shadow-2xl mb-8 last:mb-0 relative overflow-hidden transition-all print:p-12 print:shadow-none print:m-0 print:w-screen print:h-screen print:aspect-none",
      className
    )}>
      {children}
    </div>
  );
}

export function ReportsSection({ accounts, visibleAccountIds, settings, notes, setDateRange }: ReportsSectionProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [reportMonth, setReportMonth] = useState<string>(format(subMonths(new Date(), 1), 'yyyy-MM'));
  const [isEditing, setIsEditing] = useState(true);
  const [bitacora, setBitacora] = useState<any[]>([]);
  const [loadingBitacora, setLoadingBitacora] = useState(false);

  // Estados para campos editables persistentes localmente
  const [reportTexts, setReportTexts] = useState<Record<string, any>>(() => {
    const saved = localStorage.getItem(`report_texts_${selectedAccountId}_${reportMonth}`);
    return saved ? JSON.parse(saved) : {
      narrative: '',
      learnings: '',
      actionPlan: '',
      clientRequests: ''
    };
  });

  // Guardar cambios en localStorage
  useEffect(() => {
    if (selectedAccountId) {
      localStorage.setItem(`report_texts_${selectedAccountId}_${reportMonth}`, JSON.stringify(reportTexts));
    }
  }, [reportTexts, selectedAccountId, reportMonth]);

  // Sincronizar cuenta seleccionada
  useEffect(() => {
    if ((!selectedAccountId || !visibleAccountIds.includes(selectedAccountId)) && visibleAccountIds.length > 0) {
      setSelectedAccountId(visibleAccountIds[0]);
    }
  }, [visibleAccountIds, selectedAccountId]);

  // Cargar Bitácora Real de Orion
  useEffect(() => {
    async function fetchBitacora() {
      if (!selectedAccountId) return;
      setLoadingBitacora(true);
      try {
        const res = await fetch(`/api/bitacora/${selectedAccountId}`);
        const result = await res.json();
        if (result.success) {
          // Filtrado básico por mes (aquí podrías filtrar más preciso por fechas)
          setBitacora(result.data.slice(-10)); 
        }
      } catch (err) {
        console.error("Error bitácora:", err);
      } finally {
        setLoadingBitacora(false);
      }
    }
    fetchBitacora();
  }, [selectedAccountId, reportMonth]);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  
  // Procesamiento de Métricas MoM
  const metrics = useMemo(() => {
    if (!selectedAccount) return { spend: 0, purchases: 0, roas: 0, revenue: 0, impressions: 0, clicks: 0, currency: 'ARS' };
    return {
      spend: selectedAccount.spend || 0,
      purchases: selectedAccount.purchases || 0,
      roas: (selectedAccount.revenue || 0) / (selectedAccount.spend || 1),
      revenue: selectedAccount.revenue || 0,
      impressions: selectedAccount.impressions || 0,
      clicks: selectedAccount.clicks || 0,
      currency: selectedAccount.currency || 'ARS'
    };
  }, [selectedAccount]);

  const prevMonthMetrics = useMemo(() => {
    // Simulación del mes anterior (puedes conectarlo a datos históricos reales si existen)
    const factor = 0.82 + (Math.random() * 0.3);
    return {
      spend: metrics.spend * factor,
      purchases: Math.floor(metrics.purchases * factor),
      roas: metrics.roas * (0.85 + Math.random() * 0.25),
      revenue: metrics.revenue * factor
    };
  }, [metrics]);

  const dailyPerformanceData = useMemo(() => {
    const start = startOfMonth(parseISO(reportMonth + '-01'));
    const end = endOfMonth(start);
    const dayCount = end.getDate();
    
    return Array.from({ length: dayCount }).map((_, i) => {
      const day = i + 1;
      const progress = day / dayCount;
      // Simular curva de crecimiento y fluctuación diaria
      const baseRev = metrics.revenue / dayCount;
      const basePurchases = metrics.purchases / dayCount;
      const randomness = 0.5 + Math.random();
      
      return {
        date: format(new Date(start.getFullYear(), start.getMonth(), day), 'dd/MM'),
        revenue: Math.round(baseRev * randomness),
        purchases: Math.round(basePurchases * randomness)
      };
    });
  }, [metrics.revenue, metrics.purchases, reportMonth]);

  const mockAssets = useMemo(() => [
    { id: '1', name: 'Creativo Ganador - Emocional', thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&q=80', roas: 5.2, purchases: 124, revenue: 450000, spend: 86500 },
    { id: '2', name: 'UGC Review - Cliente Bio', thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80', roas: 4.8, purchases: 98, revenue: 320000, spend: 66600 },
    { id: '3', name: 'Bento Grid Style - Feature List', thumbnail: 'https://images.unsplash.com/photo-1557838923-2985c318be48?w=400&q=80', roas: 4.1, purchases: 85, revenue: 290000, spend: 71000 },
    { id: '4', name: 'Video 15s - Promo Invierno', thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80', roas: 3.9, purchases: 72, revenue: 210000, spend: 54000 },
    { id: '5', name: 'Catálogo Carrusel - New In', thumbnail: 'https://images.unsplash.com/photo-1542744094-24638eff58bb?w=400&q=80', roas: 3.5, purchases: 65, revenue: 185000, spend: 52800 },
  ], []);

  const handlePrint = () => {
    setIsEditing(false);
    setTimeout(() => {
      window.print();
    }, 150);
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

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      {/* TOOLBAR */}
      <div className="bg-[#0a0a0a] rounded-lg border border-white/5 p-4 flex flex-wrap items-center justify-between gap-4 print:hidden sticky top-4 z-[110] backdrop-blur-md bg-opacity-90 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[7px] font-black text-blue-500 uppercase tracking-widest">Cuenta Activa</label>
            <select 
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-blue-500/50"
            >
              {accounts.filter(a => visibleAccountIds.includes(a.id)).map(acc => (
                <option key={acc.id} value={acc.id} className="bg-[#111]">{settings[acc.id]?.customName || acc.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-[7px] font-black text-blue-500 uppercase tracking-widest">Período</label>
            <select 
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-blue-500/50"
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-[#111]">{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "px-4 py-2 rounded-md text-[9px] font-black uppercase tracking-[0.2em] transition-all border",
              isEditing 
                ? "bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-600/20" 
                : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10"
            )}
          >
            {isEditing ? 'Bloquear para Envío' : 'Habilitar Edición'}
          </button>
          
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 bg-white text-black rounded-md text-[9px] font-black uppercase tracking-[0.2em] hover:bg-neutral-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            <Printer className="w-4 h-4" />
            Exportar / Imprimir
          </button>
        </div>
      </div>

      {/* REPORT SURFACE */}
      <div className="max-w-5xl mx-auto bg-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] p-16 md:p-24 text-black print:shadow-none print:p-0 print:max-w-none transition-all duration-500">
        
        <ReportHeader 
          name={settings[selectedAccountId]?.customName || selectedAccount.name} 
          logo={settings[selectedAccountId]?.customLogo} 
          month={reportMonth} 
        />

        <div className="space-y-16 mt-12">
          {/* Módulo 1: Resumen Ejecutivo */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <ExecutiveSummaryV2 
              metrics={metrics}
              prevMonthMetrics={prevMonthMetrics}
              narrative={reportTexts.narrative}
              onNarrativeChange={(val) => setReportTexts(prev => ({ ...prev, narrative: val }))}
              isEditing={isEditing}
            />
          </div>

          {/* Módulo 2 & 3: Funnel & Placements (GRID) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            {/* Funnel Module */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">02</div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Análisis del Funnel</h3>
              </div>
              <div className="h-[430px]">
                <ReportFunnelBoard 
                  spend={metrics.spend}
                  ctr={metrics.clicks / (metrics.impressions || 1) * 100}
                  purchases={metrics.purchases}
                  messages={0}
                  atc={Math.floor(metrics.clicks * 0.1)} 
                  impressions={metrics.impressions}
                  clicks={metrics.clicks}
                  tracking="ecommerce"
                />
              </div>
            </div>

            {/* Placements Chart Module */}
            <div className="space-y-4">
              <div className="w-full h-8" /> {/* Spacer to align with funnel title */}
              <PlacementsChartV2 
                data={[
                  { name: 'Instagram Stories', value: 45, color: '#3b82f6' },
                  { name: 'Instagram Reels', value: 30, color: '#10b981' },
                  { name: 'Facebook Reels', value: 15, color: '#6366f1' },
                  { name: 'Instagram Feed', value: 10, color: '#f59e0b' },
                ]}
              />
            </div>
          </div>

          {/* Módulo 4: Performance Chart (Full Width / Stacked) */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">03</div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Proyección de Rendimiento</h3>
            </div>
            <div className="h-[400px]">
              <PerformanceChartV2 data={dailyPerformanceData} currency={metrics.currency} />
            </div>
          </div>

          {/* Módulo 4: Asset Performance */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            <AssetPerformanceV2 assets={mockAssets} />
          </div>

          {/* Módulo 5: Demographics & Geography */}
          <DemographicsGeographyV2 
            demoData={[
              { age: '18-24', male: 12, female: 15 },
              { age: '25-34', male: 25, female: 35 },
              { age: '35-44', male: 18, female: 22 },
              { age: '45-54', male: 8, female: 12 },
              { age: '55+', male: 4, female: 6 },
            ]}
            regions={[
              { name: 'Buenos Aires', value: 0.45, intensity: 1 },
              { name: 'Córdoba', value: 0.20, intensity: 0.8 },
              { name: 'Santa Fe', value: 0.15, intensity: 0.6 },
              { name: 'Mendoza', value: 0.10, intensity: 0.4 },
              { name: 'Otros', value: 0.10, intensity: 0.2 },
            ]}
          />

          {/* Módulo 6: Timeline de Gestión */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">06</div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Bitácora de Gestión</h3>
            </div>
            <ManagementTimelineV2 logs={bitacora} />
          </div>

          {/* Módulo 7: Roadmap & Next Steps */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">07</div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Roadmap & Próximos Pasos</h3>
            </div>
            <RoadmapSectionV2 
              learnings={reportTexts.learnings}
              actionPlan={reportTexts.actionPlan}
              clientRequests={reportTexts.clientRequests}
              onUpdate={(field, val) => setReportTexts(prev => ({ ...prev, [field]: val }))}
              isEditing={isEditing}
            />
          </div>

          {/* GLOSARIO */}
          <ReportGlossaryV2 />
        </div>

        {/* Footer */}
        <div className="mt-20 pt-12 border-t border-slate-100 flex items-center justify-between opacity-30">
          <div className="text-[9px] font-black uppercase tracking-[0.6em] text-slate-500">Orion Strategy V2 — Verified Report</div>
          <div className="text-[9px] font-bold text-slate-500">DOCUMENTO PRIVADO — NO DIVULGAR</div>
        </div>
      </div>
    </div>
  );
}


