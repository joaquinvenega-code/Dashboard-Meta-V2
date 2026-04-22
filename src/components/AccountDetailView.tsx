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
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Settings,
  Download,
  FileText,
  Instagram,
  Facebook
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  Tooltip, 
  ResponsiveContainer,
  Line
} from 'recharts';
import { AnimatePresence, motion } from 'motion/react';
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
  const [showMetrics, setShowMetrics] = useState(true);
  const [showObservations, setShowObservations] = useState(true);
  const [showMetricConfig, setShowMetricConfig] = useState(false);
  const [localVisibleMetrics, setLocalVisibleMetrics] = useState<string[]>([]);
  const [chartFilters, setChartFilters] = useState<Record<string, string[]>>({});

  const defaultVisibleMetrics = ['spend', 'revenue', 'roas', 'objective', 'progress_revenue', 'progress_budget', 'ctr', 'purchases', 'atc', 'ic', 'cpp'];
  
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

  // Initialize local metrics - cuando cambia la cuenta o cuando los settings llegan por primera vez
  useEffect(() => {
    if (s?.visibleMetrics && s.visibleMetrics.length > 0) {
      setLocalVisibleMetrics(s.visibleMetrics);
    } else {
      setLocalVisibleMetrics(defaultVisibleMetrics);
    }
  }, [selectedId, !!s?.visibleMetrics]);

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

  const handlePrint = () => {
    window.print();
  };

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

  const ALL_METRICS = [
    { id: 'spend', label: 'Inversión' },
    { id: 'revenue', label: 'Facturado' },
    { id: 'roas', label: 'ROAS' },
    { id: 'objective', label: 'Objetivo' },
    { id: 'progress_revenue', label: '% Objetivo' },
    { id: 'progress_budget', label: '% Presupuesto' },
    { id: 'ctr', label: 'CTR' },
    { id: 'clicks', label: 'Clics' },
    { id: 'purchases', label: 'Compras' },
    { id: 'atc', label: 'Agreg. carrito' },
    { id: 'ic', label: 'Pagos iniciados' },
    { id: 'cpp', label: 'Costo x compra' },
    { id: 'messages', label: 'Mensajes' },
    { id: 'cpm', label: 'Costo x mensaje' },
    { id: 'messages_real', label: 'Mensajes Reales' },
    { id: 'cpm_real', label: 'Costo Mensaje Real' },
  ];

  const visibleMetrics = localVisibleMetrics;

  const toggleMetric = (metricId: string) => {
    if (!selectedId) return;
    const next = localVisibleMetrics.includes(metricId) 
      ? localVisibleMetrics.filter(id => id !== metricId)
      : [...localVisibleMetrics, metricId];
    
    setLocalVisibleMetrics(next); // Feedback instantáneo
    onSaveSettings(selectedId, { ...(s || {}), visibleMetrics: next } as any);
  };

  const toggleChartMetric = (adId: string, metric: string) => {
    setChartFilters(prev => {
      const current = prev[adId] || ['purchases', 'revenue'];
      const next = current.includes(metric)
        ? current.filter(m => m !== metric)
        : [...current, metric];
      return { ...prev, [adId]: next };
    });
  };

  const renderMetric = (id: string, acc: AdAccount) => {
    const sAcc = settings[acc.id];
    switch(id) {
      case 'spend': return <MetricBox key={id} label="Inversión" value={formatCurrency(acc.spend || 0, acc.currency)} />;
      case 'revenue': return <MetricBox key={id} label="Facturado" value={formatCurrency(acc.revenue || 0, acc.currency)} />;
      case 'roas': return <MetricBox key={id} label="ROAS" value={`×${formatDecimal((acc.revenue || 0) / (acc.spend || 1))}`} />;
      case 'objective': return <MetricBox key={id} label="Objetivo" value={formatCurrency(sAcc?.objective || 0, acc.currency)} isPlaceholder={!sAcc?.objective} />;
      case 'progress_revenue': return <MetricBox key={id} label="% Objetivo" value={`${getProgress(acc) || 0}%`} isPlaceholder={!getProgress(acc)} />;
      case 'progress_budget': return <MetricBox key={id} label="% Presupuesto" value={`${sAcc?.budget ? Math.round(((acc.spend || 0) / sAcc.budget) * 100) : 0}%`} isPlaceholder={!sAcc?.budget} />;
      case 'ctr': return <MetricBox key={id} label="CTR" value={`${formatDecimal(acc.ctr, 2)}%`} />;
      case 'clicks': return <MetricBox key={id} label="Clics" value={formatDecimal(acc.clicks, 0)} />;
      case 'purchases': return <MetricBox key={id} label="Compras" value={formatDecimal(acc.purchases, 0)} />;
      case 'atc': return <MetricBox key={id} label="Agreg. carrito" value={formatDecimal(acc.addToCart, 0)} />;
      case 'ic': return <MetricBox key={id} label="Pagos iniciados" value={formatDecimal(acc.checkouts, 0)} />;
      case 'cpp': return <MetricBox key={id} label="Costo x compra" value={formatCurrency(acc.costPerPurchase || 0, acc.currency)} />;
      case 'messages': return <MetricBox key={id} label="Mensajes" value={formatDecimal(acc.messages, 0)} />;
      case 'cpm': return <MetricBox key={id} label="Costo x mensaje" value={formatCurrency(acc.costPerMessage || 0, acc.currency)} />;
      case 'messages_real': return <MetricBox key={id} label="Mensajes Reales" value={formatDecimal(acc.messagesReal, 0)} />;
      case 'cpm_real': return <MetricBox key={id} label="Costo Mensaje Real" value={formatCurrency(acc.costPerMessageReal || 0, acc.currency)} />;
      default: return null;
    }
  };

  const AdCard: React.FC<{ ad: Ad; rank: number }> = ({ ad, rank }) => {
    const filters = chartFilters[ad.id] || ['purchases', 'revenue', 'roas'];
    const showSales = filters.includes('purchases');
    const showRevenue = filters.includes('revenue');
    const showRoas = filters.includes('roas');

    const chartData = ad.dailySeries?.filter(d => 
      d.date >= dateRange.since && d.date <= dateRange.until
    ).map(d => ({
      ...d,
      formattedDate: format(parseISO(d.date), 'dd/MM', { locale: es })
    })) || [];

    const stats = [
      { label: 'ROAS', value: `×${ad.roas.toFixed(2)}`, color: 'text-success print:text-green-600' },
      { label: 'CTR', value: `${ad.ctr.toFixed(2)}%` },
      { label: 'Inversión', value: formatCurrency(ad.spend, selectedAccount?.currency) },
      { label: 'Ventas', value: ad.purchases.toString() },
      { label: 'Ingresos', value: formatCurrency(ad.revenue, selectedAccount?.currency) },
      { label: 'Costo x Venta', value: formatCurrency(ad.purchases > 0 ? ad.spend / ad.purchases : 0, selectedAccount?.currency) }
    ];

    return (
      <div className="bg-[#111] rounded-xl border border-white/5 p-4 hover:bg-[#131313] transition-all shadow-xl group/card relative overflow-hidden ad-card-print print:bg-white print:border-neutral-100 print:shadow-none print:break-inside-avoid print:p-1.5 print:mb-0 print:border-b">
         <div className="hidden print:block absolute top-1 right-2 text-[8px] font-black text-neutral-400 uppercase tracking-tighter">RANK #{rank}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 items-center print:flex print:gap-4 print:items-center">
          <div className="md:col-span-1 xl:col-span-2 print:shrink-0">
             <div className="bg-[#050505] rounded-xl overflow-hidden aspect-[4/5] border border-white/10 relative shadow-2xl print:border-neutral-200 print:w-24 print:h-32 print:aspect-auto">
                <div className="absolute top-2 left-2 z-20 px-2 py-0.5 bg-black/95 backdrop-blur-md rounded-md text-[8px] font-black text-white uppercase tracking-widest border border-white/10 print:hidden">
                   #{rank}
                </div>
                {ad.thumbnail ? (
                  <img 
                    src={ad.thumbnail} 
                    alt={ad.name} 
                    data-original={ad.thumbnail}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110" 
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      const originalUrl = img.getAttribute('data-original') || '';
                      
                      // Si falló el 1080p, intentamos volver a la URL original sin escala
                      if (img.src.includes('/s1080x1080/')) {
                        console.warn(`[AdThumb] 403/Error on HD, rolling back for ${ad.id}`);
                        img.src = originalUrl.replace('/s1080x1080/', '/'); 
                        return;
                      }

                      // Si ya falló todo, ocultamos y mostramos placeholder
                      img.style.display = 'none';
                      const placeholder = img.parentElement?.querySelector('.ad-placeholder');
                      if (placeholder) placeholder.classList.remove('hidden');
                    }}
                    style={{ 
                      WebkitFontSmoothing: 'antialiased',
                      imageRendering: 'auto'
                    }}
                  />
                ) : null}
                <div className={`ad-placeholder absolute inset-0 z-0 flex flex-col items-center justify-center opacity-10 gap-2 text-white ${ad.thumbnail ? 'hidden' : ''}`}>
                  <Package className="w-6 h-6 print:text-black" />
                  <span className="text-[10px] uppercase font-black">Sin imagen</span>
                </div>
             </div>
          </div>

          <div className="md:col-span-1 xl:col-span-3 flex flex-col gap-4 print:flex-1 print:gap-2">
             <div className="space-y-0.5">
                <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest whitespace-nowrap overflow-hidden text-ellipsis print:text-black print:whitespace-pre-wrap print:text-[8.5px] print:leading-tight print:font-bold" title={ad.name}>
                  {ad.name}
                </div>
             </div>

             <div className="grid grid-cols-3 gap-1.5 print:grid-cols-2 print:gap-1.5 print:mt-1">
                {stats.map(stat => (
                  <div key={stat.label} className="bg-black/30 px-2 py-2 rounded-lg border border-white/5 flex flex-col items-center justify-center text-center print:bg-neutral-50/50 print:border-neutral-100 print:py-1.5 print:px-2 print:rounded-xl">
                    <div className="text-[7px] font-black text-neutral-700 uppercase tracking-widest mb-0.5 print:text-neutral-500 print:text-[5.5px] print:leading-tight print:whitespace-normal">{stat.label}</div>
                    <div className={`text-[10px] font-black tracking-tight ${stat.color || 'text-neutral-300'} truncate w-full print:text-black print:text-[8px] print:truncate-none print:whitespace-nowrap print:leading-none`}>{stat.value}</div>
                  </div>
                ))}
             </div>
          </div>

          <div className="xl:col-span-5 relative bg-black/50 rounded-lg p-4 border border-white/5 h-32 flex flex-col print:flex-[2.5] print:h-24 print:p-0 print:bg-transparent print:border-2 print:border-neutral-100/50 print:rounded-2xl print:overflow-hidden">
             <div className="flex flex-wrap items-center gap-2 mb-2 shrink-0 print:gap-4 print:my-2 print:justify-start print:pl-3">
                <LegendButton 
                  active={showSales} 
                  color="#3b82f6" 
                  label="Ventas" 
                  onClick={() => toggleChartMetric(ad.id, 'purchases')}
                />
                <LegendButton 
                  active={showRevenue} 
                  color="#22c55e" 
                  label="Ingresos" 
                  onClick={() => toggleChartMetric(ad.id, 'revenue')}
                />
                <LegendButton 
                  active={showRoas} 
                  color="#f97316" 
                  label="ROAS" 
                  onClick={() => toggleChartMetric(ad.id, 'roas')}
                />
             </div>

             <div className="flex-1 w-full min-h-0 print:pr-4 print:pb-2">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 35, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`gP-${ad.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id={`gR-${ad.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.1}/>
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="formattedDate" 
                      hide={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 6, fontWeight: 'bold', fill: '#999' }}
                      className="print:block"
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '8px', padding: '6px', color: '#000' }}
                      itemStyle={{ fontSize: '8px', fontWeight: 'bold' }}
                      labelStyle={{ fontSize: '7px', color: '#666' }}
                    />
                    {showRevenue && (
                      <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={1} fill={`url(#gR-${ad.id})`} dot={false} strokeDasharray="2 2" strokeOpacity={0.3} />
                    )}
                    {showSales && (
                      <Area type="monotone" dataKey="purchases" stroke="#3b82f6" strokeWidth={1.5} fill={`url(#gP-${ad.id})`} dot={false} />
                    )}
                    {showRoas && (
                      <Area type="monotone" dataKey="roas" stroke="#f97316" strokeWidth={1} dot={false} strokeDasharray="3 3" />
                    )}
                  </AreaChart>
               </ResponsiveContainer>
             </div>
          </div>

          <div className="xl:col-span-2 flex flex-col items-center pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-white/5 md:pl-4 mt-2 md:mt-0 print:flex print:items-center print:justify-center print:border-none print:ml-1">
            <a 
              href={ad.previewUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className={`flex flex-col items-center gap-1 group/link transition-all ${!ad.previewUrl ? 'pointer-events-none opacity-20' : 'cursor-pointer'} print:opacity-100 print:grayscale-0 print:bg-blue-600 print:px-3 print:py-2 print:rounded-lg print:shadow-md print:block print:w-full print:text-center print:cursor-pointer`}
              style={{ display: 'flex', textDecoration: 'none' }}
              id={`ad-link-${ad.id}`}
            >
              <ArrowUpRight className="w-4 h-4 text-neutral-600 group-hover/link:text-white print:text-white print:mx-auto" />
              <span className="text-[8px] font-black text-neutral-700 uppercase tracking-widest group-hover/link:text-neutral-400 whitespace-nowrap print:text-white print:text-[7px] print:block print:w-full">Ver anuncio</span>
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex items-center gap-4 print:hidden">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar cuenta en el listado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-sm bg-[#111] border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-xs text-white placeholder-neutral-700 outline-none focus:border-blue-500/50 transition-all shadow-inner"
          />
        </div>

        <div className="flex items-center gap-2">
           <button 
             onClick={handlePrint}
             className="bg-neutral-900 border border-white/10 px-4 py-2.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 shadow-lg"
           >
             <ArrowUpRight className="w-3.5 h-3.5 rotate-180" />
             PDF Report
           </button>
           <button className="bg-neutral-900 border border-white/5 px-3 py-2.5 rounded-xl text-[10px] font-black text-neutral-400 uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2">
             <TableIcon className="w-3.5 h-3.5" />
             Excel
           </button>
        </div>
      </div>

      <div className="flex bg-transparent gap-4 h-[calc(100vh-200px)] print:h-auto">
        {/* Sidebar - Accounts List */}
        <div className="w-72 bg-[#111]/50 rounded-xl border border-white/5 overflow-hidden flex flex-col shadow-2xl backdrop-blur-sm print:hidden">
          <div className="px-5 py-4 border-b border-white/5 bg-white/[0.01]">
             <h3 className="text-[9px] font-black text-neutral-600 uppercase tracking-[0.2em]">Cuentas Disponibles</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
            {sidebarAccounts.map(acc => {
              const isActive = selectedId === acc.id;
              const progress = getProgress(acc);
              const customName = settings[acc.id]?.customName || acc.name;
              
              return (
                <button
                  key={acc.id}
                  onClick={() => setSelectedId(acc.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all relative group flex items-center justify-between overflow-hidden ${
                    isActive 
                      ? 'bg-blue-600/10 border border-blue-600/20 text-white' 
                      : 'hover:bg-white/[0.02] border border-transparent text-neutral-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${acc.account_status === 1 ? 'bg-success/50' : 'bg-neutral-800'}`} />
                    <span className="text-xs font-bold tracking-tight truncate max-w-[140px] uppercase">{customName}</span>
                  </div>
                  {progress !== null && (
                    <span className={`text-[9px] font-black ${progress >= 80 ? 'text-success' : 'text-neutral-500'}`}>
                      {progress}%
                    </span>
                  )}
                  {isActive && <div className="absolute right-0 w-1 h-3 bg-blue-500 rounded-l-full" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dashboard Area */}
        {selectedAccount ? (
          <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar animate-in fade-in slide-in-from-right-4 duration-500 print:overflow-visible print:pr-0 print:space-y-8">
            <div className="hidden print:flex flex-col gap-4 border-b border-neutral-200 pb-3 mb-3 text-black pt-2">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white shadow-xl overflow-hidden print-keep-bg">
                    {settings[selectedAccount.id]?.customLogo ? (
                      <img 
                        src={settings[selectedAccount.id]?.customLogo} 
                        alt="Logo" 
                        className="w-full h-full object-contain p-2"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Instagram className="w-10 h-10 text-white" />
                    )}
                  </div>
                  <h1 className="text-4xl font-black tracking-tighter text-neutral-900">
                    {settings[selectedAccount.id]?.customName || selectedAccount.name}
                  </h1>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Status & Emisión</div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-xs font-bold text-neutral-900">{format(new Date(), "dd/MM/yyyy", { locale: es })}</div>
                    <div className="flex items-center gap-2 px-2 py-0.5 bg-green-50 text-green-700 rounded text-[9px] font-bold border border-green-100">
                      <Target className="w-2.5 h-2.5" />
                      Reporte Verificado
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="w-full flex justify-center mt-3">
                 <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.45em] bg-blue-50/50 px-8 py-2 rounded-full border border-blue-100">
                  Informe Semanal de Rendimiento — Meta Ads
                 </p>
              </div>

              <div className="flex items-center justify-center gap-8 pt-4 mt-2">
                <div className="flex items-center gap-2">
                  <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 font-bold">Resumen de Periodo:</div>
                  <div className="flex items-center gap-2 text-[11px] font-black text-neutral-900 bg-neutral-50 px-3 py-1 rounded-lg border border-neutral-100">
                    <Calendar className="w-3 h-3 text-blue-600" />
                    <span>{dateRange.since} al {dateRange.until}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Info Header */}
            <div className="flex items-center justify-between print:hidden">
              <div className="flex items-center gap-4">
                 <div className={`w-2 h-2 rounded-full ${selectedAccount.account_status === 1 ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 'bg-neutral-800'} print:hidden`} />
                 <h2 className="text-xl font-black text-white tracking-tight uppercase opacity-90 print:text-black print:text-2xl">{settings[selectedAccount.id]?.customName || selectedAccount.name}</h2>
                 <div className="px-2 py-0.5 bg-white/5 border border-white/5 text-neutral-500 text-[9px] font-black rounded uppercase tracking-widest print:border-neutral-300 print:text-neutral-700">{selectedAccount.currency}</div>
              </div>
              <div className="flex items-center gap-2 print:hidden relative">
                <button 
                  onClick={() => setShowMetricConfig(!showMetricConfig)}
                  className={`p-1.5 rounded-md border border-white/5 transition-all ${showMetricConfig ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-neutral-900 text-neutral-600 hover:text-neutral-400'}`}
                  title="Configurar métricas"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>

                <AnimatePresence>
                  {showMetricConfig && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute top-10 right-0 z-50 w-64 bg-[#111] border border-white/10 rounded-xl shadow-2xl p-4 overflow-hidden"
                    >
                      <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-3 px-1">Configuración de Reporte</div>
                      
                      <div className="space-y-4 mb-4 border-b border-white/5 pb-4">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest px-1 text-neutral-400">Nombre Personalizado</label>
                          <input 
                            type="text"
                            placeholder="Ej: Marca Premium"
                            value={s?.customName || ''}
                            onChange={(e) => onSaveSettings(selectedId!, { ...s!, customName: e.target.value })}
                            className="w-full bg-black/50 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] text-white outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest px-1 text-neutral-400">Logo del Cliente (URL)</label>
                          <input 
                            type="text"
                            placeholder="https://ejemplo.com/logo.png"
                            value={s?.customLogo || ''}
                            onChange={(e) => onSaveSettings(selectedId!, { ...s!, customLogo: e.target.value })}
                            className="w-full bg-black/50 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] text-white outline-none focus:border-blue-500/50 transition-all font-medium"
                          />
                        </div>
                      </div>

                      <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-3 px-1">Métricas Visibles</div>
                      <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                        {ALL_METRICS.map(metric => {
                          const isVisible = visibleMetrics.includes(metric.id);
                          return (
                            <button
                              key={metric.id}
                              onClick={() => toggleMetric(metric.id)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all border ${
                                isVisible 
                                  ? 'bg-blue-600/10 border-blue-600/20 text-blue-400' 
                                  : 'bg-transparent border-transparent text-neutral-600 hover:bg-white/[0.02]'
                              }`}
                            >
                              <span className="text-[10px] font-bold uppercase tracking-tight">{metric.label}</span>
                              {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 opacity-30" />}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="w-px h-4 bg-white/5 mx-1" />

                <button 
                  onClick={() => setShowMetrics(!showMetrics)}
                  className={`p-1.5 rounded-md border border-white/5 transition-all ${showMetrics ? 'bg-blue-600/10 text-blue-500 overflow-hidden' : 'bg-neutral-900 text-neutral-600'}`}
                  title={showMetrics ? 'Ocultar métricas' : 'Mostrar métricas'}
                >
                  {showMetrics ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button 
                  onClick={() => setShowObservations(!showObservations)}
                  className={`p-1.5 rounded-md border border-white/5 transition-all ${showObservations ? 'bg-blue-600/10 text-blue-500' : 'bg-neutral-900 text-neutral-600'}`}
                  title={showObservations ? 'Ocultar observaciones' : 'Mostrar observaciones'}
                >
                  <TableIcon className={`w-3.5 h-3.5 ${showObservations ? 'opacity-100' : 'opacity-40'}`} />
                </button>
              </div>
            </div>

            {/* Metrics Grids */}
            <div className="hidden print:block mb-3">
              <h3 className="text-[10px] font-black text-neutral-900 uppercase tracking-[0.2em] border-l-4 border-blue-600 pl-3">
                Métricas Generales
              </h3>
            </div>
            <AnimatePresence>
              {showMetrics && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 overflow-hidden print:mb-2"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 print:grid-cols-4 gap-2 print:gap-3 print-metrics-grid">
                    {visibleMetrics.map(id => renderMetric(id, selectedAccount!))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Observations Area */}
            <AnimatePresence>
              {showObservations && (
                <>
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2 overflow-hidden print:hidden"
                  >
                     <div className="flex items-center justify-between px-1">
                       <h3 className="text-[9px] font-black text-neutral-700 uppercase tracking-widest">Bitácora de cuenta</h3>
                     </div>
                     <div className="bg-[#111] rounded-xl border border-white/5 p-4 shadow-xl hover:bg-[#131313] transition-colors group">
                       <textarea 
                         placeholder="Escribe aquí las observaciones, experimentos o cambios realizados..."
                         value={observations}
                         onChange={(e) => setObservations(e.target.value)}
                         className="w-full bg-transparent border-none outline-none text-neutral-400 text-xs h-24 resize-none custom-scrollbar placeholder-neutral-800 leading-relaxed"
                       />
                       <div className="flex justify-end gap-2 mt-3 text-[9px] font-black uppercase tracking-widest">
                          <button className="bg-neutral-900 border border-white/5 hover:bg-neutral-800 text-white px-4 py-1.5 rounded-lg transition-all">Metas</button>
                          <button 
                            onClick={handleSaveObs}
                            disabled={isSavingObs}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-1.5 rounded-lg transition-all shadow-xl shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50 active:scale-95"
                          >
                            {isSavingObs ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            Actualizar
                          </button>
                       </div>
                     </div>
                  </motion.div>

                  {/* Print Version of Observations */}
                  {observations && (
                    <div className="hidden print:block space-y-2 mb-10">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <h3 className="text-xs font-black text-neutral-900 uppercase tracking-widest border-b-2 border-blue-600 pb-0.5">
                          Observaciones
                        </h3>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 shadow-sm relative overflow-hidden print:bg-white print:p-0 print:border-none">
                        <p className="text-[10px] text-neutral-800 leading-normal whitespace-pre-wrap font-medium">
                          {observations}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </AnimatePresence>

            {/* Winners Section */}
            <div className="space-y-4 pb-20 print:pb-0">
               <div className="flex items-center justify-between px-1 print:mb-4 print:border-b-2 print:border-neutral-100 print:pb-2">
                  <div className="flex items-center gap-4">
                    <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest print:text-sm print:text-neutral-900 print:border-l-4 print:border-blue-600 print:pl-3">
                      Anuncios de Mejor Rendimiento
                    </h3>
                    <div className="hidden print:flex items-center gap-2 px-2 py-0.5 bg-neutral-950 text-white rounded text-[8px] font-black uppercase tracking-widest">
                      <TrendingUp className="w-3 h-3" />
                      Ponderado por: {sortBy.toUpperCase()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 print:hidden">
                    <div className="flex items-center gap-2 bg-[#111] px-2 py-1 rounded border border-white/5">
                       <span className="text-[8px] font-black text-neutral-700 uppercase tracking-widest">Sort</span>
                       <select 
                         value={sortBy}
                         onChange={(e) => setSortBy(e.target.value)}
                         className="bg-transparent text-[9px] font-black text-neutral-400 outline-none uppercase tracking-widest cursor-pointer"
                       >
                         <option value="roas">ROAS</option>
                         <option value="purchases">Compras</option>
                       </select>
                    </div>
                    <div className="flex items-center gap-2 bg-[#111] px-2 py-1 rounded border border-white/5">
                       <span className="text-[8px] font-black text-neutral-700 uppercase tracking-widest">Limit</span>
                       <select 
                         value={topN}
                         onChange={(e) => setTopN(parseInt(e.target.value))}
                         className="bg-transparent text-[9px] font-black text-neutral-400 outline-none uppercase tracking-widest cursor-pointer"
                       >
                         <option value={3}>3</option>
                         <option value={5}>5</option>
                       </select>
                    </div>
                    <button 
                      onClick={loadAds} 
                      className="bg-white/5 hover:bg-white/10 px-3 py-1 rounded text-[9px] font-black text-white uppercase tracking-widest border border-white/5 transition-all flex items-center gap-2"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${adsLoading ? 'animate-spin' : ''}`} />
                      Sync
                    </button>
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-4">
                 {adsLoading ? (
                   <div className="py-16 bg-[#111]/30 rounded-xl flex flex-col items-center justify-center text-neutral-700 gap-4 border border-white/5 border-dashed">
                      <Loader2 className="w-8 h-8 animate-spin opacity-20" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Calculando rendimiento creativo...</span>
                   </div>
                 ) : ads.length === 0 ? (
                    <div className="py-16 bg-[#111]/30 rounded-xl flex flex-col items-center justify-center text-neutral-700 gap-4 border border-white/5 border-dashed">
                      <LayoutGrid className="w-8 h-8 opacity-10" />
                      <span className="text-[9px] font-black uppercase tracking-widest">No metrics available</span>
                    </div>
                 ) : ads.map((ad, idx) => (
                   <AdCard key={ad.id} ad={ad} rank={idx + 1} />
                 ))}
               </div>
            </div>

            {/* Print Only Footer */}
            <div className="hidden print:flex justify-between items-center border-t border-neutral-100 pt-8 mt-12 text-neutral-400">
              <div className="text-[8px] font-black uppercase tracking-widest">
                © {new Date().getFullYear()} Meta Ads Performance Suite — Reporte de Rendimiento Estratégico
              </div>
              <div className="text-[8px] font-black uppercase tracking-widest italic">
                Documento CONFIDENCIAL para uso exclusivo del cliente.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-800 space-y-4">
             <LayoutGrid className="w-12 h-12 opacity-10" />
             <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">Selecciona una entidad para monitorear</p>
          </div>
        )}
      </div>
    </div>
  );
};

const MetricBox: React.FC<{ label: string; value: string; isPlaceholder?: boolean }> = ({ label, value, isPlaceholder }) => (
  <div className="bg-[#111] p-3 rounded-xl border border-white/5 space-y-1 hover:bg-[#141414] transition-all shadow-lg group overflow-hidden print:bg-white print:border-neutral-100 print:shadow-sm print:border-b-2">
    <div className="text-[8px] font-black text-neutral-700 uppercase tracking-widest group-hover:text-neutral-500 transition-colors print:text-neutral-400">{label}</div>
    <div className={`text-sm md:text-base font-black tracking-tight truncate ${isPlaceholder ? 'text-neutral-900' : 'text-white'} print:text-black`}>
      {isPlaceholder ? '—' : value}
    </div>
  </div>
);

const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-2">
    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
    <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">{label}</span>
  </div>
);

const LegendButton = ({ color, label, active, onClick }: { color: string; label: string; active: boolean; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 transition-all ${active ? 'opacity-100' : 'opacity-20 grayscale'} print:opacity-100 print:grayscale-0`}
  >
    <div className="w-2 h-2 rounded-full print:w-3 print:h-3" style={{ backgroundColor: color }} />
    <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest print:text-[8px] print:text-black print:font-black">{label}</span>
  </button>
);

export default AccountDetailView;
