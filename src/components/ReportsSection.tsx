import React, { useState, useMemo } from 'react';
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
  Map as MapIcon, 
  History,
  TrendingUp,
  MapPin,
  ChevronRight,
  PieChart as PieIcon,
  BarChart2,
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
      <div className="flex flex-col items-center gap-12 bg-neutral-900/50 p-4 md:p-12 rounded-[2rem] border border-white/5 overflow-x-hidden">
        
        {/* Page Container - Scaled for better overview */}
        <div className="w-full max-w-5xl grid grid-cols-1 gap-12 perspective-1000">
          
          {/* Main Container - We'll use scaling logic or responsive width */}
          <div id="report-view" className="space-y-0 text-black shadow-2xl print:space-y-0 print:shadow-none">
            
            {/* Sheet 1: Cover */}
            <ReportPage className="flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="w-24 h-24 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center justify-center p-3">
                  {accountSettings?.customLogo ? (
                    <img src={accountSettings.customLogo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <FileText className="w-10 h-10 text-neutral-100" />
                  )}
                </div>
                <div className="text-right space-y-1">
                  <div className="text-[8px] font-black uppercase tracking-[0.3em] text-blue-600">Performance Report</div>
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                    {format(new Date(reportMonth + '-01'), 'MMMM yyyy', { locale: es })}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl font-black tracking-tighter leading-none text-neutral-900 border-l-[8px] border-blue-600 pl-8 uppercase">
                  Informe<br/>Mensual
                </h1>
                <div className="flex items-center gap-4 pl-[40px]">
                  <div className="h-px w-12 bg-neutral-200" />
                  <div className="text-xl font-bold text-neutral-400">
                    {accountSettings?.customName || selectedAccount.name}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-end border-t border-neutral-100 pt-8 mt-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-[8px] font-black">CR</div>
                  <div className="text-[8px] font-black uppercase tracking-widest text-neutral-900">Control ROAS Platform</div>
                </div>
                <div className="text-right">
                  <div className="text-[7px] font-black uppercase tracking-widest text-neutral-300 mb-1">Fecha Emisión</div>
                  <div className="text-[9px] font-bold text-neutral-900">{format(new Date(), 'dd/MM/yyyy')}</div>
                </div>
              </div>
            </ReportPage>

            {/* Sheet 2: Metrics */}
            <ReportPage>
              <div className="space-y-10">
                <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
                  <BarChart2 className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-black uppercase tracking-tight text-neutral-900">Métricas Clave</h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <SummaryCard 
                    label="Inversión" 
                    value={formatCurrency(selectedAccount.spend || 0, selectedAccount.currency)} 
                    subValue="Presupuesto"
                    icon={TrendingUp}
                  />
                  <SummaryCard 
                    label="Retorno" 
                    value={formatCurrency(selectedAccount.revenue || 0, selectedAccount.currency)} 
                    subValue="Ingresos"
                    icon={TrendingUp}
                    color="text-green-600"
                  />
                  <SummaryCard 
                    label="ROAS" 
                    value={`×${formatDecimal((selectedAccount.revenue || 0) / (selectedAccount.spend || 1))}`} 
                    subValue="Eficiencia"
                    icon={TrendingUp}
                    color="text-blue-600"
                  />
                  <SummaryCard 
                    label="Metas" 
                    value={formatDecimal(selectedAccount.purchases || selectedAccount.messages || 0, 0).toString()} 
                    subValue={accountSettings?.tracking === 'messaging' ? 'Conv.' : 'Compras'}
                    icon={TrendingUp}
                  />
                </div>

                <div className="bg-neutral-50 rounded-2xl p-6 h-64">
                   <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={geographicData.slice(0, 5)}>
                        <XAxis dataKey="region" hide />
                        <Tooltip />
                        <Area type="monotone" dataKey="spend" fill="#3b82f6" fillOpacity={0.1} stroke="#3b82f6" />
                        <Bar dataKey="purchases" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </ComposedChart>
                   </ResponsiveContainer>
                </div>
              </div>
            </ReportPage>

            {/* Sheet 3: Demographics & Geo */}
            <ReportPage>
              <div className="space-y-10">
                <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
                  <Users className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-black uppercase tracking-tight text-neutral-900">Audiencia y Geografía</h2>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-neutral-50 rounded-2xl p-6 h-48 flex flex-col items-center justify-center">
                    <PieChart width={200} height={120}>
                      <Pie data={genderData} innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value">
                        {genderData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                    <div className="flex gap-4 mt-2">
                       {genderData.map(g => (
                         <div key={g.name} className="text-[7px] font-black uppercase text-neutral-400 flex items-center gap-1">
                           <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: g.color}} /> {g.name}
                         </div>
                       ))}
                    </div>
                  </div>
                  <div className="bg-neutral-50 rounded-2xl p-6 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ageData.slice(0, 4)}>
                        <XAxis dataKey="name" tick={{fontSize: 8}} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-300">Top Regiones</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {geographicData.slice(0, 5).map((reg) => (
                      <div key={reg.region} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                        <div className="text-[10px] font-bold text-neutral-800">{reg.region}</div>
                        <div className="flex items-center gap-4">
                          <div className="text-[10px] font-black text-blue-600">{reg.purchases} <span className="text-[8px] text-neutral-300 uppercase">uds</span></div>
                          <div className="w-20 h-1 bg-neutral-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${(reg.purchases / geographicData[0].purchases) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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

function CheckCircle2Icon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
