import React, { useState, useEffect, useCallback } from 'react';
import { 
  AdAccount, 
  AccountSettings, 
  Ad, 
  DailyMetric 
} from '../types';
import { 
  fetchTopAds, 
  fetchDailySeries 
} from '../services/facebook';
import { 
  Search, 
  RefreshCw, 
  Calendar, 
  ArrowUpRight,
  TrendingUp,
  Target,
  BarChart2,
  DollarSign,
  ShoppingCart,
  Package,
  LayoutGrid,
  Save,
  Loader2,
  Table as TableIcon
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  Tooltip, 
  ResponsiveContainer,
  Line
} from 'recharts';
import { AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface AccountDetailViewProps {
  accounts: AdAccount[];
  visibleAccountIds: string[];
  settings: Record<string, AccountSettings>;
  onSaveSettings: (id: string, s: AccountSettings) => void;
  dateRange: { since: string; until: string };
  onRefresh: () => void;
}

export const AccountDetailView: React.FC<AccountDetailViewProps> = ({
  accounts,
  visibleAccountIds,
  settings,
  onSaveSettings,
  dateRange,
  onRefresh
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [adsLoading, setAdsLoading] = useState(false);
  const [ads, setAds] = useState<Ad[]>([]);
  const [sortBy, setSortBy] = useState('roas');
  const [topN, setTopN] = useState(5);
  const [observations, setObservations] = useState('');
  const [isSavingObs, setIsSavingObs] = useState(false);

  // Filter accounts for sidebar
  const sidebarAccounts = accounts.filter(acc => 
    visibleAccountIds.some(vId => vId === acc.id || vId === acc.account_id)
  ).filter(acc => 
    acc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Auto-select first account if none selected
  useEffect(() => {
    if (!selectedId && sidebarAccounts.length > 0) {
      setSelectedId(sidebarAccounts[0].id);
    }
  }, [sidebarAccounts, selectedId]);

  const selectedAccount = accounts.find(a => a.id === selectedId);
  const s = selectedId ? settings[selectedId] : null;

  // Initialize observations when account changes
  useEffect(() => {
    if (s && s.observations) {
      setObservations(s.observations);
    } else {
      setObservations('');
    }
  }, [selectedId, s]);

  const loadAds = useCallback(async () => {
    if (!selectedId) return;
    setAdsLoading(true);
    try {
      const topAds = await fetchTopAds(selectedId, dateRange.since, dateRange.until, topN, sortBy);
      const adIds = topAds.map(a => a.id);
      if (adIds.length > 0) {
        const series = await fetchDailySeries(selectedId, dateRange.since, dateRange.until, adIds);
        topAds.forEach(ad => {
          ad.dailySeries = series[ad.id] || [];
        });
      }
      setAds(topAds);
    } catch (e) {
      console.error("Error loading ads:", e);
    } finally {
      setAdsLoading(false);
    }
  }, [selectedId, dateRange, topN, sortBy]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const handleSaveObs = () => {
    if (!selectedId || !s) return;
    setIsSavingObs(true);
    onSaveSettings(selectedId, { ...s, observations } as any);
    setTimeout(() => setIsSavingObs(false), 800);
  };

  const formatCurrency = (val: number, curr: string = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDecimal = (val: number | undefined, res: number = 2) => {
    if (val === undefined) return '0';
    return val.toLocaleString('es-AR', { minimumFractionDigits: res, maximumFractionDigits: res });
  };

  const getProgress = (acc: AdAccount) => {
    const sAcc = settings[acc.id];
    if (!sAcc || !sAcc.objective || !acc.revenue) return null;
    return Math.round((acc.revenue / sAcc.objective) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-[#111] p-1.5 rounded-xl border border-white/5 shadow-sm">
          <div className="relative">
            <select className="appearance-none bg-transparent text-[10px] font-black text-neutral-300 outline-none pl-3 pr-8 py-1 cursor-pointer uppercase tracking-widest">
              <option>Este mes</option>
              <option>Mes pasado</option>
            </select>
            <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-600 pointer-events-none" />
          </div>
          <button 
            onClick={onRefresh}
            className="bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-sm bg-[#111] border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-xs text-white placeholder-neutral-700 outline-none focus:border-blue-500/50 transition-all shadow-inner"
          />
        </div>

        <div className="flex items-center gap-2">
           {['PDF', 'Excel', 'Texto'].map(fmt => (
             <button key={fmt} className="bg-[#111] border border-white/5 px-4 py-2.5 rounded-xl text-[10px] font-black text-neutral-200 uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 shadow-sm">
               {fmt === 'PDF' ? <ArrowUpRight className="w-3 h-3 rotate-180" /> : <TableIcon className="w-3 h-3" />}
               {fmt}
             </button>
           ))}
        </div>
      </div>

      <div className="flex bg-transparent gap-8 h-[calc(100vh-220px)]">
        {/* Sidebar - Accounts List */}
        <div className="w-72 bg-[#111] rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col shadow-2xl">
          <div className="p-6 border-b border-white/5 bg-white/[0.01]">
             <h3 className="text-[10px] font-black text-neutral-700 uppercase tracking-[0.2em]">{sidebarAccounts[0]?.name?.split(' ')[0] || 'Whisky'} N' Dust</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
            {sidebarAccounts.map(acc => {
              const isActive = selectedId === acc.id;
              const progress = getProgress(acc);
              const customName = settings[acc.id]?.customName || acc.name;
              
              return (
                <button
                  key={acc.id}
                  onClick={() => setSelectedId(acc.id)}
                  className={`w-full text-left p-4 rounded-3xl transition-all relative group flex items-center justify-between overflow-hidden ${
                    isActive 
                      ? 'bg-blue-600/10 border border-blue-600/20 text-white shadow-lg' 
                      : 'hover:bg-white/[0.02] border border-transparent text-neutral-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${acc.account_status === 1 ? 'bg-success/50' : 'bg-neutral-800'}`} />
                    <span className="text-sm font-bold tracking-tight truncate max-w-[140px]">{customName}</span>
                  </div>
                  {progress !== null && (
                    <span className={`text-[10px] font-black ${progress >= 80 ? 'text-success' : progress >= 40 ? 'text-blue-500' : 'text-neutral-600'}`}>
                      {progress}%
                    </span>
                  )}
                  {isActive && <div className="absolute right-0 w-1 h-6 bg-blue-500 rounded-l-full" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dashboard Area */}
        {selectedAccount ? (
          <div className="flex-1 overflow-y-auto pr-4 space-y-10 custom-scrollbar animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Account Info Header */}
            <div className="flex items-center gap-3">
               <div className={`w-3 h-3 rounded-full ${selectedAccount.account_status === 1 ? 'bg-success shadow-[0_0_12px_rgba(34,197,94,0.3)]' : 'bg-neutral-800'}`} />
               <h2 className="text-4xl font-black text-white tracking-tighter">{settings[selectedAccount.id]?.customName || selectedAccount.name}</h2>
               <div className="px-3 py-1 bg-blue-600/20 text-blue-500 text-[10px] font-black rounded-lg uppercase tracking-widest border border-blue-600/20">{selectedAccount.currency}</div>
            </div>

            {/* Metrics Grids */}
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-4">
                <MetricBox label="Inversión" value={formatCurrency(selectedAccount.spend || 0, selectedAccount.currency)} />
                <MetricBox label="Facturado" value={formatCurrency(selectedAccount.revenue || 0, selectedAccount.currency)} />
                <MetricBox label="ROAS" value={`×${formatDecimal((selectedAccount.revenue || 0) / (selectedAccount.spend || 1))}`} />
                <MetricBox label="Objetivo" value={formatCurrency(s?.objective || 0, selectedAccount.currency)} isPlaceholder={!s?.objective} />
                <MetricBox label="% Objetivo" value={`${getProgress(selectedAccount) || 0}%`} isPlaceholder={!getProgress(selectedAccount)} />
                <MetricBox label="% Presupuesto" value={`${s?.budget ? Math.round(((selectedAccount.spend || 0) / s.budget) * 100) : 0}%`} isPlaceholder={!s?.budget} />
                <MetricBox label="CTR" value={`${formatDecimal(selectedAccount.ctr, 2)}%`} />
              </div>
              <div className="grid grid-cols-5 gap-4">
                <MetricBox label="Clics" value={formatDecimal(selectedAccount.clicks, 0)} />
                <MetricBox label="Compras" value={formatDecimal(selectedAccount.purchases, 0)} />
                <MetricBox label="Agreg. carrito" value={formatDecimal(selectedAccount.addToCart, 0)} />
                <MetricBox label="Pagos iniciados" value={formatDecimal(selectedAccount.checkouts, 0)} />
                <MetricBox label="Costo x compra" value={formatCurrency(selectedAccount.costPerPurchase || 0, selectedAccount.currency)} />
              </div>
            </div>

            {/* Observations Area */}
            <div className="space-y-4">
               <h3 className="text-[10px] font-black text-neutral-600 uppercase tracking-widest ml-1">Observaciones</h3>
               <div className="bg-[#111] rounded-[2.5rem] border border-white/5 p-8 shadow-xl hover:bg-[#131313] transition-colors group">
                 <textarea 
                   placeholder="Anotaciones sobre esta cuenta..."
                   value={observations}
                   onChange={(e) => setObservations(e.target.value)}
                   className="w-full bg-transparent border-none outline-none text-neutral-400 text-sm h-32 resize-none custom-scrollbar placeholder-neutral-800 leading-relaxed"
                 />
                 <div className="flex justify-end gap-3 mt-4">
                    <button className="bg-neutral-900 border border-white/5 hover:bg-neutral-800 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Configurar objetivo</button>
                    <button 
                      onClick={handleSaveObs}
                      disabled={isSavingObs}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50 active:scale-95"
                    >
                      {isSavingObs ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Guardar observación
                    </button>
                 </div>
               </div>
            </div>

            {/* Winners Section */}
            <div className="space-y-8 pb-32">
               <div className="flex items-center justify-between px-2">
                  <h3 className="text-[14px] font-black text-white uppercase tracking-widest">Anuncios Ganadores</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-[#111] px-4 py-2 rounded-xl border border-white/5">
                       <span className="text-[9px] font-black text-neutral-700 uppercase tracking-widest">Ordenar por</span>
                       <select 
                         value={sortBy}
                         onChange={(e) => setSortBy(e.target.value)}
                         className="bg-transparent text-[10px] font-black text-neutral-300 outline-none uppercase tracking-widest cursor-pointer"
                       >
                         <option value="roas">ROAS</option>
                         <option value="purchases">Compras</option>
                       </select>
                    </div>
                    <div className="flex items-center gap-2 bg-[#111] px-4 py-2 rounded-xl border border-white/5">
                       <span className="text-[9px] font-black text-neutral-700 uppercase tracking-widest">Top</span>
                       <select 
                         value={topN}
                         onChange={(e) => setTopN(parseInt(e.target.value))}
                         className="bg-transparent text-[10px] font-black text-neutral-300 outline-none uppercase tracking-widest cursor-pointer"
                       >
                         <option value={3}>3</option>
                         <option value={5}>5</option>
                         <option value={10}>10</option>
                       </select>
                    </div>
                    <button 
                      onClick={loadAds} 
                      className="bg-white/5 hover:bg-white/10 px-6 py-2 rounded-xl text-[10px] font-black text-white uppercase tracking-widest border border-white/5 transition-all"
                    >
                      Cargar
                    </button>
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-6">
                 {adsLoading ? (
                   <div className="py-24 bg-[#111]/30 rounded-[3rem] flex flex-col items-center justify-center text-neutral-700 gap-4 border border-white/5 border-dashed">
                      <Loader2 className="w-10 h-10 animate-spin opacity-20" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Analizando creativos en Meta...</span>
                   </div>
                 ) : ads.length === 0 ? (
                    <div className="py-24 bg-[#111]/30 rounded-[3rem] flex flex-col items-center justify-center text-neutral-700 gap-4 border border-white/5 border-dashed">
                      <LayoutGrid className="w-10 h-10 opacity-10" />
                      <span className="text-[10px] font-black uppercase tracking-widest">No hay anuncios con gasto</span>
                    </div>
                 ) : ads.map((ad, idx) => (
                   <AdCard key={ad.id} ad={ad} rank={idx + 1} />
                 ))}
               </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-800 space-y-4">
             <div className="w-20 h-20 bg-white/[0.02] rounded-full flex items-center justify-center border border-white/5">
               <LayoutGrid className="w-10 h-10 opacity-20" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Selecciona un cliente de la lista lateral</p>
          </div>
        )}
      </div>
    </div>
  );
};

const MetricBox: React.FC<{ label: string; value: string; isPlaceholder?: boolean }> = ({ label, value, isPlaceholder }) => (
  <div className="bg-[#111] p-6 rounded-[2rem] border border-white/5 space-y-1.5 hover:bg-[#141414] transition-all shadow-lg group">
    <div className="text-[9px] font-black text-neutral-700 uppercase tracking-widest group-hover:text-neutral-600 transition-colors">{label}</div>
    <div className={`text-2xl font-black tracking-tight ${isPlaceholder ? 'text-neutral-900' : 'text-white'}`}>{isPlaceholder ? '—' : value}</div>
  </div>
);

const AdCard: React.FC<{ ad: Ad; rank: number }> = ({ ad, rank }) => {
  const chartData = ad.dailySeries?.map(d => ({
    ...d,
    formattedDate: format(parseISO(d.date), 'dd/MM', { locale: es })
  })) || [];

  const stats = [
    { label: 'ROAS', value: `×${ad.roas.toFixed(2)}`, color: 'text-success' },
    { label: 'CTR', value: `${ad.ctr.toFixed(2)}%` },
    { label: 'Invertido', value: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(ad.spend) },
    { label: 'Compras', value: ad.purchases.toString() },
    { label: 'Valor Conv.', value: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(ad.revenue) },
    { label: 'Costo/compra', value: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(ad.purchases > 0 ? ad.spend / ad.purchases : 0) }
  ];

  return (
    <div className="bg-[#111] rounded-[3rem] border border-white/5 p-8 flex flex-col xl:flex-row gap-10 items-center hover:bg-[#131313] transition-all shadow-xl group/card relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full translate-x-16 -translate-y-16"></div>
      
      {/* Ad Identity */}
      <div className="w-full xl:w-64 shrink-0 space-y-4">
         <div className="bg-[#050505] rounded-[2.5rem] overflow-hidden aspect-[4/5] border border-white/10 relative shadow-2xl ring-1 ring-white/5">
            <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-black/90 backdrop-blur-md rounded-xl text-[10px] font-black text-white uppercase tracking-widest border border-white/10 shadow-2xl">
               #{rank} - {ad.roas > 3 ? 'Winner' : 'ROAS'}
            </div>
            {ad.thumbnail ? (
              <img src={ad.thumbnail} alt={ad.name} className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center opacity-10 gap-3 text-white">
                <Package className="w-12 h-12" />
                <span className="text-[10px] font-black uppercase tracking-widest text-center px-4">Creativo sin previsualización</span>
              </div>
            )}
         </div>
      </div>

      {/* Stats Column */}
      <div className="flex-1 w-full min-w-0 space-y-6">
         <div className="text-center xl:text-left space-y-1">
            <div className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em]">{ad.name.split(' - ')[0]}</div>
            <div className="text-sm font-bold text-neutral-300 truncate opacity-80">{ad.name.split(' - ')[1] || 'Meta Ads Creative'}</div>
         </div>

         <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
            {stats.map(stat => (
              <div key={stat.label} className="bg-black/30 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center shadow-inner">
                <div className="text-[9px] font-black text-neutral-700 uppercase tracking-widest mb-1">{stat.label}</div>
                <div className={`text-sm font-black tracking-tight ${stat.color || 'text-white'}`}>{stat.value}</div>
              </div>
            ))}
         </div>
      </div>

      {/* Chart Section */}
      <div className="w-full xl:w-[500px] relative bg-black/50 rounded-[2.5rem] p-8 border border-white/5 shadow-2xl ring-1 ring-white/5">
         <div className="flex flex-wrap items-center gap-4 mb-6">
            <LegendItem color="#3b82f6" label="Compras" />
            <LegendItem color="#22c55e" label="Facturación" />
            <LegendItem color="#f97316" label="ROAS" />
         </div>

         <div className="h-48 w-full group/chart">
           <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`gP-${ad.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id={`gR-${ad.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="formattedDate" hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '16px' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '4px' }}
                  labelStyle={{ fontSize: '10px', color: '#666', marginBottom: '8px', fontWeight: '900', textTransform: 'uppercase' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={3} fill={`url(#gR-${ad.id})`} dot={false} strokeDasharray="5 5" strokeOpacity={0.5} />
                <Area type="monotone" dataKey="purchases" stroke="#3b82f6" strokeWidth={3} fill={`url(#gP-${ad.id})`} dot={false} />
              </AreaChart>
           </ResponsiveContainer>
         </div>
         
         <div className="absolute top-8 right-8 flex flex-col items-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Live Performance</span>
         </div>
      </div>

      {/* Action Button */}
      <div className="w-full xl:w-auto shrink-0 flex items-center justify-center xl:border-l border-white/5 xl:pl-10">
        <button className="flex flex-col items-center gap-3 active:scale-95 transition-all group/btn">
           <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center text-neutral-600 group-hover/btn:bg-blue-600 group-hover/btn:text-white transition-all shadow-2xl shadow-blue-600/0 group-hover/btn:shadow-blue-600/30">
              <ArrowUpRight className="w-6 h-6" />
           </div>
           <span className="text-[10px] font-black text-neutral-700 uppercase tracking-[0.2em] group-hover/btn:text-neutral-300">Ver anuncio</span>
        </button>
      </div>
    </div>
  );
};

const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-2">
    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
    <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">{label}</span>
  </div>
);

export default AccountDetailView;
