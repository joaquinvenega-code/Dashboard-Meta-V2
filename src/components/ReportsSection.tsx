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
  Table as TableIcon
} from 'lucide-react';
import { cn, formatCurrency, formatDecimal } from '../lib/utils';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'motion/react';

interface ReportsSectionProps {
  accounts: AdAccount[];
  settings: Record<string, AccountSettings>;
  notes: AccountNote[];
}

export function ReportsSection({ accounts, settings, notes }: ReportsSectionProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [reportMonth, setReportMonth] = useState<string>(format(subMonths(new Date(), 1), 'yyyy-MM'));
  const [includeNotes, setIncludeNotes] = useState(true);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const accountSettings = selectedAccountId ? settings[selectedAccountId] : null;
  const accountNotes = notes.filter(n => n.accountId === selectedAccountId);

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
    <div className="space-y-8 pb-20">
      {/* Configuration Header */}
      <div className="bg-[#111] rounded-2xl border border-white/5 p-6 flex flex-wrap items-center justify-between gap-6 print:hidden shadow-xl">
        <div className="flex flex-wrap items-center gap-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest ml-1">Seleccionar Cliente</label>
            <select 
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all cursor-pointer h-12 min-w-[240px]"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{settings[acc.id]?.customName || acc.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest ml-1">Mes del Informe</label>
            <input 
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all cursor-pointer h-12"
            />
          </div>

          <div className="flex items-center gap-3 pt-6">
            <button 
              onClick={() => setIncludeNotes(!includeNotes)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border h-12",
                includeNotes ? "bg-blue-600/10 border-blue-600/20 text-blue-500" : "bg-transparent border-white/5 text-neutral-600 hover:text-neutral-400"
              )}
            >
              <History className="w-4 h-4" />
              {includeNotes ? 'Incluir Bitácora' : 'No incluir Bitácora'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-6">
          <button 
            onClick={handlePrint}
            className="bg-white text-black px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-all flex items-center gap-2 h-12 shadow-lg shadow-white/5"
          >
            <Printer className="w-4 h-4" />
            Imprimir Informe
          </button>
          <button 
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 h-12 shadow-lg shadow-blue-600/20"
          >
            <Download className="w-4 h-4" />
            Guardar PDF
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div id="report-view" className="space-y-12 bg-white p-20 rounded-[2.5rem] text-black shadow-2xl print:p-0 print:shadow-none print:rounded-none">
        
        {/* Cover Page */}
        <div className="min-h-[80vh] flex flex-col justify-between print:min-h-screen">
          <div className="flex justify-between items-start">
            <div className="w-32 h-32 bg-neutral-50 rounded-3xl border border-neutral-100 flex items-center justify-center p-4">
              {accountSettings?.customLogo ? (
                <img src={accountSettings.customLogo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                <FileText className="w-16 h-16 text-neutral-200" />
              )}
            </div>
            <div className="text-right space-y-1">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Performance Report</div>
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                {format(new Date(reportMonth + '-01'), 'MMMM yyyy', { locale: es })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h1 className="text-7xl font-black tracking-tighter leading-none text-neutral-900 border-l-[12px] border-blue-600 pl-10 uppercase">
              Informe Mensual<br/>de Rendimiento
            </h1>
            <div className="flex items-center gap-6 pl-[52px]">
              <div className="h-px w-20 bg-neutral-200" />
              <div className="text-2xl font-bold text-neutral-400 flex items-center gap-4">
                {accountSettings?.customName || selectedAccount.name}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-end border-t border-neutral-100 pt-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-black">
                  CR
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-neutral-900">Control ROAS Platform</div>
                  <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5 whitespace-nowrap">Analítica de Meta Ads Verificada</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-10">
              <div className="text-right">
                <div className="text-[8px] font-black uppercase tracking-widest text-neutral-300 mb-1">Fecha de Emisión</div>
                <div className="text-[10px] font-bold text-neutral-900">{format(new Date(), 'dd/MM/yyyy')}</div>
              </div>
              <div className="text-right">
                 <div className="text-[8px] font-black uppercase tracking-widest text-neutral-300 mb-1">ID del Informe</div>
                 <div className="text-[10px] font-bold text-neutral-900">REP-{Math.random().toString(36).substr(2, 6).toUpperCase()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="space-y-8 pt-10 break-before-page print:pt-20">
          <div className="flex items-center gap-4 border-b-2 border-neutral-100 pb-4">
            <BarChart2 className="w-8 h-8 text-blue-600" />
            <h2 className="text-3xl font-black uppercase tracking-tight text-neutral-900">Resumen Estadístico</h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard 
              label="Inversión Total" 
              value={formatCurrency(selectedAccount.spend || 0, selectedAccount.currency)} 
              subValue="Gasto Mensual"
              icon={TrendingUp}
            />
            <SummaryCard 
              label="Facturación" 
              value={formatCurrency(selectedAccount.revenue || 0, selectedAccount.currency)} 
              subValue="Retorno Total"
              icon={TrendingUp}
              color="text-green-600"
            />
            <SummaryCard 
              label="ROAS Promedio" 
              value={`×${formatDecimal((selectedAccount.revenue || 0) / (selectedAccount.spend || 1))}`} 
              subValue="Eficiencia de Inversión"
              icon={TrendingUp}
              color="text-blue-600"
            />
            <SummaryCard 
              label="Acciones de Valor" 
              value={formatDecimal(selectedAccount.purchases || selectedAccount.messages || 0, 0)} 
              subValue={accountSettings?.tracking === 'messaging' ? 'Conversaciones' : 'Compras'}
              icon={TrendingUp}
            />
          </div>

          <div className="bg-neutral-50 rounded-[2rem] p-10 space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400">Tendencia Mensual</h3>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Facturación</span>
                   </div>
                </div>
             </div>
             <div className="h-80 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={geographicData.slice(0, 7)}>
                    <defs>
                       <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                    <XAxis dataKey="region" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} dy={10} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                      labelStyle={{ fontWeight: 'black', fontSize: '12px', marginBottom: '4px' }}
                    />
                    <Area type="monotone" dataKey="spend" fill="url(#colorRevenue)" stroke="#3b82f6" strokeWidth={3} />
                    <Bar dataKey="purchases" barSize={40} fill="#f8fafc" />
                  </ComposedChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* Demographics */}
        <div className="space-y-8 pt-10 break-before-page print:pt-20">
          <div className="flex items-center gap-4 border-b-2 border-neutral-100 pb-4">
            <Users className="w-8 h-8 text-blue-600" />
            <h2 className="text-3xl font-black uppercase tracking-tight text-neutral-900">Demografía de Audiencia</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
             <div className="bg-neutral-50 rounded-[2rem] p-10 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Distribución por Género</h3>
                    <p className="text-lg font-bold text-neutral-900">Participación en Conversiones</p>
                  </div>
                  <PieIcon className="w-6 h-6 text-neutral-200" />
                </div>
                <div className="h-64 relative">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={genderData}
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {genderData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                   </ResponsiveContainer>
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className="text-3xl font-black text-neutral-900 leading-none">{selectedAccount.purchases || selectedAccount.messages || 0}</div>
                      <div className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mt-1">Total Metas</div>
                   </div>
                </div>
                <div className="flex justify-center gap-8">
                   {genderData.map(g => (
                     <div key={g.name} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-600">{g.name}</div>
                     </div>
                   ))}
                </div>
             </div>

             <div className="bg-neutral-50 rounded-[2rem] p-10 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Distribución por Edad</h3>
                    <p className="text-lg font-bold text-neutral-900">Rendimiento por Segmento</p>
                  </div>
                  <BarChart2 className="w-6 h-6 text-neutral-200" />
                </div>
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ageData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} contentStyle={{ borderRadius: '12px' }} />
                        <Bar 
                          dataKey="value" 
                          radius={[8, 8, 0, 0]} 
                          fill="#3b82f6" 
                        >
                           {ageData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                        </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>
          </div>
        </div>

        {/* Geography Heatmap */}
        <div className="space-y-8 pt-10 break-before-page print:pt-20">
          <div className="flex items-center gap-4 border-b-2 border-neutral-100 pb-4">
            <MapIcon className="w-8 h-8 text-blue-600" />
            <h2 className="text-3xl font-black uppercase tracking-tight text-neutral-900">Análisis Geográfico de Ventas</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
             <div className="lg:col-span-2 space-y-4">
                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 space-y-2">
                   <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Región Líder</h3>
                   <div className="flex items-center justify-between">
                      <div className="text-2xl font-black text-neutral-900">{geographicData[0].region}</div>
                      <div className="text-xs font-bold text-blue-500 bg-white px-3 py-1 rounded-full shadow-sm">{geographicData[0].purchases} VENTAS</div>
                   </div>
                </div>
                <div className="space-y-1">
                   {geographicData.slice(0, 8).map((reg, idx) => (
                     <div key={reg.region} className="flex items-center justify-between p-4 hover:bg-neutral-50 rounded-2xl transition-all group">
                        <div className="flex items-center gap-4">
                           <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] font-black text-neutral-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                              {idx + 1}
                           </div>
                           <div>
                              <div className="text-sm font-bold text-neutral-900">{reg.region}</div>
                              <div className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">{reg.city}</div>
                           </div>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="text-right">
                              <div className="text-[10px] font-black text-neutral-900">{reg.purchases}</div>
                              <div className="text-[8px] font-black text-neutral-300 uppercase tracking-widest">Uds</div>
                           </div>
                           <div className="w-24 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(reg.purchases / geographicData[0].purchases) * 100}%` }}
                                className="h-full bg-blue-500"
                              />
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             <div className="lg:col-span-3 bg-neutral-50 rounded-[3rem] p-4 relative overflow-hidden flex items-center justify-center border border-neutral-100 h-[500px]">
                {/* Visual "Map Heatmap" Placeholder with actual dots based on data */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                   <svg width="100%" height="100%" viewBox="0 0 400 600" xmlns="http://www.w3.org/2000/svg">
                      <path d="M150,50 Q250,50 300,150 T200,300 T150,500 T100,200 Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
                   </svg>
                </div>
                
                <div className="relative w-full h-full p-10 flex flex-wrap gap-10 items-center justify-center">
                   {geographicData.slice(0, 10).map((reg, idx) => (
                      <div 
                        key={reg.region}
                        className="group relative"
                        style={{
                           transform: `scale(${0.8 + (reg.purchases / geographicData[0].purchases) * 0.5})`,
                           opacity: 0.5 + (reg.purchases / geographicData[0].purchases) * 0.5
                        }}
                      >
                         <div className="absolute inset-0 bg-blue-600 blur-[30px] rounded-full opacity-20 group-hover:opacity-40 transition-opacity animate-pulse" />
                         <div className="w-12 h-12 rounded-full border-2 border-blue-600 flex items-center justify-center bg-white shadow-2xl relative z-10 transition-transform hover:scale-110">
                            <MapPin className="w-6 h-6 text-blue-600" />
                         </div>
                         <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-[8px] font-black uppercase px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            {reg.region}: {reg.purchases}
                         </div>
                      </div>
                   ))}
                </div>

                <div className="absolute bottom-10 right-10 flex flex-col gap-2">
                   <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded bg-blue-500" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Densidad Alta</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded bg-blue-500/20" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Densidad Baja</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Change History / Notes / "Bitácora" */}
        {includeNotes && accountNotes.length > 0 && (
          <div className="space-y-8 pt-10 break-before-page print:pt-20">
            <div className="flex items-center gap-4 border-b-2 border-neutral-100 pb-4">
              <History className="w-8 h-8 text-blue-600" />
              <h2 className="text-3xl font-black uppercase tracking-tight text-neutral-900">Bitácora Estratégica</h2>
            </div>

            <div className="space-y-6">
               <p className="text-neutral-500 font-medium text-sm leading-relaxed max-w-2xl italic">
                 Cronología de acciones, observaciones críticas y cambios técnicos realizados durante el periodo para alcanzar los objetivos establecidos en {accountSettings?.customName || selectedAccount.name}.
               </p>

               <div className="relative pl-8 space-y-12 before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-0.5 before:bg-neutral-100">
                  {accountNotes.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map((note, idx) => (
                    <div key={note.id} className="relative group">
                       <div className="absolute -left-[35px] top-0 w-8 h-8 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center z-10 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <CheckCircle2Icon className="w-4 h-4" />
                       </div>
                       <div className="space-y-3">
                          <div className="flex items-center gap-4">
                             <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-300">{format(new Date(note.timestamp), 'dd MMMM, yyyy', { locale: es })}</div>
                             <div className={cn(
                                "px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                note.category === 'change' ? "bg-blue-50 border-blue-100 text-blue-600" :
                                note.category === 'urgent' ? "bg-red-50 border-red-100 text-red-600" :
                                note.category === 'meeting' ? "bg-amber-50 border-amber-100 text-amber-600" :
                                "bg-neutral-50 border-neutral-100 text-neutral-500"
                             )}>
                               {note.category}
                             </div>
                          </div>
                          <div className="text-lg font-bold text-neutral-800 leading-normal bg-neutral-50/50 p-6 rounded-3xl border border-neutral-100 hover:bg-white hover:shadow-xl transition-all">
                             {note.text}
                          </div>
                          {note.tags && (
                            <div className="flex items-center gap-3 pl-2">
                               {note.tags.map(tag => (
                                 <div key={tag} className="text-[9px] font-black text-neutral-300 uppercase tracking-widest bg-neutral-50 px-2 py-0.5 rounded">
                                   #{tag}
                                 </div>
                               ))}
                            </div>
                          )}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* Footer for PDF */}
        <div className="pt-20 border-t border-neutral-100 text-center space-y-4 print:pt-40">
           <div className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-300">
             Fin del Informe — Control ROAS Analytics Engine
           </div>
           <p className="text-[8px] text-neutral-400 leading-relaxed max-w-xl mx-auto px-10">
             Este reporte contiene datos dinámicos obtenidos directamente de la Marketing API de Meta Ads. 
             La integridad de la información está sujeta a los reportes de atribución de la plataforma en el momento de la emisión.
           </p>
        </div>

      </div>
    </div>
  );
}

function SummaryCard({ label, value, subValue, icon: Icon, color = 'text-neutral-900' }: { label: string, value: string, subValue: string, icon: any, color?: string }) {
  return (
    <div className="bg-neutral-50 rounded-[2rem] p-8 border border-neutral-100 flex flex-col justify-between h-48 hover:shadow-2xl transition-all hover:-translate-y-1 relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-600/5 blur-2xl rounded-full group-hover:scale-150 transition-transform" />
      <div className="space-y-1 relative">
        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{label}</div>
        <div className={cn("text-3xl font-black tracking-tighter leading-none shrink-0 truncate", color)} title={value}>{value}</div>
      </div>
      <div className="flex items-center justify-between relative">
        <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{subValue}</div>
        <div className="w-10 h-10 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
          <Icon className="w-5 h-5" />
        </div>
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
