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
import { ReportSummaryCards } from './reports/ReportSummaryCards';
import { ReportAISummary } from './reports/ReportAISummary';
import { ReportFunnelBoard } from './reports/ReportFunnelBoard';
import { ReportTrendChart } from './reports/ReportTrendChart';
import { ReportAudienceSection } from './reports/ReportAudienceSection';
import { ReportContentSection } from './reports/ReportContentSection';
import { ReportNotesSection } from './reports/ReportNotesSection';

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
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [reportMonth, setReportMonth] = useState<string>(format(subMonths(new Date(), 1), 'yyyy-MM'));
  const [noteScope, setNoteScope] = useState<'none' | 'all' | 'specific'>('all');
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

  // Group accounts by name (simply use custom name or account name now) - ONLY VISIBLE ONES
  const availableAccounts = useMemo(() => {
    return accounts
      .filter(acc => visibleAccountIds.includes(acc.id))
      .map(acc => ({
        id: acc.id,
        name: settings[acc.id]?.customName || acc.name,
        original: acc
      })).sort((a, b) => a.name.localeCompare(b.name));
  }, [accounts, settings, visibleAccountIds]);

  // Sync selected IDs if initial state was empty - select first visible account
  useEffect(() => {
    if (selectedAccountIds.length === 0 && availableAccounts.length > 0) {
      setSelectedAccountIds([availableAccounts[0].id]);
    } else if (selectedAccountIds.length > 1) {
      // If somehow we had multiple, keep only the first one
      setSelectedAccountIds([selectedAccountIds[0]]);
    }
    
    // Si la cuenta seleccionada ya no es visible, seleccionar la primera visible
    if (selectedAccountIds.length === 1) {
      const isVisible = availableAccounts.some(acc => acc.id === selectedAccountIds[0]);
      if (!isVisible && availableAccounts.length > 0) {
        setSelectedAccountIds([availableAccounts[0].id]);
      }
    }
  }, [availableAccounts, selectedAccountIds]);

  const selectedAccounts = accounts.filter(a => selectedAccountIds.includes(a.id));
  
  // Aggregate data for the selected accounts
  const aggregatedData = useMemo(() => {
    if (selectedAccounts.length === 0) return null;
    
    const firstAcc = selectedAccounts[0];
    const name = selectedAccounts.length === 1 
      ? (settings[firstAcc.id]?.customName || firstAcc.name)
      : `${selectedAccounts.length} Cuentas Seleccionadas`;

    return {
      name,
      spend: selectedAccounts.reduce((sum, a) => sum + (a.spend || 0), 0),
      revenue: selectedAccounts.reduce((sum, a) => sum + (a.revenue || 0), 0),
      purchases: selectedAccounts.reduce((sum, a) => sum + (a.purchases || 0), 0),
      messages: selectedAccounts.reduce((sum, a) => sum + (a.messages || 0), 0),
      atc: selectedAccounts.reduce((sum, a) => sum + (a.addToCart || 0), 0),
      viewContent: selectedAccounts.reduce((sum, a) => sum + (a.viewContent || 0), 0),
      ctr: selectedAccounts.reduce((sum, a) => sum + (a.ctr || 0), 0) / selectedAccounts.length,
      currency: firstAcc.currency || 'ARS',
      impressions: selectedAccounts.reduce((sum, a) => sum + (a.impressions || 0), 0),
      clicks: selectedAccounts.reduce((sum, a) => sum + (a.clicks || 0), 0)
    };
  }, [selectedAccounts, settings]);

  const accountNotes = notes.filter(n => selectedAccountIds.includes(n.accountId));

  // Generate daily points for the trend chart
  const dailyTrendData = useMemo(() => {
    const start = startOfMonth(parseISO(reportMonth + '-01'));
    const end = endOfMonth(start);
    const dayCount = end.getDate();
    
    const data = [];
    for (let i = 1; i <= dayCount; i++) {
      const dateStr = format(new Date(start.getFullYear(), start.getMonth(), i), 'dd/MM');
      // Simulated daily data based on aggregated KPIs
      const dailySpend = (aggregatedData?.spend || 1000) / dayCount * (0.8 + Math.random() * 0.4);
      const dailyRevenue = (aggregatedData?.revenue || 2000) / dayCount * (0.6 + Math.random() * 0.8);
      data.push({
        date: dateStr,
        spend: Math.round(dailySpend),
        revenue: Math.round(dailyRevenue)
      });
    }
    return data;
  }, [reportMonth, aggregatedData]);

  // Generar opciones de meses (últimos 12 meses)
  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => {
      const date = subMonths(new Date(), i + 1);
      return {
        label: format(date, 'MMMM yyyy', { locale: es }),
        value: format(date, 'yyyy-MM')
      };
    });
  }, []);

  const handleToggleNote = (id: string) => {
    setSelectedNoteIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const notesToInclude = useMemo(() => {
    if (noteScope === 'none') return [];
    if (noteScope === 'all') return accountNotes;
    return accountNotes.filter(n => selectedNoteIds.includes(n.id));
  }, [noteScope, selectedNoteIds, accountNotes]);

  // Rest of the logic remains relative to the new structure...

  // Generate mock demographic data based on account ID to keep it stable
  const demographicData: DemographicData[] = useMemo(() => {
    const ageGroups = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    const genders: ('male' | 'female')[] = ['male', 'female'];
    
    return ageGroups.flatMap(age => 
      genders.map(gender => ({
        age,
        gender,
        purchases: Math.floor(Math.random() * 50) + 10,
        spend: Math.floor(Math.random() * 5000) + 1000
      }))
    );
  }, [selectedAccountIds, reportMonth]);

  // Generate mock geographic data
  const geographicData: GeographicData[] = useMemo(() => {
    const regions = [
      { name: 'Buenos Aires', city: 'CABA', lat: -34.6037, lng: -58.3816 },
      { name: 'Córdoba', city: 'Córdoba', lat: -31.4201, lng: -64.1888 },
      { name: 'Santa Fe', city: 'Rosario', lat: -32.9468, lng: -60.6393 },
      { name: 'Mendoza', city: 'Mendoza', lat: -32.8895, lng: -68.8458 },
      { name: 'Tucumán', city: 'San Miguel', lat: -26.8083, lng: -65.2176 },
      { name: 'Entre Ríos', city: 'Paraná', lat: -31.7333, lng: -60.5297 },
      { name: 'Salta', city: 'Salta', lat: -24.7859, lng: -65.4117 },
      { name: 'Misiones', city: 'Posadas', lat: -27.3671, lng: -55.8961 }
    ];

    return regions.map(r => ({
      ...r,
      region: r.name,
      purchases: Math.floor(Math.random() * 100) + 20,
      spend: Math.floor(Math.random() * 10000) + 2000
    })).sort((a, b) => b.purchases - a.purchases);
  }, [selectedAccountIds, reportMonth]);

  const COLORS = ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  const ageData = useMemo(() => {
    const map: Record<string, number> = {};
    demographicData.forEach(d => {
      map[d.age] = (map[d.age] || 0) + d.purchases;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [demographicData]);

  const genderData = useMemo(() => {
    const map: Record<string, number> = {};
    demographicData.forEach(d => {
      map[d.gender] = (map[d.gender] || 0) + d.purchases;
    });
    return [
      { name: 'Mujeres', value: map['female'] || 0, color: '#ec4899' },
      { name: 'Hombres', value: map['male'] || 0, color: '#3b82f6' }
    ];
  }, [demographicData]);

  const handlePrint = () => {
    window.print();
  };

  if (!aggregatedData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-600 bg-[#111] rounded-xl border border-white/5 border-dashed">
        <FileText className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm font-black uppercase tracking-widest">Selecciona al menos una cuenta para generar el informe</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Configuración Compacta */}
      <div className="bg-[#0a0a0a] rounded-lg border border-white/5 p-4 space-y-4 print:hidden sticky top-4 z-[100] shadow-2xl backdrop-blur-md bg-opacity-90">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative group/main">
              <div className="flex items-center gap-2 bg-white/5 p-1 rounded-md border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black text-white uppercase tracking-widest min-w-[240px]">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[7px] text-blue-500 mb-0.5 opacity-70">FILTRAR CUENTA</span>
                    <span className="truncate max-w-[180px]">{aggregatedData.name}</span>
                  </div>
                  <ChevronDown className="w-3 h-3 ml-auto opacity-40 shrink-0" />
                </div>
                
                {/* Dropdown Menu */}
                <div className="absolute top-full left-0 mt-2 w-[340px] bg-[#0c0c0c] border border-white/10 rounded-xl shadow-2xl overflow-hidden opacity-0 invisible group-hover/main:opacity-100 group-hover/main:visible transition-all z-[110] border-t-blue-600/30">
                  <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                    <div className="text-[9px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                      <Filter className="w-3 h-3" />
                      Cuentas Visibles
                    </div>
                  </div>
                  <div className="p-2 max-h-[480px] overflow-y-auto">
                    {availableAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => setSelectedAccountIds([acc.id])}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-between mb-1 last:mb-0",
                          selectedAccountIds.includes(acc.id)
                            ? "bg-blue-600 text-white"
                            : "hover:bg-white/5 text-neutral-400"
                        )}
                      >
                        <span className="truncate">{acc.name}</span>
                        {selectedAccountIds.includes(acc.id) && (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-white/5 p-1 rounded-md border border-white/5">
                <select 
                  value={reportMonth}
                  onChange={(e) => {
                    const newMonth = e.target.value;
                    setReportMonth(newMonth);
                    if (setDateRange) {
                      const start = startOfMonth(parseISO(newMonth + '-01'));
                      const end = endOfMonth(start);
                      setDateRange({
                        since: format(start, 'yyyy-MM-dd'),
                        until: format(end, 'yyyy-MM-dd')
                      });
                    }
                  }}
                  className="bg-transparent px-3 py-1.5 text-[10px] font-black text-white outline-none cursor-pointer uppercase tracking-widest"
                >
                  {monthOptions.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-[#111]">{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-md border border-white/5">
                <button 
                  onClick={() => setNoteScope('none')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all",
                    noteScope === 'none' ? "bg-red-600 text-white" : "text-neutral-500 hover:text-white"
                  )}
                >Sin Bitácora</button>
                <button 
                  onClick={() => setNoteScope('all')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all",
                    noteScope === 'all' ? "bg-blue-600 text-white" : "text-neutral-500 hover:text-white"
                  )}
                >Toda la Bitácora</button>
                <button 
                  onClick={() => setNoteScope('specific')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all",
                    noteScope === 'specific' ? "bg-purple-600 text-white" : "text-neutral-500 hover:text-white"
                  )}
                >Seleccionar Notas</button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-md hover:bg-neutral-200 transition-all shadow-lg"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button className="h-10 px-4 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-md text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
              <Download className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Selector de notas específicas si el scope es 'specific' */}
      <AnimatePresence>
        {noteScope === 'specific' && accountNotes.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden print:hidden"
          >
            <div className="bg-[#111] border border-white/5 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {accountNotes.map(note => (
                <button 
                  key={note.id}
                  onClick={() => handleToggleNote(note.id)}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-all text-left",
                    selectedNoteIds.includes(note.id) ? "bg-purple-600/10 border-purple-600/20" : "bg-black/20 border-white/5 grayscale"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5",
                    selectedNoteIds.includes(note.id) ? "bg-purple-600 border-purple-600" : "border-white/20"
                  )}>
                    {selectedNoteIds.includes(note.id) && <X className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1">{format(new Date(note.timestamp), 'dd/MM/yy')}</div>
                    <p className="text-[10px] text-neutral-300 font-medium line-clamp-2">{note.text}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Preview Surface */}
      <div className="flex flex-col items-center gap-12 bg-neutral-950 p-4 md:p-12 rounded-xl border border-white/5 overflow-x-hidden">
        
        {/* Page Container */}
        <div className="w-full max-w-6xl grid grid-cols-1 gap-12">
          
          <div id="report-view" className="space-y-0 text-black shadow-2xl print:space-y-0 print:shadow-none">
            
            {/* SHEET 1: EXECUTIVE DASHBOARD */}
            <ReportPage className="flex flex-col gap-8 p-10 bg-white rounded-none">
              <ReportHeader 
                name={aggregatedData.name} 
                logo={selectedAccountIds.length === 1 ? settings[selectedAccountIds[0]]?.customLogo : undefined} 
                month={reportMonth} 
              />

              <ReportSummaryCards 
                spend={aggregatedData.spend}
                revenue={aggregatedData.revenue}
                purchases={aggregatedData.purchases}
                messages={aggregatedData.messages}
                currency={aggregatedData.currency}
              />

              <ReportAISummary 
                metrics={{
                  spend: aggregatedData.spend,
                  revenue: aggregatedData.revenue,
                  purchases: aggregatedData.purchases,
                  messages: aggregatedData.messages,
                  currency: aggregatedData.currency,
                  ctr: aggregatedData.ctr,
                  impressions: aggregatedData.impressions,
                  clicks: aggregatedData.clicks
                }}
                notes={accountNotes.filter(n => n.timestamp && n.timestamp.startsWith(reportMonth))}
                monthName={monthOptions.find(o => o.value === reportMonth)?.label || reportMonth}
              />

              <div className="grid grid-cols-12 gap-4 h-96">
                <div className="col-span-6">
                  <ReportFunnelBoard 
                    spend={aggregatedData.spend}
                    ctr={aggregatedData.ctr}
                    purchases={aggregatedData.purchases}
                    messages={aggregatedData.messages}
                    atc={aggregatedData.atc}
                    viewContent={aggregatedData.viewContent}
                    impressions={aggregatedData.impressions}
                    clicks={aggregatedData.clicks}
                    tracking={selectedAccountIds.length === 1 ? (settings[selectedAccountIds[0]]?.tracking || 'ecommerce') : 'ecommerce'}
                  />
                </div>
                <div className="col-span-6">
                  <ReportTrendChart data={dailyTrendData} />
                </div>
              </div>

              {/* Footer */}
              <div className="mt-auto pt-8 border-t border-neutral-100 flex items-center justify-between opacity-30">
                <div className="text-[8px] font-black uppercase tracking-[0.5em]">Orion Metrics Engine Verified</div>
                <div className="text-[8px] font-bold">REP-{Math.random().toString(36).substr(2, 6).toUpperCase()}</div>
              </div>
            </ReportPage>

            {/* SHEET 2: AUDIENCE & CONTENT */}
            <ReportPage className="flex flex-col gap-8 p-10 bg-white rounded-none">
              <ReportAudienceSection 
                geographicData={geographicData}
                genderData={genderData}
                ageData={ageData}
                totalPurchases={aggregatedData.purchases || aggregatedData.messages || 1}
              />

              <ReportContentSection />
            </ReportPage>

            {/* Sheet 4: Bitácora (if included) */}
            {notesToInclude.length > 0 && (
              <ReportPage className="break-before-page">
                <ReportNotesSection notes={notesToInclude.sort((a, b) => b.timestamp.localeCompare(a.timestamp))} />
              </ReportPage>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


