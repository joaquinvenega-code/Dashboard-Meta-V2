import React, { useState, useEffect, useCallback } from 'react';
import { 
  AdAccount, 
  AccountSettings, 
  Ad, 
  DailyMetric,
  AccountNote,
  OfflineSaleEntry,
  ClientCategory
} from '../types';
import { 
  fetchTopAds, 
  fetchDailySeries,
  fetchAccountDailyPerformance
} from '../services/facebook';
import { 
  Search, 
  RefreshCw, 
  Calendar, 
  ArrowUpRight,
  TrendingUp,
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
  Filter,
  Eye,
  EyeOff,
  Settings,
  Download,
  FileText,
  Facebook,
  X,
  Mic,
  MicOff,
  History,
  Rocket,
  ImageOff,
  MessageSquare,
  UserCheck,
  Users,
  GripVertical
} from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const RocketLoader = () => (
  <div className="flex flex-col items-center justify-center pt-32 pb-20 w-full animate-in fade-in duration-700">
    <div className="relative mb-12">
      {/* Dynamic Energy Particles - More subtle and contained */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, 20 + Math.random() * 10],
            x: [0, (Math.random() - 0.5) * 15],
            opacity: [0, 0.6, 0],
            scale: [0, 1.2, 0],
          }}
          transition={{
            duration: 0.8 + Math.random() * 0.4,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeOut"
          }}
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 blur-[1px] z-0"
        />
      ))}

      {/* High-Frequency Engine Jitter - Rotated -45deg to point straight up */}
      <motion.div
        animate={{ 
          y: [-0.8, 0.8, -0.4, 0.4, 0],
          rotate: [-45.8, -44.2, -45.8],
        }}
        transition={{ 
          duration: 0.12, // High frequency for "engine" feel
          repeat: Infinity, 
          ease: "linear" 
        }}
        className="relative z-10"
      >
        <Rocket className="w-12 h-12 text-blue-400 fill-blue-500/20 drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
      </motion.div>

      {/* Main Energy Trail (Shortened to avoid text overlap) */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
        {/* Layer 1: Outer Glow */}
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
            height: [15, 25, 15]
          }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 bg-indigo-600/20 blur-xl rounded-full"
        />
        
        {/* Layer 2: Inner Core */}
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.4, 0.7, 0.4],
            height: [20, 35, 20]
          }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 bg-gradient-to-t from-transparent via-cyan-400/40 to-blue-300/60 blur-md rounded-full shadow-[0_0_15px_rgba(34,211,238,0.4)]"
        />

        {/* Layer 3: Intense Flicker Core (Very short) */}
        <motion.div
          animate={{ 
            scaleX: [0.8, 1.1, 0.8],
            opacity: [0.4, 0.8, 0.4]
          }}
          transition={{ duration: 0.1, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-8 bg-white blur-[1px] rounded-full opacity-50"
        />
      </div>
    </div>
    
    <div className="flex flex-col items-center gap-2 mt-2">
      <motion.div 
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="flex items-center gap-3"
      >
        <div className="h-[1px] w-6 bg-gradient-to-r from-transparent to-blue-500/40" />
        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Sincronizando Orion</h4>
        <div className="h-[1px] w-6 bg-gradient-to-l from-transparent to-blue-500/40" />
      </motion.div>
      <p className="text-[8px] text-neutral-600 font-bold uppercase tracking-[0.2em] italic">Estabilizando flujo de datos estelar...</p>
    </div>
  </div>
);
import { cn, calculateEffectiveBalance } from '../lib/utils';
import { startOfMonth, addDays, subDays, isSameMonth, isSameYear } from 'date-fns';
import { OfflineSalesManager } from './OfflineSalesManager';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis,
  Tooltip, 
  ResponsiveContainer,
  Line
} from 'recharts';
import { AnimatePresence, motion } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface SortableMetricCardProps {
  id: string;
  onRemove: () => void;
  children: React.ReactNode;
}

const SortableMetricCard: React.FC<SortableMetricCardProps> = ({ id, onRemove, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 30 : undefined,
        opacity: isDragging ? 0.72 : 1,
      }}
      className={cn(
        'metric-sortable relative min-w-0 rounded-xl transition-shadow',
        isDragging && 'shadow-2xl shadow-blue-950/40'
      )}
    >
      <button
        type="button"
        className="absolute left-2.5 top-2.5 z-20 cursor-grab rounded p-0.5 text-neutral-600 transition-colors hover:bg-white/[0.05] hover:text-neutral-300 active:cursor-grabbing print:hidden"
        title="Arrastrar para mover"
        aria-label="Arrastrar para mover la métrica"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className="absolute right-2.5 top-2.5 z-20 rounded p-0.5 text-neutral-600 transition-colors hover:bg-red-500/10 hover:text-red-300 print:hidden"
        title="Quitar métrica"
        aria-label="Quitar métrica"
      >
        <X className="h-3 w-3" />
      </button>
      <div className="h-full">{children}</div>
    </div>
  );
};

const completeDailySeriesForRange = (
  series: DailyMetric[] | undefined,
  since: string,
  until: string
): DailyMetric[] => {
  try {
    const start = parseISO(since);
    const end = parseISO(until);
    if (start > end) return [];

    const byDate = new Map((series || []).map(item => [item.date, item]));
    const completed: DailyMetric[] = [];

    for (let current = start; current <= end; current = addDays(current, 1)) {
      const date = format(current, 'yyyy-MM-dd');
      const existing = byDate.get(date);
      completed.push(existing ? { ...existing, date } : {
        date,
        spend: 0,
        clicks: 0,
        purchases: 0,
        revenue: 0,
        messages: 0,
        leads: 0,
        costPerLead: 0,
        roas: 0,
      });
    }

    return completed;
  } catch {
    return [...(series || [])].sort((a, b) => a.date.localeCompare(b.date));
  }
};

interface AccountDailyTrendCardProps {
  account: AdAccount;
  settings?: AccountSettings;
  dailySeries: DailyMetric[];
  dateRange: { since: string; until: string };
  loading?: boolean;
}

