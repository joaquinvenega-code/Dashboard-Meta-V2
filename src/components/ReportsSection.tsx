import React, { useState, useMemo, useEffect } from 'react';
import { 
  AdAccount, 
  AccountSettings, 
  AccountNote, 
  DemographicData, 
  GeographicData 
} from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  ComposedChart,
  Line,
  Area
} from 'recharts';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  Filter, 
  Users, 
  Image as ImageIcon,
  Map as MapIcon, 
  History,
  TrendingUp,
  MapPin,
  ChevronRight,
  PieChart as PieIcon,
  BarChart2,
  BarChart3,
  Table as TableIcon,
  X,
  CheckCircle2
} from 'lucide-react';
import { cn, formatCurrency, formatDecimal } from '../lib/utils';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface ReportsSectionProps {
  accounts: AdAccount[];
  settings: Record<string, AccountSettings>;
  notes: AccountNote[];
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

export function ReportsSection({ accounts, settings, notes }: ReportsSectionProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [reportMonth, setReportMonth] = useState<string>(format(subMonths(new Date(), 1), 'yyyy-MM'));
  const [noteScope, setNoteScope] = useState<'none' | 'all' | 'specific'>('all');
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

  // Sync selected ID if initial state was empty
  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const accountSettings = selectedAccountId ? settings[selectedAccountId] : null;
  const accountNotes = notes.filter(n => n.accountId === selectedAccountId);

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
  }, [selectedAccountId]);

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
  }, [selectedAccountId]);

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

  if (!selectedAccount) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-600 bg-[#111] rounded-2xl border border-white/5 border-dashed">
        <FileText className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm font-black uppercase tracking-widest">Selecciona una cuenta para generar el informe</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Configuración Compacta */}
      <div className="bg-[#0a0a0a] rounded-xl border border-white/5 p-4 flex flex-wrap items-center justify-between gap-4 print:hidden sticky top-4 z-[100] shadow-2xl backdrop-blur-md bg-opacity-90">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
            <select 
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-transparent px-3 py-1.5 text-[10px] font-black text-white outline-none cursor-pointer uppercase tracking-widest min-w-[180px]"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id} className="bg-[#111]">{settings[acc.id]?.customName || acc.name}</option>
              ))}
            </select>
            <div className="w-px h-4 bg-white/10" />
            <select 
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="bg-transparent px-3 py-1.5 text-[10px] font-black text-white outline-none cursor-pointer uppercase tracking-widest"
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-[#111]">{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
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

        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrint}
            className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-lg hover:bg-neutral-200 transition-all shadow-lg"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button className="h-10 px-4 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
            <Download className="w-4 h-4" />
            PDF
          </button>
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
            <ReportPage className="flex flex-col gap-8 p-10 bg-white">
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-neutral-100 pb-8">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center justify-center p-3 shadow-inner">
                    {accountSettings?.customLogo ? (
                      <img src={accountSettings.customLogo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <BarChart3 className="w-10 h-10 text-blue-600" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600">Executive Performance Report</h1>
                    <div className="text-3xl font-black tracking-tight text-neutral-900">{accountSettings?.customName || selectedAccount.name}</div>
                  </div>
                </div>
                <div className="text-right">
                   <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">Periodo Analizado</div>
                   <div className="text-sm font-bold text-neutral-900 bg-neutral-50 px-4 py-2 rounded-xl border border-neutral-100">
                     {format(new Date(reportMonth + '-01'), 'MMMM yyyy', { locale: es }).toUpperCase()}
                   </div>
                </div>
              </div>

              {/* Top KPIs */}
              <div className="grid grid-cols-4 gap-4">
                <MiniMetricCard 
                  label="Inversión" 
                  value={formatCurrency(selectedAccount.spend || 0, selectedAccount.currency)} 
                  color="#3b82f6" 
                />
                <MiniMetricCard 
                  label="Facturación" 
                  value={formatCurrency(selectedAccount.revenue || 0, selectedAccount.currency)} 
                  color="#10b981" 
                />
                <MiniMetricCard 
                  label="ROAS" 
                  value={`×${formatDecimal((selectedAccount.revenue || 0) / (selectedAccount.spend || 1))}`} 
                  color="#8b5cf6" 
                />
                <MiniMetricCard 
                  label="CPA / CPR" 
                  value={formatCurrency(selectedAccount.spend / (selectedAccount.purchases || selectedAccount.messages || 1), selectedAccount.currency)} 
                  color="#f59e0b" 
                />
              </div>

              {/* Main Section: Funnel & Evolution */}
              <div className="grid grid-cols-12 gap-8 h-80">
                {/* Traffic Funnel */}
                <div className="col-span-4 bg-neutral-50 rounded-[2.5rem] p-8 border border-neutral-100 flex flex-col">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-8 self-center">Recorrido del Cliente</h3>
                  <div className="flex-1">
                    <TrafficFunnel 
                      impressions={selectedAccount.spend ? Math.floor(selectedAccount.spend * 500) : 100000}
                      clicks={selectedAccount.spend ? Math.floor(selectedAccount.spend * 10) : 5000}
                      actions={selectedAccount.purchases || selectedAccount.messages || 0}
                      type={accountSettings?.tracking || 'ecommerce'}
                    />
                  </div>
                </div>

                {/* Trend Chart */}
                <div className="col-span-8 bg-neutral-50 rounded-[2.5rem] p-8 border border-neutral-100 flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                     <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Evolución del Periodo</h3>
                     <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-blue-500" />
                           <span className="text-[9px] font-black text-neutral-400 uppercase">Gasto</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-green-500" />
                           <span className="text-[9px] font-black text-neutral-400 uppercase">Conversiones</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={geographicData.slice(0, 15)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                        <XAxis dataKey="region" hide />
                        <YAxis yAxisId="left" hide />
                        <YAxis yAxisId="right" orientation="right" hide />
                        <Area yAxisId="left" type="monotone" dataKey="spend" fill="#3b82f6" fillOpacity={0.05} stroke="#3b82f6" strokeWidth={2} />
                        <Line yAxisId="right" type="monotone" dataKey="purchases" stroke="#10b981" strokeWidth={3} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Bottom Breakdown Table */}
              <div className="bg-neutral-50 rounded-[2.5rem] p-8 border border-neutral-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Resultados Globales por Segmento</h3>
                  <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Atribución 7-días click + 1-día vista</div>
                </div>
                <div className="grid grid-cols-4 gap-4 border-t border-neutral-100 pt-6">
                   <div className="space-y-1">
                      <div className="text-[8px] font-black text-neutral-300 uppercase">CTR Promedio</div>
                      <div className="text-xl font-black text-neutral-800">{formatDecimal(1.85)}%</div>
                   </div>
                   <div className="space-y-1">
                      <div className="text-[8px] font-black text-neutral-300 uppercase">CPM Promedio</div>
                      <div className="text-xl font-black text-neutral-800">{formatCurrency(12.45, selectedAccount.currency)}</div>
                   </div>
                   <div className="space-y-1">
                      <div className="text-[8px] font-black text-neutral-300 uppercase">Frecuencia</div>
                      <div className="text-xl font-black text-neutral-800">1.74</div>
                   </div>
                   <div className="space-y-1">
                      <div className="text-[8px] font-black text-neutral-300 uppercase">CPC</div>
                      <div className="text-xl font-black text-neutral-800">{formatCurrency(selectedAccount.spend / (selectedAccount.spend * 10), selectedAccount.currency)}</div>
                   </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-auto pt-8 border-t border-neutral-100 flex items-center justify-between opacity-30">
                <div className="text-[8px] font-black uppercase tracking-[0.5em]">Control ROAS Engine Verified</div>
                <div className="text-[8px] font-bold">REP-{Math.random().toString(36).substr(2, 6).toUpperCase()}</div>
              </div>
            </ReportPage>

            {/* SHEET 2: AUDIENCE & CONTENT */}
            <ReportPage className="flex flex-col gap-8 p-10 bg-white">
              <div className="flex items-center gap-4 border-b-2 border-neutral-100 pb-6">
                 <Users className="w-8 h-8 text-blue-600" />
                 <h2 className="text-2xl font-black uppercase tracking-tighter text-neutral-900">Análisis Profundo de Audiencia</h2>
              </div>

              <div className="grid grid-cols-2 gap-8">
                 {/* Geography & Heatmap List */}
                 <div className="bg-neutral-50 rounded-[2.5rem] p-8 border border-neutral-100 space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Rendimiento Geográfico</h3>
                    <div className="space-y-3">
                       {geographicData.slice(0, 6).map((reg, idx) => (
                         <div key={reg.region} className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                               <span className="text-neutral-900">{reg.region}</span>
                               <span className="text-blue-600">{(reg.purchases / (selectedAccount.purchases || selectedAccount.messages || 1) * 100).toFixed(1)}%</span>
                            </div>
                            <div className="h-2 w-full bg-neutral-200 rounded-full overflow-hidden">
                               <div className="h-full bg-blue-600" style={{ width: `${(reg.purchases / geographicData[0].purchases) * 100}%` }} />
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>

                 {/* Demographic Pie & Bars */}
                 <div className="bg-neutral-50 rounded-[2.5rem] p-8 border border-neutral-100 flex flex-col gap-6">
                    <div className="flex-1 flex flex-col items-center justify-center">
                       <PieChart width={250} height={160}>
                          <Pie 
                            data={genderData} 
                            innerRadius={50} 
                            outerRadius={75} 
                            paddingAngle={8} 
                            dataKey="value"
                            stroke="none"
                          >
                             {genderData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                       </PieChart>
                       <div className="flex gap-6 mt-4">
                          {genderData.map(g => (
                            <div key={g.name} className="flex items-center gap-2">
                               <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: g.color}} />
                               <span className="text-[8px] font-black uppercase text-neutral-400">{g.name}</span>
                            </div>
                          ))}
                       </div>
                    </div>
                    <div className="flex-1">
                       <ResponsiveContainer width="100%" height={100}>
                          <BarChart data={ageData.slice(0, 5)}>
                             <XAxis dataKey="name" tick={{fontSize: 8, fontWeight: 'black'}} axisLine={false} tickLine={false} />
                             <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
              </div>

              {/* Winning Ads / Content Section */}
              <div className="bg-neutral-50 rounded-[3rem] p-10 border border-neutral-100 h-96 flex flex-col">
                 <div className="flex items-center justify-between mb-8">
                    <div className="space-y-1">
                       <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Contenido Ganador</h3>
                       <p className="text-xl font-black text-neutral-900">Anuncios con Mayor ROI</p>
                    </div>
                 </div>
                 <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-white rounded-3xl border border-neutral-100 p-6 flex flex-col gap-4 hover:shadow-xl transition-all group">
                         <div className="aspect-[4/5] bg-neutral-100 rounded-2xl flex items-center justify-center relative overflow-hidden group-hover:-translate-y-2 transition-transform">
                            <ImageIcon className="w-12 h-12 text-neutral-200" />
                            <div className="absolute top-4 left-4 bg-blue-600 text-white text-[8px] font-black px-2 py-1 rounded-lg">TOP {i}</div>
                         </div>
                         <div className="space-y-3">
                            <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest truncate">Ad_Performance_0{i}_ID_772</div>
                            <div className="grid grid-cols-2 gap-4">
                               <div>
                                  <div className="text-[8px] font-black text-neutral-300 uppercase leading-none mb-1">ROAS</div>
                                  <div className="text-lg font-black text-blue-600">×{12 - i * 2}.5</div>
                               </div>
                               <div>
                                  <div className="text-[8px] font-black text-neutral-300 uppercase leading-none mb-1">Conversiones</div>
                                  <div className="text-lg font-black text-neutral-800">{150 - i * 30}</div>
                               </div>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            </ReportPage>

            {/* Sheet 4: Bitácora (if included) */}
            {notesToInclude.length > 0 && (
              <ReportPage className="break-before-page">
                <div className="space-y-8 h-full flex flex-col">
                  <div className="flex items-center gap-4 border-b-2 border-neutral-100 pb-4">
                    <History className="w-8 h-8 text-blue-600" />
                    <h2 className="text-xl font-black uppercase tracking-tight text-neutral-900">Bitácora Estratégica</h2>
                  </div>

                  <div className="flex-1 space-y-6 overflow-hidden">
                    <p className="text-neutral-500 font-medium text-[10px] leading-relaxed max-w-2xl italic">
                      Cronología de acciones y cambios técnicos realizados para alcanzar los objetivos en {accountSettings?.customName || selectedAccount.name}.
                    </p>

                    <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-px before:bg-neutral-100">
                      {notesToInclude.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 6).map((note) => (
                        <div key={note.id} className="relative group">
                          <div className="absolute -left-[26px] top-0 w-5 h-5 rounded-full bg-white border border-blue-600 flex items-center justify-center z-10 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-blue-600" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="text-[8px] font-black uppercase tracking-widest text-neutral-300">{format(new Date(note.timestamp), 'dd MMM', { locale: es })}</div>
                              <div className="px-1.5 py-0.5 rounded-full text-[6px] font-black uppercase tracking-widest bg-neutral-50 border border-neutral-100 text-neutral-500">{note.category}</div>
                            </div>
                            <div className="text-[11px] font-bold text-neutral-800 leading-tight bg-neutral-50/50 p-3 rounded-xl border border-neutral-50">
                              {note.text}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-neutral-50 text-center mt-auto">
                    <div className="text-[8px] font-black uppercase tracking-[0.4em] text-neutral-200">Control ROAS Analytics</div>
                  </div>
                </div>
              </ReportPage>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniMetricCard({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="bg-white rounded-[2rem] p-6 border border-neutral-100 flex flex-col justify-between h-28 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-neutral-50 rounded-full -mr-12 -mt-12 opacity-50" />
      <div className="relative z-10">
        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">{label}</div>
        <div className="text-2xl font-black tracking-tight text-neutral-900">{value}</div>
      </div>
      <div className="w-full h-1 bg-neutral-50 rounded-full overflow-hidden mt-4">
        <div className="h-full rounded-full" style={{ backgroundColor: color, width: '45%' }} />
      </div>
    </div>
  );
}

function TrafficFunnel({ impressions, clicks, actions, type }: { impressions: number, clicks: number, actions: number, type: 'ecommerce' | 'messaging' | 'both' }) {
  const ctr = (clicks / impressions) * 100;
  const cr = (actions / clicks) * 100;

  const steps = [
    { label: 'Impresiones', value: impressions, width: 'w-full', clip: 'polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)', color: 'bg-blue-500/10', text: 'text-blue-900' },
    { label: 'Clicks', value: clicks, width: 'w-[80%]', clip: 'polygon(10% 0%, 90% 0%, 80% 100%, 20% 100%)', color: 'bg-blue-500/20', text: 'text-blue-900' },
    { label: type === 'messaging' ? 'Mensajes' : type === 'ecommerce' ? 'Compras' : 'Conversiones', value: actions, width: 'w-[60%]', clip: 'polygon(20% 0%, 80% 0%, 75% 100%, 25% 100%)', color: 'bg-blue-600', text: 'text-white' }
  ];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
      {steps.map((step, i) => (
        <div key={step.label} className="w-full flex flex-col items-center">
          <div 
            className={cn("h-16 flex items-center justify-center relative transition-transform hover:scale-105", step.width, step.color)}
            style={{ clipPath: step.clip }}
          >
            <div className={cn("flex flex-col items-center", step.text)}>
              <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-60">{step.label}</span>
              <span className="text-sm font-black">{formatDecimal(step.value, 0)}</span>
            </div>
          </div>
          {i < 2 && (
             <div className="text-[9px] font-black text-blue-600/40 py-1 uppercase tracking-widest">
               {i === 0 ? `CTR: ${formatDecimal(ctr)}%` : `Conv: ${formatDecimal(cr)}%`}
             </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ label, value, subValue, icon: Icon, color = 'text-neutral-900' }: { label: string, value: string, subValue: string, icon: any, color?: string }) {
  return (
    <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-100 flex flex-col justify-between h-32 hover:shadow-xl transition-all relative overflow-hidden group">
      <div className="space-y-0.5">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-400">{label}</div>
        <div className={cn("text-xl font-black tracking-tighter leading-none shrink-0 truncate", color)}>{value}</div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">{subValue}</div>
        <Icon className="w-3.5 h-3.5 text-neutral-200 group-hover:text-blue-600 transition-colors" />
      </div>
    </div>
  );
}