const GeneralPrintTrendChart: React.FC<{
  data: Array<Record<string, any>>;
  primaryLabel: string;
  secondaryLabel: string;
  showSecondary: boolean;
}> = ({ data, primaryLabel, secondaryLabel, showSecondary }) => {
  const width = 960;
  const height = 190;
  const padding = { top: 20, right: 28, bottom: 34, left: 48 };
  const primaryValues = data.map(item => Number(item.primaryValue) || 0);
  const secondaryValues = data.map(item => Number(item.costPerUnit) || 0);
  const primaryMax = Math.max(...primaryValues, 1);
  const secondaryMax = Math.max(...secondaryValues, 1);

  const xForIndex = (index: number) => data.length === 1
    ? width / 2
    : padding.left + (index / (data.length - 1)) * (width - padding.left - padding.right);
  const yForValue = (value: number, max: number) => (
    height - padding.bottom - (value / max) * (height - padding.top - padding.bottom)
  );
  const primaryPoints = primaryValues.map((value, index) => ({
    x: xForIndex(index),
    y: data.length === 1 ? height / 2 : yForValue(value, primaryMax),
  }));
  const secondaryPoints = secondaryValues.map((value, index) => ({
    x: xForIndex(index),
    y: data.length === 1 ? height / 2 : yForValue(value, secondaryMax),
  }));
  const primaryPolyline = primaryPoints.map(point => `${point.x},${point.y}`).join(' ');
  const secondaryPolyline = secondaryPoints.map(point => `${point.x},${point.y}`).join(' ');
  const baseline = height - padding.bottom;
  const areaPoints = `${padding.left},${baseline} ${primaryPolyline} ${width - padding.right},${baseline}`;
  const labelIndexes = data.length <= 6
    ? data.map((_, index) => index)
    : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  if (data.length === 0) {
    return (
      <div className="general-print-chart hidden print:flex">
        <strong>Sin evolución diaria para el período seleccionado.</strong>
      </div>
    );
  }

  return (
    <div className="general-print-chart hidden print:flex">
      <div className="general-print-chart-legend">
        <span><i className="general-print-primary-dot" />{primaryLabel}</span>
        {showSecondary && <span><i className="general-print-secondary-line" />{secondaryLabel}</span>}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${primaryLabel} por día`}>
        {[0, 0.5, 1].map(position => {
          const y = padding.top + position * (height - padding.top - padding.bottom);
          const label = Math.round(primaryMax * (1 - position));
          return (
            <g key={position}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padding.left - 12} y={y + 4} textAnchor="end" fill="#64748b" fontSize="12" fontWeight="650">{label}</text>
            </g>
          );
        })}
        <polygon points={areaPoints} fill="#dbeafe" opacity="0.75" />
        <polyline points={primaryPolyline} fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
        {showSecondary && (
          <polyline points={secondaryPolyline} fill="none" stroke="#7dd3fc" strokeWidth="2.5" strokeDasharray="9 7" strokeLinejoin="round" strokeLinecap="round" />
        )}
        {primaryPoints.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="4" fill="#3b82f6" />
        ))}
        {labelIndexes.map(index => (
          <text
            key={index}
            x={xForIndex(index)}
            y={height - 8}
            textAnchor={index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'}
            fill="#64748b"
            fontSize="12"
            fontWeight="650"
          >
            {data[index]?.formattedDate}
          </text>
        ))}
      </svg>
    </div>
  );
};

export const AccountDailyTrendCard: React.FC<AccountDailyTrendCardProps> = ({
  account,
  settings,
  dailySeries,
  dateRange,
  loading = false,
}) => {
  const isMultiChannel = settings?.tracking === 'all' || settings?.tracking === 'both';
  const currency = settings?.currency || account.currency || 'ARS';

  // Active metric tab toggle: 'messages' | 'leads' | 'purchases'
  const [activeMetric, setActiveMetric] = useState<'messages' | 'leads' | 'purchases'>(() => {
    if (settings?.tracking === 'leads') return 'leads';
    if (settings?.tracking === 'messaging') return 'messages';
    if (settings?.tracking === 'ecommerce') return 'purchases';
    if (account.leads && account.leads > 0) return 'leads';
    if (account.messagesReal || account.messages) return 'messages';
    return 'purchases';
  });

  // La configuración de la cuenta define la única serie relevante.
  React.useEffect(() => {
    if (settings?.tracking === 'messaging') setActiveMetric('messages');
    if (settings?.tracking === 'leads') setActiveMetric('leads');
    if (settings?.tracking === 'ecommerce') setActiveMetric('purchases');
  }, [settings?.tracking]);

  // Completa el calendario seleccionado sin inventar actividad para los días vacíos.
  const chartData = React.useMemo(() => {
    const sourceData = completeDailySeriesForRange(dailySeries, dateRange.since, dateRange.until);

    return sourceData.map(d => {
      const msgs = d.messages || 0;
      const lds = d.leads || 0;
      const purch = d.purchases || 0;

      const cpm = msgs > 0 ? d.spend / msgs : 0;
      const cpl = lds > 0 ? d.spend / lds : 0;
      const cpp = purch > 0 ? d.spend / purch : 0;

      let primaryValue = purch;
      let costPerUnit = cpp;

      if (activeMetric === 'leads') {
        primaryValue = lds;
        costPerUnit = cpl;
      } else if (activeMetric === 'messages') {
        primaryValue = msgs;
        costPerUnit = cpm;
      }

      return {
        ...d,
        messages: msgs,
        costPerMessage: cpm,
        leads: lds,
        costPerLead: cpl,
        purchases: purch,
        costPerPurchase: cpp,
        primaryValue,
        costPerUnit,
        formattedDate: format(parseISO(d.date), 'dd/MM', { locale: es })
      };
    });
  }, [dailySeries, dateRange.since, dateRange.until, activeMetric]);

  const metricMeta = React.useMemo(() => {
    switch (activeMetric) {
      case 'leads':
        return {
          label: 'Clientes Potenciales',
          shortLabel: 'Leads',
          costLabel: 'Costo x Lead',
          primaryColor: '#60a5fa',
          secondaryColor: '#93c5fd'
        };
      case 'messages':
        return {
          label: 'Mensajes',
          shortLabel: 'Mensajes',
          costLabel: 'Costo x Mensaje',
          primaryColor: '#60a5fa',
          secondaryColor: '#93c5fd'
        };
      case 'purchases':
      default:
        return {
          label: 'Ventas Web',
          shortLabel: 'Compras',
          costLabel: 'Facturación / CPA',
          primaryColor: '#60a5fa',
          secondaryColor: '#93c5fd'
        };
    }
  }, [activeMetric]);

  const gradientId = `accDailyGrad-${account.id}-${activeMetric}`;

  return (
    <div className="account-trend-print group relative mb-3 overflow-hidden rounded-xl border border-white/[0.07] bg-[#12161d] p-4 print:mb-2 print:border-neutral-200 print:bg-white print:p-2.5 print:shadow-none">
      <div className="mb-2 flex flex-col justify-between gap-2 text-white print:mb-1 print:text-black sm:flex-row sm:items-center">
        <div>
          <h4 className="text-sm font-semibold text-white print:text-[10px] print:text-black">
            Evolución de {metricMeta.label.toLowerCase()}
          </h4>
          <p className="mt-0.5 text-[10px] font-medium text-neutral-500 print:mt-0 print:text-[7.5px]">
            Datos diarios · {dateRange.since} al {dateRange.until}
          </p>
        </div>

        {/* Solo las cuentas multicanal necesitan elegir qué resultado graficar. */}
        {isMultiChannel && (
        <div className="flex items-center gap-1 self-start rounded-lg border border-white/[0.07] bg-black/20 p-1 print:hidden sm:self-auto">
          <button
            onClick={() => setActiveMetric('messages')}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-medium transition-colors",
              activeMetric === 'messages'
                ? "bg-blue-500/15 text-blue-200"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            )}
            title="Ver gráfico de Mensajes"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Mensajes</span>
          </button>

          <button
            onClick={() => setActiveMetric('leads')}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-medium transition-colors",
              activeMetric === 'leads'
                ? "bg-blue-500/15 text-blue-200"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            )}
            title="Ver gráfico de Clientes Potenciales"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Leads</span>
          </button>

          <button
            onClick={() => setActiveMetric('purchases')}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-medium transition-colors",
              activeMetric === 'purchases'
                ? "bg-blue-500/15 text-blue-200"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            )}
            title="Ver gráfico de Compras Web"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Ventas</span>
          </button>
        </div>
        )}
      </div>

      {activeMetric === 'messages' && !loading && (
        <div className="mb-1 flex items-center justify-end gap-4 px-2 text-[9px] font-medium text-neutral-400 print:hidden">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            Mensajes
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 border-t border-dashed border-sky-200" />
            Costo por mensaje
          </span>
        </div>
      )}

      {/* Responsive Chart */}
      <div className="account-trend-chart h-44 print:hidden w-full relative">
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-500">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-[9px] uppercase font-bold tracking-widest">Cargando serie diaria...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 24, left: -12, bottom: 8 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={metricMeta.primaryColor} stopOpacity={0.4}/>
                  <stop offset="100%" stopColor={metricMeta.primaryColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="formattedDate" 
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={42}
                tick={{ fontSize: 9, fontWeight: 'bold', fill: '#888' }}
              />
              <YAxis 
                yAxisId="primary"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fontWeight: 'bold', fill: '#888' }}
                allowDecimals={false}
              />
              {activeMetric === 'messages' && (
                <YAxis
                  yAxisId="cost"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  hide
                />
              )}
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0a0a0a', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '12px', 
                  padding: '8px 12px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
                }}
                formatter={(val: any, name: string) => {
                  if (name === 'primaryValue') return [val.toLocaleString('es-AR'), `Total ${metricMeta.label}`];
                  if (name === 'costPerUnit') {
                    return [new Intl.NumberFormat('es-AR', {
                      style: 'currency',
                      currency,
                      maximumFractionDigits: 0,
                    }).format(Number(val) || 0), 'Costo por mensaje'];
                  }
                  return [val, name];
                }}
                labelStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#888', marginBottom: '4px' }}
                itemStyle={{ fontSize: '11px', fontWeight: '900', color: '#fff' }}
              />
              <Area 
                yAxisId="primary"
                type="monotone" 
                dataKey="primaryValue" 
                stroke={metricMeta.primaryColor} 
                strokeWidth={2.5} 
                fill={`url(#${gradientId})`} 
                dot={{ r: 3, fill: metricMeta.primaryColor, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#fff', stroke: metricMeta.primaryColor, strokeWidth: 2 }}
              />
              {activeMetric === 'messages' && (
                <Area
                  yAxisId="cost"
                  type="monotone"
                  dataKey="costPerUnit"
                  stroke="#bae6fd"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  fill="transparent"
                  dot={false}
                  activeDot={{ r: 4, fill: '#bae6fd', stroke: '#12161d', strokeWidth: 2 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      {!loading && (
        <GeneralPrintTrendChart
          data={chartData}
          primaryLabel={metricMeta.shortLabel}
          secondaryLabel={metricMeta.costLabel}
          showSecondary={activeMetric === 'messages'}
        />
      )}
    </div>
  );
};

interface AccountDetailViewProps {
  accounts: AdAccount[];
  visibleAccountIds: string[];
  settings: Record<string, AccountSettings>;
  onSaveSettings: (id: string, s: AccountSettings) => void;
  dateRange: { since: string; until: string };
  setDateRange: (range: { since: string; until: string }) => void;
  isCustomDate: boolean;
  setIsCustomDate: (val: boolean) => void;
  onRefresh: () => void;
  notes: AccountNote[];
  onAddNote: (note: AccountNote) => void;
  onDeleteNote: (id: string) => void;
  clientCategories: ClientCategory[];
  isSyncing?: boolean;
}

export const AccountDetailView: React.FC<AccountDetailViewProps> = ({
  accounts,
  visibleAccountIds,
  settings,
  onSaveSettings,
  dateRange,
  setDateRange,
  isCustomDate,
  setIsCustomDate,
  onRefresh,
  notes,
  onAddNote,
  onDeleteNote,
  clientCategories,
  isSyncing = false
}) => {
  const periodKey = format(parseISO(dateRange.since), 'yyyy-MM');
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    return sessionStorage.getItem('cr_detail_selected_account');
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [adsLoading, setAdsLoading] = useState(false);
  const [ads, setAds] = useState<Ad[]>([]);
  const [sortBy, setSortBy] = useState('roas');
  const [topN, setTopN] = useState(5);
  const [observations, setObservations] = useState('');
  const [isSavingObs, setIsSavingObs] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
  const [showObservations, setShowObservations] = useState(false);
  const [showMetricConfig, setShowMetricConfig] = useState(false);
  const [selectedNoteForView, setSelectedNoteForView] = useState<AccountNote | null>(null);
  const [localVisibleMetrics, setLocalVisibleMetrics] = useState<string[]>([]);
  const [chartFilters, setChartFilters] = useState<Record<string, string[]>>({});
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [noteDate, setNoteDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const currentNow = new Date();
  const todayStr = format(currentNow, 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(currentNow, 1), 'yyyy-MM-dd');
  
  const [tempSince, setTempSince] = useState(dateRange.since);
  const [tempUntil, setTempUntil] = useState(dateRange.until);

  const [accountDailySeries, setAccountDailySeries] = useState<DailyMetric[]>([]);
  const [loadingAccountSeries, setLoadingAccountSeries] = useState<boolean>(false);
  const metricSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadAccountDailySeries = useCallback(async () => {
    if (!selectedId) return;
    setLoadingAccountSeries(true);
    try {
      const data = await fetchAccountDailyPerformance(selectedId, dateRange.since, dateRange.until);
      setAccountDailySeries(data || []);
    } catch (e) {
      console.error("Error loading account daily performance:", e);
      setAccountDailySeries([]);
    } finally {
      setLoadingAccountSeries(false);
    }
  }, [selectedId, dateRange.since, dateRange.until]);

  useEffect(() => {
    loadAccountDailySeries();
  }, [loadAccountDailySeries]);

  useEffect(() => {
    setTempSince(dateRange.since);
    setTempUntil(dateRange.until);
  }, [dateRange]);

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [showOfflineManager, setShowOfflineManager] = useState(false);
  const [offlineManagerEntityId, setOfflineManagerEntityId] = useState<string | null>(null);

  const toggleListening = () => {
    if (isListening && recognition) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta el dictado por voz.");
      return;
    }

    const newRecognition = new SpeechRecognition();
    newRecognition.lang = 'es-ES';
    newRecognition.continuous = true;
    newRecognition.interimResults = true;

    newRecognition.onstart = () => {
      setIsListening(true);
    };

    newRecognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setObservations(prev => {
          const trimmedPrev = prev.trim();
          const lastChar = trimmedPrev.slice(-1);
          const needsSpace = trimmedPrev.length > 0 && !['.', ',', '!', '?'].includes(lastChar);
          return trimmedPrev + (needsSpace ? ' ' : '') + finalTranscript;
        });
      }
    };

    newRecognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    newRecognition.onend = () => {
      setIsListening(false);
    };

    try {
      newRecognition.start();
      setRecognition(newRecognition);
    } catch (e) {
      console.error("Failed to start recognition", e);
      setIsListening(false);
    }
  };

  const defaultVisibleMetrics = ['spend', 'total_revenue', 'roas', 'purchases', 'objective', 'progress_revenue', 'progress_budget', 'ctr'];
  const messagingDefaultMetrics = ['messages', 'cpm_real', 'spend', 'total_revenue', 'roas', 'ctr'];
  const leadsDefaultMetrics = ['leads', 'cpl', 'spend', 'total_revenue', 'roas', 'ctr'];
  const allDefaultMetrics = ['messages', 'leads', 'spend', 'total_revenue', 'roas', 'ctr'];
  
  // Filter accounts for sidebar
  const sidebarAccounts = accounts.filter(acc => 
    visibleAccountIds.some(vId => vId === acc.id || vId === acc.account_id)
  ).filter(acc => {
    if (filterCategoryId === 'all') return true;
    return settings[acc.id]?.categoryId === filterCategoryId;
  }).filter(acc => 
    acc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Mantiene el cliente actual durante sincronizaciones y cambios de período.
  useEffect(() => {
    if (sidebarAccounts.length === 0) return;
    const selectedStillAvailable = selectedId
      ? sidebarAccounts.some(account => account.id === selectedId)
      : false;

    if (!selectedStillAvailable) {
      setSelectedId(sidebarAccounts[0].id);
    }
  }, [sidebarAccounts, selectedId]);

  useEffect(() => {
    if (selectedId) {
      sessionStorage.setItem('cr_detail_selected_account', selectedId);
    }
  }, [selectedId]);

  const selectedAccount = accounts.find(a => a.id === selectedId);
  const s: AccountSettings | null = selectedId
    ? (settings[selectedId] || {
        objective: 0,
        budget: 0,
        currency: selectedAccount?.currency || 'ARS',
        tracking: 'ecommerce',
      })
    : null;
  const trackingLabel = s?.tracking === 'messaging'
    ? 'Mensajería'
    : s?.tracking === 'leads'
      ? 'Clientes potenciales'
      : s?.tracking === 'both'
        ? 'Ecommerce + mensajería'
        : s?.tracking === 'all'
          ? 'Multicanal'
          : 'Ecommerce web';
  const sortLabel = ({
    roas: 'ROAS',
    messages: 'Mensajes',
    leads: 'Clientes potenciales',
    purchases: 'Compras',
    revenue: 'Facturación',
    spend: 'Inversión',
  } as Record<string, string>)[sortBy] || sortBy;

  const getDefaultMetricsForTracking = (tracking: AccountSettings['tracking']) => {
    if (tracking === 'messaging') return messagingDefaultMetrics;
    if (tracking === 'leads') return leadsDefaultMetrics;
    if (tracking === 'all' || tracking === 'both') return allDefaultMetrics;
    return defaultVisibleMetrics;
  };

  const handleTrackingChange = (tracking: AccountSettings['tracking']) => {
    if (!selectedId || !s) return;
    const nextMetrics = getDefaultMetricsForTracking(tracking);

    setLocalVisibleMetrics(nextMetrics);
    setChartFilters({});
    if (tracking === 'messaging') setSortBy('messages');
    else if (tracking === 'leads') setSortBy('leads');
    else if (tracking === 'ecommerce' && (sortBy === 'messages' || sortBy === 'leads')) setSortBy('roas');

    onSaveSettings(selectedId, {
      ...s,
      tracking,
      visibleMetrics: nextMetrics,
    });
  };

  type CreativeTrackingMode = 'ecommerce' | 'messaging' | 'leads';

  const getCreativeTrackingMode = (ad?: Ad): CreativeTrackingMode => {
    if (s?.tracking === 'messaging') return 'messaging';
    if (s?.tracking === 'leads') return 'leads';
    if (s?.tracking === 'ecommerce') return 'ecommerce';

    // Las cuentas mixtas siguen el criterio elegido para ordenar creativos.
    if (sortBy === 'messages') return 'messaging';
    if (sortBy === 'leads') return 'leads';

    // Si no hay un criterio explícito, usamos el resultado predominante del anuncio.
    if (ad && (ad.messages || 0) > 0 && (ad.purchases || 0) === 0) return 'messaging';
    if (ad && (ad.leads || 0) > 0 && (ad.purchases || 0) === 0) return 'leads';
    return 'ecommerce';
  };

  const getCreativeDefaultFilters = (ad?: Ad) => {
    const mode = getCreativeTrackingMode(ad);
    if (mode === 'messaging') return ['messages', 'costPerMessage'];
    if (mode === 'leads') return ['leads', 'costPerLead'];
    return ['purchases', 'revenue'];
  };

  // Evita reutilizar métricas de otro cliente o de otro tipo de seguimiento.
  useEffect(() => {
    setChartFilters({});
  }, [selectedId, s?.tracking, sortBy]);

  // Initialize observations when account changes
  useEffect(() => {
    if (s) {
      if (s.observations) {
        setObservations(s.observations);
      } else {
        setObservations('');
      }
    }
  }, [selectedId]); // Only run when changing account, not when settings prop updates

  // Initialize local metrics - cuando cambia la cuenta o cuando los settings llegan por primera vez
  useEffect(() => {
    if (Array.isArray(s?.visibleMetrics)) {
      setLocalVisibleMetrics(s.visibleMetrics);
    } else {
      let defaults = defaultVisibleMetrics;
      if (s?.tracking === 'leads' || sortBy === 'leads') {
        defaults = leadsDefaultMetrics;
      } else if (s?.tracking === 'messaging' || sortBy === 'messages') {
        defaults = messagingDefaultMetrics;
      } else if (s?.tracking === 'all' || s?.tracking === 'both') {
        defaults = allDefaultMetrics;
      }
      setLocalVisibleMetrics(defaults);
    }
  }, [selectedId, s?.visibleMetrics, s?.tracking, sortBy]);

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
    const originalTitle = document.title;
    const accountName = settings[selectedId!]?.customName || selectedAccount?.name || 'ADS';
    document.title = `INFORME DE RENDIMIENTOS - ${accountName.toUpperCase()}`;
    
    window.print();
    
    // Restaurar después de un pequeño delay para que el driver de impresión tome el nombre
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  const handleSaveObs = async () => {
    if (!selectedId || !s || !observations.trim()) return;
    setIsSavingObs(true);
    
    // Capture current text before clearing
    const textToSave = observations;
    
    // Create a new formal note from the observation if it has content
    // Use the selected noteDate if provided, otherwise current time
    const timestamp = noteDate ? new Date(noteDate + 'T12:00:00').toISOString() : new Date().toISOString();
    
    const newNote: AccountNote = {
      id: Math.random().toString(36).substr(2, 9),
      accountId: selectedId,
      text: textToSave,
      timestamp,
      category: 'observation',
      tags: [s.tracking]
    };
    
    onAddNote(newNote);

    // PERSISTENCIA EN BACKEND PARA REPORTE IA
    try {
      await fetch('/api/bitacora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedId,
          category: 'optimizacion',
          description: textToSave,
          date: format(parseISO(timestamp), 'dd/MM')
        })
      });
    } catch (err) {
      console.error("Error sincronizando con bitácora IA:", err);
    }
    
    // Clear local state immediately for better UX
    setObservations('');
    
    // Clear current observation in settings as it's now in history
    onSaveSettings(selectedId, { ...s, observations: '' } as any);
    
    setTimeout(() => {
      setIsSavingObs(false);
    }, 800);
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
    { id: 'revenue', label: 'Facturación Ads' },
    { id: 'manual_revenue', label: 'Ventas Offline' },
    { id: 'total_revenue', label: 'Facturación Total' },
    { id: 'roas', label: 'ROAS Real' },
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
    { id: 'leads', label: 'Clientes Potenciales (Leads)' },
    { id: 'cpl', label: 'Costo x Lead' },
    { id: 'leads_real', label: 'Leads Reales' },
    { id: 'cpl_real', label: 'Costo Lead Real' },
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

  const handleMetricDragEnd = ({ active, over }: DragEndEvent) => {
    if (!selectedId || !over || active.id === over.id) return;
    const oldIndex = visibleMetrics.indexOf(String(active.id));
    const newIndex = visibleMetrics.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(visibleMetrics, oldIndex, newIndex);
    setLocalVisibleMetrics(next);
    onSaveSettings(selectedId, { ...(s || {}), visibleMetrics: next } as any);
  };

  const toggleChartMetric = (adId: string, metric: string) => {
    setChartFilters(prev => {
      const current = prev[adId] || getCreativeDefaultFilters(ads.find(ad => ad.id === adId));
      const next = current.includes(metric)
        ? current.filter(m => m !== metric)
        : [...current, metric];
      return { ...prev, [adId]: next };
    });
  };

  const renderMetric = (id: string, acc: AdAccount) => {
    const sAcc = settings[acc.id];
    let manualRevenue = 0;
    if (sAcc?.offlineSalesLogByMonth) {
      const allEntries: any[] = [];
      Object.values(sAcc.offlineSalesLogByMonth).forEach((list: any) => {
        if (Array.isArray(list)) {
          allEntries.push(...list);
        }
      });
      if (allEntries.length > 0) {
        const filteredEntries = allEntries.filter(entry => entry.date >= dateRange.since && entry.date <= dateRange.until);
        manualRevenue = filteredEntries.reduce((sum, entry) => sum + entry.amount, 0);
      } else {
        manualRevenue = sAcc?.manualRevenueByMonth?.[periodKey] || 0;
      }
    } else {
      manualRevenue = sAcc?.manualRevenueByMonth?.[periodKey] || 0;
    }
    const totalRevenue = (acc.revenue || 0) + manualRevenue;
    
    switch(id) {
      case 'spend': return <MetricBox key={id} label="Inversión" value={formatCurrency(acc.spend || 0, acc.currency)} />;
      case 'revenue': return <MetricBox key={id} label="Facturación Ads" value={formatCurrency(acc.revenue || 0, acc.currency)} />;
      case 'manual_revenue': return (
        <div 
          key={id} 
          onClick={() => {
            setOfflineManagerEntityId(acc.id);
            setShowOfflineManager(true);
          }}
          className="p-3 rounded-xl border border-white/5 bg-[#111] hover:bg-[#141414] transition-all shadow-lg group overflow-hidden cursor-pointer print:bg-white print:border-neutral-100 print:shadow-none print:border-b-2"
        >
          <div className="metric-card-heading flex items-center justify-between mb-1.5">
            <div className="text-[8px] font-black text-neutral-700 uppercase tracking-widest group-hover:text-neutral-500 transition-colors print:text-neutral-400">Ventas Offline ({periodKey})</div>
            <History className="w-2.5 h-2.5 text-blue-500 opacity-30 group-hover:opacity-100 transition-opacity print:hidden" />
          </div>
          <div className="flex items-center justify-between text-white print:text-black">
            <span className="text-sm md:text-base font-black tracking-tight">{formatCurrency(manualRevenue, acc.currency)}</span>
            <span className="text-[7px] font-black uppercase text-blue-500 opacity-40 group-hover:opacity-100 transition-opacity print:hidden">Ver Bitácora</span>
          </div>
        </div>
      );
      case 'total_revenue': return <MetricBox key={id} label="Facturación Total" value={formatCurrency(totalRevenue, acc.currency)} variant="highlight" />;
      case 'roas': return <MetricBox key={id} label="ROAS Real" value={`×${formatDecimal(totalRevenue / (acc.spend || 1))}`} variant="highlight" />;
      case 'objective': return <MetricBox key={id} label="Objetivo" value={formatCurrency(sAcc?.objective || 0, acc.currency)} isPlaceholder={!sAcc?.objective} />;
      case 'progress_revenue': return <MetricBox key={id} label="% Objetivo" value={`${sAcc?.objective ? Math.round((totalRevenue / sAcc.objective) * 100) : 0}%`} isPlaceholder={!sAcc?.objective} />;
      case 'progress_budget': return <MetricBox key={id} label="% Presupuesto" value={`${sAcc?.budget ? Math.round(((acc.spend || 0) / sAcc.budget) * 100) : 0}%`} isPlaceholder={!sAcc?.budget} />;
      case 'ctr': return <MetricBox key={id} label="CTR" value={`${formatDecimal(acc.ctr, 2)}%`} />;
      case 'clicks': return <MetricBox key={id} label="Clics" value={formatDecimal(acc.clicks, 0)} />;
      case 'purchases': return <MetricBox key={id} label="Compras" value={formatDecimal(acc.purchases, 0)} />;
      case 'atc': return <MetricBox key={id} label="Agreg. carrito" value={formatDecimal(acc.addToCart, 0)} />;
      case 'ic': return <MetricBox key={id} label="Pagos iniciados" value={formatDecimal(acc.checkouts, 0)} />;
      case 'cpp': return <MetricBox key={id} label="Costo x compra" value={formatCurrency(acc.costPerPurchase || 0, acc.currency)} />;
      case 'messages': return <MetricBox key={id} label="Mensajes" value={formatDecimal(acc.messagesReal || acc.messages, 0)} />;
      case 'cpm': return <MetricBox key={id} label="Costo x Mensaje" value={formatCurrency(acc.costPerMessage || 0, acc.currency)} />;
      case 'messages_real': return <MetricBox key={id} label="Mensajes Reales" value={formatDecimal(acc.messagesReal, 0)} />;
      case 'cpm_real': return <MetricBox key={id} label="Costo Mensaje Real" value={formatCurrency(acc.costPerMessageReal || 0, acc.currency)} />;
      case 'leads': return <MetricBox key={id} label="Clientes Potenciales" value={formatDecimal(acc.leadsReal || acc.leads, 0)} />;
      case 'cpl': return <MetricBox key={id} label="Costo x Lead" value={formatCurrency(acc.costPerLead || 0, acc.currency)} />;
      case 'leads_real': return <MetricBox key={id} label="Leads Reales" value={formatDecimal(acc.leadsReal, 0)} />;
      case 'cpl_real': return <MetricBox key={id} label="Costo Lead Real" value={formatCurrency(acc.costPerLeadReal || acc.costPerLead || 0, acc.currency)} />;
      default: return null;
    }
  };

  const CreativePrintChart: React.FC<{
    data: Array<Record<string, any>>;
    mode: CreativeTrackingMode;
  }> = ({ data, mode }) => {
    const primaryKey = mode === 'messaging' ? 'messages' : mode === 'leads' ? 'leads' : 'purchases';
    const secondaryKey = mode === 'messaging' ? 'costPerMessage' : mode === 'leads' ? 'costPerLead' : 'revenue';
    const primaryLabel = mode === 'messaging' ? 'Mensajes' : mode === 'leads' ? 'Leads' : 'Compras';
    const secondaryLabel = mode === 'messaging' ? 'Costo por mensaje' : mode === 'leads' ? 'Costo por lead' : 'Facturación';
    const width = 640;
    const height = 92;
    const horizontalPadding = 10;
    const verticalPadding = 10;

    const toPoints = (key: string) => {
      const values = data.map(item => Number(item[key]) || 0);
      const max = Math.max(...values, 1);

      return values.map((value, index) => {
        const x = values.length === 1
          ? width / 2
          : horizontalPadding + (index / (values.length - 1)) * (width - horizontalPadding * 2);
        const y = values.length === 1
          ? height / 2
          : height - verticalPadding - (value / max) * (height - verticalPadding * 2);
        return { x, y };
      });
    };

    if (data.length === 0) {
      return (
        <div className="creative-print-chart hidden print:flex">
          <strong>Sin evolución diaria disponible</strong>
          <span>El anuncio conserva sus métricas acumuladas.</span>
        </div>
      );
    }

    const primaryPoints = toPoints(primaryKey);
    const secondaryPoints = toPoints(secondaryKey);
    const primaryPolyline = primaryPoints.map(point => `${point.x},${point.y}`).join(' ');
    const secondaryPolyline = secondaryPoints.map(point => `${point.x},${point.y}`).join(' ');
    const areaPoints = `${horizontalPadding},${height - verticalPadding} ${primaryPolyline} ${width - horizontalPadding},${height - verticalPadding}`;

    return (
      <div className="creative-print-chart hidden print:flex">
        <div className="creative-print-chart-header">
          <strong>Evolución diaria</strong>
          <div className="creative-print-chart-legend">
            <span><i className="creative-print-primary-dot" />{primaryLabel}</span>
            <span><i className="creative-print-secondary-line" />{secondaryLabel}</span>
          </div>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${primaryLabel} y ${secondaryLabel} por día`}>
          {[0.25, 0.5, 0.75].map(position => (
            <line
              key={position}
              x1={horizontalPadding}
              x2={width - horizontalPadding}
              y1={height * position}
              y2={height * position}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          ))}
          <polygon points={areaPoints} fill="#dbeafe" opacity="0.72" />
          <polyline points={primaryPolyline} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={secondaryPolyline} fill="none" stroke="#7dd3fc" strokeWidth="2" strokeDasharray="7 5" strokeLinejoin="round" strokeLinecap="round" />
          {primaryPoints.map((point, index) => (
            <circle key={index} cx={point.x} cy={point.y} r="3" fill="#3b82f6" />
          ))}
        </svg>
        <div className="creative-print-chart-dates">
          <span>{data[0]?.formattedDate}</span>
          <span>{data[data.length - 1]?.formattedDate}</span>
        </div>
      </div>
    );
  };

  const AdCard: React.FC<{ ad: Ad; rank: number }> = ({ ad, rank }) => {
    const trackingMode = getCreativeTrackingMode(ad);
    const isLeads = trackingMode === 'leads';
    const isMessaging = trackingMode === 'messaging';
    const defaultFilters = getCreativeDefaultFilters(ad);

    const filters = chartFilters[ad.id] || defaultFilters;
    
    const showSales = filters.includes('purchases');
    const showRevenue = filters.includes('revenue');
    const showMessages = filters.includes('messages');
    const showCostPerMessage = filters.includes('costPerMessage');
    const showLeads = filters.includes('leads');
    const showCostPerLead = filters.includes('costPerLead');

    const chartData = completeDailySeriesForRange(
      ad.dailySeries?.filter(d => d.date >= dateRange.since && d.date <= dateRange.until),
      dateRange.since,
      dateRange.until
    ).map(d => ({
      ...d,
      costPerMessage: d.messages && d.messages > 0 ? d.spend / d.messages : 0,
      costPerLead: d.leads && d.leads > 0 ? d.spend / d.leads : 0,
      formattedDate: format(parseISO(d.date), 'dd/MM', { locale: es })
    })) || [];

    const stats = isLeads ? [
      { label: 'Leads', value: (ad.leads || 0).toString(), color: 'text-blue-400' },
      { label: 'Costo x Lead', value: formatCurrency(ad.leads && ad.leads > 0 ? ad.spend / ad.leads : (ad.costPerLead || 0), selectedAccount?.currency || 'ARS'), color: 'text-sky-300' },
      { label: 'CTR', value: `${ad.ctr.toFixed(2)}%` },
      { label: 'Inversión', value: formatCurrency(ad.spend, selectedAccount?.currency || 'ARS') },
      { label: 'Clics', value: (ad.clicks || 0).toString() },
      { label: 'CPC', value: formatCurrency(ad.clicks && ad.clicks > 0 ? ad.spend / ad.clicks : 0, selectedAccount?.currency || 'ARS') }
    ] : isMessaging ? [
      { label: 'Mensajes', value: (ad.messages || 0).toString(), color: 'text-blue-400' },
      { label: 'Costo x Mensaje', value: formatCurrency(ad.messages && ad.messages > 0 ? ad.spend / ad.messages : 0, selectedAccount?.currency || 'ARS'), color: 'text-sky-300' },
      { label: 'CTR', value: `${ad.ctr.toFixed(2)}%` },
      { label: 'Inversión', value: formatCurrency(ad.spend, selectedAccount?.currency || 'ARS') },
      { label: 'Clics', value: (ad.clicks || 0).toString() },
      { label: 'CPC', value: formatCurrency(ad.clicks && ad.clicks > 0 ? ad.spend / ad.clicks : 0, selectedAccount?.currency || 'ARS') }
    ] : [
      { label: 'ROAS', value: `×${ad.roas.toFixed(2)}`, color: 'text-blue-400 print:text-blue-600' },
      { label: 'CTR', value: `${ad.ctr.toFixed(2)}%` },
      { label: 'Inversión', value: formatCurrency(ad.spend, selectedAccount?.currency || 'ARS') },
      { label: 'Ventas', value: ad.purchases.toString() },
      { label: 'Facturación', value: formatCurrency(ad.revenue, selectedAccount?.currency || 'ARS') },
      { label: 'Costo x Venta', value: formatCurrency(ad.purchases > 0 ? ad.spend / ad.purchases : 0, selectedAccount?.currency || 'ARS') }
    ];

    return (
      <div className="bg-[#111] rounded-xl border border-white/5 p-4 hover:bg-[#131313] transition-all shadow-xl group/card relative overflow-hidden ad-card-print print:bg-white print:border-neutral-100 print:shadow-none print:break-inside-avoid">
         <div className="print-rank hidden print:block absolute top-1 right-2 text-[8px] font-black text-neutral-400 uppercase tracking-tighter">Creativo destacado #{rank}</div>
        <div className="ad-card-print-layout grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 items-center print:items-center">
          <div className="ad-card-print-media md:col-span-1 xl:col-span-2 print:shrink-0">
             <div className="bg-[#050505] rounded-xl overflow-hidden aspect-[4/5] border border-white/10 relative shadow-2xl print:border-neutral-200 print:w-24 print:h-32 print:aspect-auto">
                <div className="absolute top-2 left-2 z-20 px-2 py-0.5 bg-black/95 backdrop-blur-md rounded-md text-[8px] font-black text-white uppercase tracking-widest border border-white/10 print:hidden">
                   #{rank}
                </div>
                {ad.thumbnail ? (
                  <img 
                    src={ad.thumbnail} 
                    alt={ad.name} 
                    data-original={ad.originalThumbnailUrl || ad.thumbnail}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110" 
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (!img.getAttribute('data-retried') && ad.originalThumbnailUrl && ad.originalThumbnailUrl !== ad.thumbnail) {
                        img.setAttribute('data-retried', 'true');
                        img.src = ad.originalThumbnailUrl;
                      } else {
                        img.style.display = 'none';
                        const placeholder = img.parentElement?.querySelector('.ad-placeholder');
                        if (placeholder) placeholder.classList.remove('hidden');
                      }
                    }}
                    style={{ 
                      WebkitFontSmoothing: 'antialiased',
                      imageRendering: 'auto'
                    }}
                  />
                ) : null}
                <div className={`ad-placeholder absolute inset-0 z-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 gap-2 ${ad.thumbnail ? 'hidden' : ''}`}>
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <ImageOff className="w-4 h-4 text-slate-400" strokeWidth={2} />
                  </div>
                  <span className="text-[8px] uppercase font-black tracking-widest text-slate-400">Sin Previsualización</span>
                </div>
             </div>
          </div>

          <div className="ad-card-print-info md:col-span-1 xl:col-span-3 flex flex-col gap-4 print:gap-2">
             <div className="space-y-0.5">
                <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest whitespace-nowrap overflow-hidden text-ellipsis print:text-black print:whitespace-pre-wrap print:text-[8.5px] print:leading-tight print:font-bold" title={ad.name}>
                  {ad.name}
                </div>
             </div>

             <div className="grid grid-cols-3 gap-1.5 print:grid-cols-2 print:gap-2 print:mt-1">
                {stats.map(stat => (
                  <div key={stat.label} className="bg-black/30 px-2 py-2 rounded-lg border border-white/5 flex flex-col items-center justify-center text-center print:bg-neutral-50/50 print:border-neutral-100 print:py-1.5 print:px-2 print:rounded-xl">
                    <div className="text-[7px] font-black text-neutral-700 uppercase tracking-widest mb-0.5 print:text-neutral-500 print:text-[5.5px] print:leading-tight print:whitespace-normal">{stat.label}</div>
                    <div className={`text-[10px] font-black tracking-tight ${stat.color || 'text-neutral-300'} truncate w-full print:text-black print:text-[8px] print:truncate-none print:whitespace-nowrap print:leading-none`}>{stat.value}</div>
                  </div>
                ))}
             </div>
          </div>

          <div className="ad-card-print-chart xl:col-span-5 relative bg-black/50 rounded-lg p-3 border border-white/5 h-36 flex flex-col print:h-24 print:p-0 print:bg-transparent print:border print:border-neutral-200 print:rounded-lg print:overflow-hidden">
            <div className="creative-chart-interactive flex h-full flex-col print:hidden">
             <div className="flex items-center justify-between mb-1.5 px-0.5">
               <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">
                 {isLeads ? 'Clientes Potenciales y Mensajes' : isMessaging ? 'Mensajes a lo largo del tiempo' : 'Compras a lo largo del tiempo'}
               </span>
             </div>
             <div className="flex flex-wrap items-center gap-2 mb-2 shrink-0 print:gap-4 print:my-2 print:justify-start print:pl-3">
                {isLeads && (
                  <>
                    <LegendButton 
                      active={showLeads} 
                      color="#60a5fa"
                      label="Leads"
                      onClick={() => toggleChartMetric(ad.id, 'leads')}
                    />
                    <LegendButton 
                      active={showCostPerLead} 
                      color="#bae6fd"
                      label="Costo/Lead"
                      onClick={() => toggleChartMetric(ad.id, 'costPerLead')}
                    />
                  </>
                )}
                {isMessaging && (
                  <>
                    <LegendButton 
                      active={showMessages} 
                      color="#60a5fa"
                      label="Mensajes"
                      onClick={() => toggleChartMetric(ad.id, 'messages')}
                    />
                    <LegendButton 
                      active={showCostPerMessage} 
                      color="#bae6fd"
                      label="Costo/Mensaje"
                      onClick={() => toggleChartMetric(ad.id, 'costPerMessage')}
                    />
                  </>
                )}
                {!isMessaging && !isLeads && (
                  <>
                    <LegendButton 
                      active={showSales} 
                      color="#3b82f6" 
                      label="Ventas" 
                      onClick={() => toggleChartMetric(ad.id, 'purchases')}
                    />
                    <LegendButton 
                      active={showRevenue} 
                      color="#93c5fd"
                      label="Facturación"
                      onClick={() => toggleChartMetric(ad.id, 'revenue')}
                    />
                  </>
                )}
             </div>

             <div className="flex-1 w-full min-h-0 print:pr-4 print:pb-2">
               {chartData.length === 0 ? (
                 <div className="h-full min-h-14 flex items-center justify-center rounded-md border border-dashed border-white/10 bg-white/[0.02] px-3 text-center text-[9px] font-semibold text-neutral-500 print:text-neutral-400">
                   Sin serie diaria para este creativo en el período seleccionado
                 </div>
               ) : (
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`gP-${ad.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id={`gR-${ad.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#93c5fd" stopOpacity={0.12}/>
                        <stop offset="100%" stopColor="#93c5fd" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id={`gM-${ad.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.14}/>
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id={`gCPM-${ad.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#bae6fd" stopOpacity={0.1}/>
                        <stop offset="100%" stopColor="#bae6fd" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id={`gL-${ad.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.15}/>
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id={`gCPL-${ad.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#bae6fd" stopOpacity={0.1}/>
                        <stop offset="100%" stopColor="#bae6fd" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="formattedDate" 
                      hide={false}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                      minTickGap={28}
                      tick={{ fontSize: 6, fontWeight: 'bold', fill: '#999' }}
                      className="print:block"
                    />
                    <YAxis yAxisId="left" hide />
                    <YAxis yAxisId="right" hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '8px', padding: '6px', color: '#000' }}
                      itemStyle={{ fontSize: '8px', fontWeight: 'bold' }}
                      labelStyle={{ fontSize: '7px', color: '#666' }}
                    />
                    {/* Ejes para escalas distintas */}
                    {showRevenue && (
                      <Area type="monotone" dataKey="revenue" yAxisId="right" stroke="#93c5fd" strokeWidth={1.25} fill={`url(#gR-${ad.id})`} dot={chartData.length === 1 ? { r: 2 } : false} strokeDasharray="2 2" strokeOpacity={0.7} />
                    )}
                    {showSales && (
                      <Area type="monotone" dataKey="purchases" yAxisId="left" stroke="#3b82f6" strokeWidth={1.5} fill={`url(#gP-${ad.id})`} dot={chartData.length === 1 ? { r: 2 } : false} />
                    )}
                    {showLeads && (
                      <Area type="monotone" dataKey="leads" yAxisId="left" stroke="#60a5fa" strokeWidth={2} fill={`url(#gL-${ad.id})`} dot={chartData.length === 1 ? { r: 2 } : false} />
                    )}
                    {showCostPerLead && (
                      <Area type="monotone" dataKey="costPerLead" yAxisId="right" stroke="#bae6fd" strokeWidth={1} dot={chartData.length === 1 ? { r: 2 } : false} fill={`url(#gCPL-${ad.id})`} strokeDasharray="3 2" />
                    )}
                    {showMessages && (
                      <Area type="monotone" dataKey="messages" yAxisId="left" stroke="#60a5fa" strokeWidth={1.75} fill={`url(#gM-${ad.id})`} dot={chartData.length === 1 ? { r: 2 } : false} />
                    )}
                    {showCostPerMessage && (
                      <Area type="monotone" dataKey="costPerMessage" yAxisId="right" stroke="#bae6fd" strokeWidth={1} dot={chartData.length === 1 ? { r: 2 } : false} fill={`url(#gCPM-${ad.id})`} strokeDasharray="3 2" />
                    )}
                  </AreaChart>
               </ResponsiveContainer>
               )}
             </div>
            </div>
            <CreativePrintChart data={chartData} mode={trackingMode} />
          </div>

          <div className="ad-card-print-link xl:col-span-2 flex flex-col items-center pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-white/5 md:pl-4 mt-2 md:mt-0 print:flex print:items-center print:justify-center print:border-none relative print:shrink-0">
            <a 
              href={ad.previewUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className={`flex flex-col items-center gap-1 group/link transition-all ${!ad.previewUrl ? 'pointer-events-none opacity-20' : 'cursor-pointer'} print:opacity-100 print:bg-blue-600 print:px-2 print:py-2.5 print:rounded-lg print:shadow-md print:block print:w-full print:text-center print:cursor-pointer print:relative print:z-50 print:leading-none`}
              id={`ad-link-${ad.id}`}
            >
              <div className="flex flex-col items-center gap-1 print:hidden">
                <ArrowUpRight className="w-4 h-4 text-neutral-600 group-hover/link:text-white" />
                <span className="text-[8px] font-black text-neutral-700 uppercase tracking-widest group-hover/link:text-neutral-400 whitespace-nowrap">Ver anuncio</span>
              </div>
              
              <div className="hidden print:flex flex-col items-center justify-center h-full">
                 <span className="text-white text-[7px] font-black whitespace-nowrap mb-0.5">
                   Ver anuncio
                 </span>
                 <span className="text-white/80 text-[6px] font-bold whitespace-nowrap border-t border-white/20 pt-0.5 mt-0.5">
                   Abrir en Meta
                 </span>
              </div>
            </a>
          </div>
        </div>
      </div>
    );
  };

  const MonthBitacoraTimeline: React.FC<{
    accountId: string;
    notes: AccountNote[];
    observations?: string;
    accountName?: string;
  }> = ({ accountId, notes, observations, accountName }) => {
    const now = new Date();
    const currentMonthYearTitle = format(now, "MMMM 'de' yyyy", { locale: es }).toUpperCase();
    const currentMonthShort = format(now, "MMMM yyyy", { locale: es });

    const currentMonthNotes = React.useMemo(() => {
      return notes.filter(n => {
        if (n.accountId !== accountId) return false;
        try {
          const d = parseISO(n.timestamp);
          return isSameMonth(d, now) && isSameYear(d, now);
        } catch {
          return false;
        }
      }).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }, [notes, accountId, now]);

    const hasNotes = currentMonthNotes.length > 0;
    const hasObs = Boolean(observations && observations.trim().length > 0);

    return (
      <div className={cn(
        "print-timeline-section space-y-4 print:my-4",
        !hasNotes && !hasObs && "print-timeline-empty"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 print:border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0 print:bg-blue-50 print:border-blue-200 print:text-blue-600">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-widest print:text-neutral-900 print:text-sm">
                Bitácora de cambios y acciones
              </h3>
            </div>
          </div>
        </div>

        {/* Timeline container */}
        <div className="bg-[#111] rounded-2xl border border-white/5 p-5 print:bg-white print:border-neutral-200 print:p-4 print:rounded-xl relative">
          {!hasNotes && !hasObs ? (
            <div className="py-6 text-center">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest print:text-neutral-600">
                Sin observaciones ni hitos registrados en la bitácora para el mes en curso ({currentMonthShort})
              </p>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-5 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-purple-500 before:to-blue-500/20 print:before:bg-blue-300">
              {/* General observations block if present */}
              {hasObs && (
                <div className="relative group">
                  <div className="absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black shadow-md border-2 border-[#111] print:border-white print:bg-blue-600">
                    ★
                  </div>
                  
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 print:bg-neutral-50 print:border-neutral-200 print:shadow-sm">
                    <div className="flex items-center justify-between mb-1.5 border-b border-white/5 pb-1 print:border-neutral-200">
                      <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 print:text-blue-700 flex items-center gap-1.5">
                        <FileText className="w-3 h-3" /> Observaciones y Hoja de Ruta
                      </span>
                      <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-wider print:text-neutral-500">
                        Resumen del Mes ({currentMonthShort})
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed font-medium whitespace-pre-wrap print:text-neutral-800 print:text-[10px]">
                      {observations}
                    </p>
                  </div>
                </div>
              )}

              {/* Individual logged notes for current month */}
              {currentMonthNotes.map((note, index) => {
                let noteDate = now;
                try {
                  noteDate = parseISO(note.timestamp);
                } catch {
                  noteDate = now;
                }
                const formattedDateStr = format(noteDate, "dd 'de' MMMM", { locale: es });
                const formattedTimeStr = format(noteDate, "HH:mm");

                let categoryBadge = "bg-blue-500/10 text-blue-400 border-blue-500/20 print:bg-blue-50 print:text-blue-700 print:border-blue-200";
                let categoryLabel = "Optimización";

                if (note.category === 'change') {
                  categoryBadge = "bg-purple-500/10 text-purple-400 border-purple-500/20 print:bg-purple-50 print:text-purple-700 print:border-purple-200";
                  categoryLabel = "Ajuste de Pauta";
                } else if (note.category === 'meeting') {
                  categoryBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 print:bg-emerald-50 print:text-emerald-700 print:border-emerald-200";
                  categoryLabel = "Reunión";
                } else if (note.category === 'urgent') {
                  categoryBadge = "bg-red-500/10 text-red-400 border-red-500/20 print:bg-red-50 print:text-red-700 print:border-red-200";
                  categoryLabel = "Aviso Clave";
                }

                return (
                  <div key={note.id || index} className="relative group">
                    <div className="absolute -left-6 sm:-left-8 top-1 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-black shadow-[0_0_8px_rgba(59,130,246,0.5)] border-2 border-[#111] print:border-white print:bg-blue-500 print:shadow-none">
                      {index + 1}
                    </div>

                    <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 hover:border-white/10 transition-all print:bg-neutral-50 print:border-neutral-200 print:shadow-sm">
                      <div className="flex items-center justify-between mb-1.5 border-b border-white/5 pb-1 print:border-neutral-200">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-white tracking-wider uppercase print:text-neutral-900">
                            {formattedDateStr}
                          </span>
                          <span className="text-[8px] font-bold text-neutral-500 uppercase print:text-neutral-400">
                            {formattedTimeStr} hs
                          </span>
                        </div>
                        <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border", categoryBadge)}>
                          {categoryLabel}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-300 leading-relaxed font-medium whitespace-pre-wrap print:text-neutral-800 print:text-[10px]">
                        {note.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="account-detail-print-root space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-white/[0.07] bg-[#12161d] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Filter className="mx-2 h-3.5 w-3.5 shrink-0 text-neutral-600" />
          {[
            { id: 'all', label: 'Todos' },
            ...clientCategories.map(cat => ({ id: cat.id, label: cat.name }))
          ].map(btn => (
            <button
              type="button"
              key={btn.id}
              onClick={() => setFilterCategoryId(btn.id)}
              aria-pressed={filterCategoryId === btn.id}
              className={cn(
                "whitespace-nowrap rounded-md px-2.5 py-1.5 text-[10px] font-medium transition-colors",
                filterCategoryId === btn.id
                  ? "bg-blue-500/12 text-blue-300"
                  : "text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-300"
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
            {/* New Date Picker in Detail View (Minimalist) */}
            <div className="flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.07] bg-[#12161d] px-3 transition-colors">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              <select 
                value={isCustomDate ? 'custom' : (
                  dateRange.since === todayStr && dateRange.until === todayStr ? 'today' : (
                    dateRange.since === yesterdayStr && dateRange.until === yesterdayStr ? 'yesterday' : (
                      dateRange.since === format(startOfMonth(new Date()), 'yyyy-MM-dd') && dateRange.until === format(new Date(), 'yyyy-MM-dd') ? 'this_month' : (
                        dateRange.since === format(subDays(new Date(), 7), 'yyyy-MM-dd') ? 'last_7' : (
                          dateRange.since === format(subDays(new Date(), 30), 'yyyy-MM-dd') ? 'last_30' : 'custom'
                        )
                      )
                    )
                  )
                )}
                onChange={(e) => {
                  const val = e.target.value;
                  const currentNow = new Date();
                  if (val === 'custom') {
                    setIsCustomDate(true);
                    setTempSince(dateRange.since);
                    setTempUntil(dateRange.until);
                  } else {
                    setIsCustomDate(false);
                    if (val === 'today') {
                      setDateRange({ since: todayStr, until: todayStr });
                    } else if (val === 'yesterday') {
                      setDateRange({ since: yesterdayStr, until: yesterdayStr });
                    } else if (val === 'this_month') {
                      setDateRange({ since: format(startOfMonth(currentNow), 'yyyy-MM-dd'), until: format(currentNow, 'yyyy-MM-dd') });
                    } else if (val === 'last_7') {
                      setDateRange({ since: format(subDays(currentNow, 7), 'yyyy-MM-dd'), until: format(currentNow, 'yyyy-MM-dd') });
                    } else if (val === 'last_30') {
                      setDateRange({ since: format(subDays(currentNow, 30), 'yyyy-MM-dd'), until: format(currentNow, 'yyyy-MM-dd') });
                    }
                  }
                }}
                className="cursor-pointer border-none bg-transparent py-0.5 pr-1 text-xs font-medium text-neutral-300 outline-none focus:text-white"
              >
                <option value="today" className="bg-[#121212] text-neutral-200 font-bold uppercase">Hoy</option>
                <option value="yesterday" className="bg-[#121212] text-neutral-200 font-bold uppercase">Ayer</option>
                <option value="this_month" className="bg-[#121212] text-neutral-200 font-bold uppercase">Este mes</option>
                <option value="last_7" className="bg-[#121212] text-neutral-200 font-bold uppercase">Últimos 7 días</option>
                <option value="last_30" className="bg-[#121212] text-neutral-200 font-bold uppercase">Últimos 30 días</option>
                <option value="custom" className="bg-[#121212] text-neutral-200 font-bold uppercase">Personalizado</option>
              </select>

              {isCustomDate && (
                <div className="flex items-center gap-1.5 pl-1.5 border-l border-white/5 animate-in slide-in-from-right-1 duration-300">
                  <input 
                    type="date" 
                    value={tempSince}
                    onChange={(e) => setTempSince(e.target.value)}
                    className="bg-transparent text-[10px] font-bold text-neutral-300 outline-none w-[95px] py-0.5"
                  />
                  <span className="text-[10px] text-neutral-600 font-bold uppercase">a</span>
                  <input 
                    type="date" 
                    value={tempUntil}
                    onChange={(e) => setTempUntil(e.target.value)}
                    className="bg-transparent text-[10px] font-bold text-neutral-300 outline-none w-[95px] py-0.5"
                  />
                  <button
                    onClick={() => {
                      setDateRange({ since: tempSince, until: tempUntil });
                    }}
                    className="bg-blue-600/25 hover:bg-blue-600/40 text-blue-400 border border-blue-500/10 text-[10px] font-black px-2 py-0.5 rounded transition-all uppercase tracking-wider"
                  >
                    Aplicar
                  </button>
                </div>
              )}
            </div>

            <button 
             onClick={handlePrint}
             className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.07] bg-[#12161d] px-3 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/[0.05] hover:text-white"
           >
             <ArrowUpRight className="w-3.5 h-3.5 rotate-180" />
             Exportar PDF
           </button>
        </div>
      </div>

      <div className="relative flex h-[calc(100vh-200px)] gap-3 bg-transparent print:h-auto">
        {/* Sidebar - Accounts List - Horizontal Expandable */}
        <motion.div 
          initial={false}
          animate={{ 
            width: isSidebarExpanded ? 280 : 48,
          }}
          className="group/sidebar z-30 flex flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-[#12161d] print:hidden"
        >
          <div className="space-y-3 border-b border-white/[0.07] p-3">
            <div className={cn("flex items-center justify-between overflow-hidden whitespace-nowrap", !isSidebarExpanded && "justify-center")}>
               <div className={cn("flex items-center gap-3", !isSidebarExpanded && "hidden")}>
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-500/10">
                     <LayoutGrid className="h-3 w-3 text-blue-300" />
                 </div>
                 <motion.h3 
                   animate={{ opacity: isSidebarExpanded ? 1 : 0 }}
                    className="text-xs font-medium text-neutral-300"
                  >
                    Clientes
                  </motion.h3>
               </div>
               <button
                 type="button"
                 onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                 className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-white/[0.05] hover:text-neutral-300"
                 title={isSidebarExpanded ? 'Contraer clientes' : 'Expandir clientes'}
               >
                 <ChevronUp className={cn('h-3.5 w-3.5 transition-transform', isSidebarExpanded ? '-rotate-90' : 'rotate-90')} />
               </button>
            </div>

            {/* Embedded Search */}
            <div className="relative h-8 flex items-center">
              <motion.div
                animate={{ 
                  left: isSidebarExpanded ? 12 : "50%",
                  x: isSidebarExpanded ? 0 : "-50%"
                }}
                className="absolute top-1/2 -translate-y-1/2 z-10 pointer-events-none"
              >
                <Search className={cn(
                  "w-3.5 h-3.5 transition-colors",
                  (searchTerm || isSidebarExpanded) ? "text-blue-500" : "text-neutral-600"
                )} />
              </motion.div>
              <motion.input 
                animate={{ 
                  opacity: isSidebarExpanded ? 1 : 0,
                  pointerEvents: isSidebarExpanded ? 'auto' : 'none'
                }}
                type="text" 
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-full w-full rounded-lg border border-white/[0.07] bg-black/20 py-1.5 pl-10 pr-3 text-[10px] font-medium text-white outline-none transition-colors placeholder:text-neutral-700 focus:border-blue-400/30"
              />
            </div>
          </div>
          
          <div className="custom-scrollbar flex-1 space-y-1 overflow-x-hidden overflow-y-auto p-1.5">
            {sidebarAccounts.map(acc => {
              const isActive = selectedId === acc.id;
              const customName = settings[acc.id]?.customName || acc.name;
              
              return (
                <button
                  key={acc.id}
                  onClick={() => setSelectedId(acc.id)}
                  className={cn(
                    "w-full text-left p-2.5 rounded-lg transition-all relative group flex items-center overflow-hidden h-10 shrink-0",
                    isActive 
                      ? 'bg-blue-500/10 border border-blue-400/15 text-white'
                      : 'hover:bg-white/[0.02] border border-transparent text-neutral-500'
                  )}
                >
                  <div className="flex items-center gap-3 shrink-0">
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", acc.account_status === 1 ? 'bg-success/50' : 'bg-neutral-800')} />
                    
                    <motion.div 
                      animate={{ opacity: isSidebarExpanded ? 1 : 0, x: isSidebarExpanded ? 0 : -10 }}
                      className="flex items-center justify-between gap-2 grow overflow-hidden whitespace-nowrap"
                      style={{ width: isSidebarExpanded ? 'auto' : 0 }}
                    >
                      <span className="max-w-[168px] truncate text-[11px] font-medium tracking-tight">{customName}</span>
                    </motion.div>
                  </div>
                  {isActive && <div className="absolute right-0 w-0.5 h-3 bg-blue-500 rounded-l-full" />}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Dashboard Area */}
        {selectedAccount ? (
            <div className="account-detail-print-content custom-scrollbar flex-1 animate-in space-y-4 overflow-y-auto pr-2 fade-in duration-500 print:overflow-visible print:pr-0">
            <section className="report-print-cover hidden print:flex">
              <div className="report-print-title-block">
                <p className="report-print-eyebrow">Orion Metrics</p>
                <h1>Informe de rendimientos</h1>
                <p className="report-print-channel">Meta Ads</p>
              </div>
              <div className="report-print-client">
                <div className="report-print-logo">
                  {settings[selectedAccount.id]?.customLogo ? (
                    <img
                      src={settings[selectedAccount.id]?.customLogo}
                      alt="Logo del cliente"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <BarChart2 className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <span>Cuenta publicitaria</span>
                  <p className="report-print-account">{settings[selectedAccount.id]?.customName || selectedAccount.name}</p>
                </div>
              </div>
              <div className="report-print-meta">
                <div>
                  <span>Periodo analizado</span>
                  <strong>{format(parseISO(dateRange.since), 'dd/MM/yyyy')} - {format(parseISO(dateRange.until), 'dd/MM/yyyy')}</strong>
                </div>
                <div>
                  <span>Tipo de cuenta</span>
                  <strong>{trackingLabel}</strong>
                </div>
                <div>
                  <span>Moneda</span>
                  <strong>{selectedAccount.currency}</strong>
                </div>
                <div>
                  <span>Fecha de emisión</span>
                  <strong>{format(new Date(), 'dd/MM/yyyy', { locale: es })}</strong>
                </div>
              </div>
            </section>

            {/* Account Info Header */}
            <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-[#12161d] px-4 py-3 print:hidden">
              <div className="flex min-w-0 items-center gap-3">
                 <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${selectedAccount.account_status === 1 ? 'bg-success' : 'bg-neutral-700'} print:hidden`} />
                 <div className="min-w-0">
                   <h2 className="truncate text-lg font-semibold tracking-[-0.02em] text-white print:text-2xl print:text-black">{settings[selectedAccount.id]?.customName || selectedAccount.name}</h2>
                   <p className="mt-0.5 text-[10px] text-neutral-500">{trackingLabel} · {selectedAccount.currency}</p>
                 </div>
              </div>
              <div className="flex items-center gap-2 print:hidden relative">
                <button 
                  onClick={() => setShowMetricConfig(!showMetricConfig)}
                  className={`rounded-lg border p-2 transition-colors ${showMetricConfig ? 'border-blue-400/20 bg-blue-500/10 text-blue-300' : 'border-white/[0.07] bg-black/15 text-neutral-500 hover:text-neutral-300'}`}
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
                      className="absolute right-0 top-10 z-50 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#12161d] p-4 shadow-2xl"
                    >
                      <div className="mb-3 px-1 text-xs font-medium text-neutral-300">Configurar reporte</div>
                      
                      <div className="space-y-4 mb-4 border-b border-white/5 pb-4">
                        <div className="space-y-1">
                          <label className="px-1 text-[9px] font-medium text-neutral-500">Tipo de cuenta</label>
                          <select
                            value={s?.tracking || 'ecommerce'}
                            onChange={(e) => handleTrackingChange(e.target.value as AccountSettings['tracking'])}
                            className="w-full cursor-pointer rounded-lg border border-white/[0.07] bg-black/50 px-3 py-2 text-[10px] font-medium text-white outline-none transition-colors focus:border-blue-400/40"
                          >
                            <option value="ecommerce">Ecommerce web</option>
                            <option value="messaging">Mensajería</option>
                            <option value="leads">Clientes potenciales</option>
                            <option value="both">Ecommerce + mensajería</option>
                            <option value="all">Multicanal</option>
                          </select>
                          <p className="px-1 pt-1 text-[8px] leading-relaxed text-neutral-600">
                            Define el gráfico, las métricas y el orden de los creativos.
                          </p>
                        </div>
                        <div className="space-y-1">
                          <label className="px-1 text-[9px] font-medium text-neutral-500">Nombre personalizado</label>
                          <input 
                            type="text"
                            placeholder="Ej: Marca Premium"
                            value={s?.customName || ''}
                            onChange={(e) => onSaveSettings(selectedId!, { ...s!, customName: e.target.value })}
                            className="w-full bg-black/50 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] text-white outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="px-1 text-[9px] font-medium text-neutral-500">Logo del cliente (URL)</label>
                          <input 
                            type="text"
                            placeholder="https://ejemplo.com/logo.png"
                            value={s?.customLogo || ''}
                            onChange={(e) => onSaveSettings(selectedId!, { ...s!, customLogo: e.target.value })}
                            className="w-full bg-black/50 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] text-white outline-none focus:border-blue-500/50 transition-all font-medium"
                          />
                        </div>
                      </div>

                      <div className="mb-3 px-1 text-[10px] font-medium text-neutral-400">Métricas visibles</div>
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
                              <span className="text-[10px] font-medium">{metric.label}</span>
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
                  className={`rounded-lg border p-2 transition-colors ${showMetrics ? 'border-blue-400/15 bg-blue-500/10 text-blue-300' : 'border-white/[0.07] bg-black/15 text-neutral-600'}`}
                  title={showMetrics ? 'Ocultar métricas' : 'Mostrar métricas'}
                >
                  {showMetrics ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button 
                  onClick={() => setShowObservations(!showObservations)}
                  className={`rounded-lg border p-2 transition-colors ${showObservations ? 'border-blue-400/15 bg-blue-500/10 text-blue-300' : 'border-white/[0.07] bg-black/15 text-neutral-600'}`}
                  title={showObservations ? 'Ocultar observaciones' : 'Mostrar observaciones'}
                >
                  <TableIcon className={`w-3.5 h-3.5 ${showObservations ? 'opacity-100' : 'opacity-40'}`} />
                </button>
              </div>
            </div>

            {/* Client Daily Performance Trend Box: Mensajes or Compras over time */}
            <AccountDailyTrendCard 
              account={selectedAccount}
              settings={s || undefined}
              dailySeries={accountDailySeries}
              dateRange={dateRange}
              loading={loadingAccountSeries}
            />

            {/* Metrics Grids */}
            {showMetrics && visibleMetrics.length > 0 && <div className="print-metrics-heading hidden print:block mb-3">
              <h3 className="print-section-title text-[10px] font-black text-neutral-900 uppercase tracking-[0.2em] border-l-4 border-blue-600 pl-3">
                <span className="print-section-number hidden print:inline-flex">01</span>
                Resumen de resultados
              </h3>
            </div>}
            <AnimatePresence>
              {showMetrics && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 overflow-hidden print:mb-2"
                >
                  {!isSyncing && (
                    <div className="flex items-center px-1 print:hidden">
                      <span className="text-[10px] font-medium text-neutral-500">Métricas generales</span>
                    </div>
                  )}

                  {isSyncing ? (
                    <div className="grid grid-cols-1 gap-2">
                      <RocketLoader />
                    </div>
                  ) : visibleMetrics.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.015] px-4 py-5 text-center print:hidden">
                      <p className="text-[10px] font-medium text-neutral-500">No hay métricas visibles.</p>
                      <button
                        type="button"
                        onClick={() => setShowMetricConfig(true)}
                        className="mt-2 text-[9px] font-medium text-blue-400 hover:text-blue-300"
                      >
                        Agregar métricas desde configuración
                      </button>
                    </div>
                  ) : (
                    <DndContext sensors={metricSensors} collisionDetection={closestCenter} onDragEnd={handleMetricDragEnd}>
                      <SortableContext items={visibleMetrics} strategy={rectSortingStrategy}>
                        <div className="print-metrics-grid grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4 print:grid-cols-4 print:gap-3">
                          {visibleMetrics.map(id => (
                            <SortableMetricCard
                              key={id}
                              id={id}
                              onRemove={() => toggleMetric(id)}
                            >
                              {renderMetric(id, selectedAccount!)}
                            </SortableMetricCard>
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
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
                        <div className="flex flex-col gap-4 mt-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                           <div className="flex flex-col md:flex-row items-end justify-between gap-4">
                              <div className="w-full md:w-auto flex-1 group/date">
                                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 mb-2 block group-hover/date:text-blue-500 transition-colors">Fecha de registro manual</label>
                                <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white hover:border-blue-500/50 transition-all">
                                  <Calendar className="w-4 h-4 text-blue-500" />
                                  <input 
                                    type="date"
                                    value={noteDate}
                                    onChange={(e) => setNoteDate(e.target.value)}
                                    className="bg-transparent border-none outline-none text-[11px] font-bold w-full uppercase cursor-pointer"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 w-full md:w-auto">
                                <button 
                                  onClick={toggleListening}
                                  type="button"
                                  title={isListening ? "Detener dictado" : "Iniciar dictado por voz"}
                                  className={cn(
                                    "p-3 rounded-xl border transition-all flex items-center justify-center min-w-[44px]",
                                    isListening 
                                      ? "bg-red-500 text-white animate-pulse border-red-500 shadow-lg shadow-red-500/20" 
                                      : "bg-white/5 border-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
                                  )}
                                >
                                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                </button>
                                <button 
                                  onClick={handleSaveObs}
                                  disabled={isSavingObs || !observations.trim()}
                                  className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white h-[44px] px-8 rounded-xl transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 text-[10px] font-black uppercase tracking-widest"
                                >
                                  {isSavingObs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                  Cargar en Bitácora
                                </button>
                              </div>
                           </div>
                        </div>
                      </div>

                      {/* Notes History List */}
                      <div className="space-y-3 mt-6 print:hidden">
                        <h4 className="text-[10px] font-black text-neutral-700 uppercase tracking-widest px-1">Historial reciente</h4>
                        {notes.filter(n => n.accountId === selectedId).length === 0 ? (
                          <div className="py-8 text-center bg-white/[0.01] rounded-xl border border-dashed border-white/5">
                            <p className="text-[9px] font-black text-neutral-800 uppercase tracking-widest">No hay registros previos</p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {notes.filter(n => n.accountId === selectedId)
                                 .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                                 .slice(0, 10)
                                 .map(note => (
                              <div key={note.id} className="relative group/note">
                                <button
                                  onClick={() => setSelectedNoteForView(note)}
                                  className="bg-[#0c0c0c] hover:bg-neutral-900 px-3 py-2 rounded-lg border border-white/5 transition-all flex items-center gap-2 group shadow-lg active:scale-95"
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                  <span className="text-[10px] font-bold text-neutral-400 group-hover:text-white uppercase tracking-wider">
                                    {format(new Date(note.timestamp), 'dd/MM')}
                                  </span>
                                  <span className="text-[9px] text-neutral-600 truncate max-w-[120px] font-medium hidden sm:inline">
                                    {note.text.slice(0, 30)}...
                                  </span>
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/note:opacity-100 transition-opacity z-10 hover:bg-red-600 shadow-lg"
                                >
                                  <X className="w-2 h-2" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Note Pop-up/Modal */}
                      {selectedNoteForView && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                          <div 
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setSelectedNoteForView(null)}
                          />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                          >
                            <div className="p-6 space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
                                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Detalle de Bitácora</h3>
                                </div>
                                <span className="text-[10px] font-bold text-neutral-500 uppercase">
                                  {format(new Date(selectedNoteForView.timestamp), "eeee d 'de' MMMM, HH:mm", { locale: es })}
                                </span>
                              </div>
                              
                              <div className="bg-black/40 rounded-xl p-5 border border-white/5 min-h-[150px]">
                                <p className="text-sm text-neutral-300 leading-relaxed font-medium whitespace-pre-wrap">
                                  {selectedNoteForView.text}
                                </p>
                              </div>

                              <div className="flex justify-end gap-3 pt-2">
                                <button 
                                  onClick={() => setSelectedNoteForView(null)}
                                  className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
                                >
                                  Cerrar
                                </button>
                                <button 
                                  onClick={() => {
                                    onDeleteNote(selectedNoteForView.id);
                                    setSelectedNoteForView(null);
                                  }}
                                  className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </div>
                            
                            <button 
                              onClick={() => setSelectedNoteForView(null)}
                              className="absolute top-4 right-4 p-2 text-neutral-600 hover:text-white transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </motion.div>
                        </div>
                      )}
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
            <div className="print-creatives-section space-y-4 pb-20 print:pb-0">
               <div className="flex items-center justify-between px-1 print:mb-4 print:border-b-2 print:border-neutral-100 print:pb-2">
                  <div className="flex items-center gap-4">
                    <h3 className="print-section-title text-[10px] font-black text-neutral-500 uppercase tracking-widest print:text-sm print:text-neutral-900 print:border-l-4 print:border-blue-600 print:pl-3">
                      <span className="print-section-number hidden print:inline-flex">02</span>
                      Creativos destacados
                    </h3>
                    <div className="print-sort-criterion hidden print:flex items-center gap-2 px-2 py-0.5 bg-neutral-950 text-white rounded text-[8px] font-black uppercase tracking-widest">
                      <TrendingUp className="w-3 h-3" />
                      Criterio de orden: {sortLabel}
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
                         <option value="roas">Ponderar por ROAS</option>
                         <option value="messages">Ponderar por Mensajes</option>
                         <option value="purchases">Ponderar por Compras</option>
                         <option value="revenue">Ponderar por Facturación</option>
                         <option value="spend">Ponderar por Gasto</option>
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
                      <RocketLoader />
                   </div>
                 ) : ads.length === 0 ? (
                    <div className="py-16 bg-[#111]/30 rounded-xl flex flex-col items-center justify-center text-neutral-700 gap-4 border border-white/5 border-dashed">
                      <LayoutGrid className="w-8 h-8 opacity-10" />
                      <span className="text-[9px] font-black uppercase tracking-widest">No metrics available</span>
                    </div>
                 ) : [...ads].sort((a,b) => ((b as any)[sortBy] || 0) - ((a as any)[sortBy] || 0)).slice(0, topN).map((ad, idx) => (
                   <AdCard key={ad.id} ad={ad} rank={idx + 1} />
                 ))}
               </div>
            </div>

            {/* Bitácora Ilustrada del Mes en Curso */}
            <div className="print-notes-section mt-8 pt-6 border-t border-white/5 print:border-neutral-200 print:mt-6 print:pt-4">
              <MonthBitacoraTimeline 
                accountId={selectedId}
                notes={notes}
                observations={observations}
                accountName={settings[selectedAccount.id]?.customName || selectedAccount.name}
              />
            </div>
            <div className="report-print-endnote hidden print:flex">
              <span>Informe generado por Orion Metrics</span>
              <span>Fuente: Meta Ads | Documento confidencial</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-800 space-y-4">
             <LayoutGrid className="w-12 h-12 opacity-10" />
             <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">Selecciona una entidad para monitorear</p>
          </div>
        )}
      </div>
      {/* Offline Sales Manager Modal */}
      <AnimatePresence>
        {showOfflineManager && offlineManagerEntityId && (
          <OfflineSalesManager 
            currency={settings[offlineManagerEntityId]?.currency || 'ARS'}
            entries={(() => {
              const clientSettings = settings[offlineManagerEntityId];
              if (!clientSettings?.offlineSalesLogByMonth) return [];
              const allEntries: OfflineSaleEntry[] = [];
              Object.values(clientSettings.offlineSalesLogByMonth).forEach((list: any) => {
                if (Array.isArray(list)) {
                  allEntries.push(...list);
                }
              });
              return allEntries.filter(entry => entry.date >= dateRange.since && entry.date <= dateRange.until);
            })()}
            onClose={() => {
              setShowOfflineManager(false);
              setOfflineManagerEntityId(null);
            }}
            onAdd={(amount, note, date) => {
              const clientSettings = settings[offlineManagerEntityId] || { objective: 0, budget: 0, currency: 'ARS', tracking: 'ecommerce' as const };
              const logsByMonth = { ...(clientSettings.offlineSalesLogByMonth || {}) };
              const targetPeriodKey = date.substring(0, 7); // YYYY-MM
              const currentLog = logsByMonth[targetPeriodKey] || [];
              const newEntry: OfflineSaleEntry = {
                id: Math.random().toString(36).substr(2, 9),
                amount,
                note,
                date
              };
              logsByMonth[targetPeriodKey] = [...currentLog, newEntry];
              
              onSaveSettings(offlineManagerEntityId, {
                ...clientSettings,
                offlineSalesLogByMonth: logsByMonth
              } as any);
            }}
            onDelete={(id) => {
              const clientSettings = settings[offlineManagerEntityId] || { objective: 0, budget: 0, currency: 'ARS', tracking: 'ecommerce' as const };
              const logsByMonth = { ...(clientSettings.offlineSalesLogByMonth || {}) };
              
              let deleted = false;
              for (const mKey of Object.keys(logsByMonth)) {
                const initialLength = logsByMonth[mKey].length;
                logsByMonth[mKey] = logsByMonth[mKey].filter(e => e.id !== id);
                if (logsByMonth[mKey].length < initialLength) {
                  deleted = true;
                  if (logsByMonth[mKey].length === 0) {
                    delete logsByMonth[mKey];
                  }
                  break;
                }
              }
              
              if (deleted) {
                onSaveSettings(offlineManagerEntityId, {
                  ...clientSettings,
                  offlineSalesLogByMonth: logsByMonth
                } as any);
              }
            }}
            onUpdate={(id, amount, note, date) => {
              const clientSettings = settings[offlineManagerEntityId] || { objective: 0, budget: 0, currency: 'ARS', tracking: 'ecommerce' as const };
              const logsByMonth = { ...(clientSettings.offlineSalesLogByMonth || {}) };
              
              let foundEntry = null;
              for (const mKey of Object.keys(logsByMonth)) {
                const idx = logsByMonth[mKey].findIndex(e => e.id === id);
                if (idx !== -1) {
                  foundEntry = { ...logsByMonth[mKey][idx] };
                  logsByMonth[mKey] = logsByMonth[mKey].filter(e => e.id !== id);
                  if (logsByMonth[mKey].length === 0) {
                    delete logsByMonth[mKey];
                  }
                  break;
                }
              }

              const updatedEntry: OfflineSaleEntry = {
                id,
                amount,
                note,
                date
              };
              const targetPeriodKey = date.substring(0, 7); // YYYY-MM
              const destLogs = logsByMonth[targetPeriodKey] || [];
              logsByMonth[targetPeriodKey] = [...destLogs, updatedEntry];

              onSaveSettings(offlineManagerEntityId, {
                ...clientSettings,
                offlineSalesLogByMonth: logsByMonth
              } as any);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const MetricBox: React.FC<{ label: string; value: string; isPlaceholder?: boolean; variant?: 'default' | 'highlight' }> = ({ label, value, isPlaceholder, variant = 'default' }) => (
  <div className={cn(
    "group overflow-hidden rounded-xl border px-3.5 py-3 transition-colors print:border-b-2 print:border-neutral-100 print:bg-white print:shadow-sm",
    variant === 'highlight' 
      ? "border-blue-400/15 bg-blue-500/[0.06]"
      : "border-white/[0.07] bg-[#12161d] hover:bg-[#151a22]"
  )}>
    <div className="metric-card-heading mb-2 flex items-center justify-between">
      <div className="text-[10px] font-medium text-neutral-500 transition-colors group-hover:text-neutral-400 print:text-neutral-400">{label}</div>
      {variant === 'highlight' && <TrendingUp className="h-3 w-3 text-blue-400/60" />}
    </div>
    <div className={cn(
      "truncate text-base font-semibold tracking-[-0.02em] print:text-black md:text-lg",
      isPlaceholder ? 'text-neutral-700' : 'text-neutral-100',
      variant === 'highlight' && !isPlaceholder ? 'text-blue-100' : ''
    )}>
      {isPlaceholder ? '-' : value}
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
