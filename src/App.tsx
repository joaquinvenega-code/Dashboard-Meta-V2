import React, { useState, useEffect, useCallback } from 'react';
import { 
  initFacebookSdk, 
  loginWithFacebook, 
  getFacebookLoginStatus, 
  getUserProfile, 
  getAdAccounts, 
  fetchInsights,
  fetchAccountStructure 
} from './services/facebook';
import { AdAccount, AccountSettings, ClientGroup, Campaign, AdSet, Ad } from './types';
import { Sidebar } from './components/Sidebar';
import { IndividualReport } from './components/IndividualReport';
import { Overview } from './components/Overview';
import { AccountDetailView } from './components/AccountDetailView';
import { StrategyCanvas } from './components/StrategyCanvas';
import { formatCurrency, formatNumber, formatDecimal, cn } from './lib/utils';
import { 
  ChevronDown, 
  RefreshCw, 
  AlertCircle, 
  Facebook, 
  Settings2,
  Calendar,
  LayoutDashboard,
  BarChart3,
  Settings,
  History,
  Share2,
  ChevronRight,
  LogOut,
  RefreshCcw,
  CheckCircle2,
  X,
  GripVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, subDays, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const COLUMN_DEFS: Record<string, { label: string; width: string }> = {
  objetivo: { label: 'Objetivo', width: 'w-28' },
  facturado: { label: 'Facturación', width: 'w-28' },
  roas: { label: 'ROAS', width: 'w-20' },
  mensajes: { label: 'Mensajes', width: 'w-24' },
  progreso: { label: 'Progreso', width: 'w-32' },
  invertido: { label: 'Invertido', width: 'w-28' },
  presupuesto: { label: 'Presupuesto', width: 'w-28' },
  prespct: { label: '% Presupuesto', width: 'w-32' },
  estado: { label: 'Estado', width: 'w-32' }
};

// Global ID Match Utility
const matchId = (id1: any, id2: any) => {
  if (id1 === null || id1 === undefined || id2 === null || id2 === undefined) return false;
  const clean = (val: any) => val.toString().toLowerCase().replace(/^act_/g, '').trim();
  const s1 = clean(id1);
  const s2 = clean(id2);
  return s1 === s2 && s1.length > 0;
};

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [appId, setAppId] = useState(localStorage.getItem('cr_appid') || '');
  const [isLogged, setIsLogged] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState('overview');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  
  // Column Selection State
  const [visibleCols, setVisibleCols] = useState<string[]>(['objetivo', 'facturado', 'roas', 'mensajes', 'progreso', 'invertido', 'presupuesto', 'prespct', 'estado']);
  const [colOrder, setColOrder] = useState<string[]>(['objetivo', 'facturado', 'roas', 'mensajes', 'progreso', 'invertido', 'presupuesto', 'prespct', 'estado']);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Global ID Match Utility (moved outside)

  // Date Range State
  const [dateRange, setDateRange] = useState({
    since: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    until: format(new Date(), 'yyyy-MM-dd')
  });
  const [isCustomDate, setIsCustomDate] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<Record<string, AccountSettings>>(() => {
    try {
      const saved = localStorage.getItem('cr_settings');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  // Report State
  const [reportAccount, setReportAccount] = useState<AdAccount | null>(null);
  const [showColSelectors, setShowColSelectors] = useState(false);
  const [configEntity, setConfigEntity] = useState<AdAccount | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Strategy Structure State
  const [structure, setStructure] = useState<{
    campaigns: Campaign[];
    adsets: AdSet[];
    ads: Ad[];
  } | null>(null);
  const [loadingStructure, setLoadingStructure] = useState(false);

  // Group Modal State
  const [groupModal, setGroupModal] = useState<{ 
    isOpen: boolean; 
    type: 'create' | 'edit' | 'delete'; 
    group?: ClientGroup;
    inputValue: string;
  }>({ 
    isOpen: false, 
    type: 'create', 
    inputValue: '' 
  });

  // Visibility State
  const [visibleAccountIds, setVisibleAccountIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cr_visible_accounts');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Groups State
  const [groups, setGroups] = useState<ClientGroup[]>(() => {
    try {
      const saved = localStorage.getItem('cr_groups');
      const parsed = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed)) return [];
      // Robust filtering: keep only objects with id and ensure accountIds is array
      return parsed.filter(g => g && typeof g === 'object' && g.id).map(g => ({
        ...g,
        accountIds: Array.isArray(g.accountIds) ? g.accountIds : []
      }));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (appId) {
      initFacebookSdk(appId).then(() => {
        setIsInitialized(true);
        getFacebookLoginStatus().then((res) => {
          if (res.status === 'connected') {
            handleLoginSuccess();
          }
        });
      });
    } else {
      setIsInitialized(true);
    }
  }, [appId]);

  const handleLoginSuccess = async () => {
    setIsLogged(true);
    setLoading(true);
    try {
      const profile = await getUserProfile();
      setUser(profile);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    if (!isLogged) return;
    setLoading(true);
    try {
      const accs = await getAdAccounts();
      if (accs.length === 0) {
        setError('No se encontraron cuentas publicitarias vinculadas a tu perfil de Meta Ads.');
        setAccounts([]);
        setLoading(false);
        return;
      }
      
      const detailedAccs = await Promise.all(accs.map(async (acc) => {
        try {
          const insights = await fetchInsights(acc.id, dateRange.since, dateRange.until);
          return { ...acc, ...insights };
        } catch (e) {
          console.error(`Error fetching insights for ${acc.id}:`, e);
          return { ...acc, spend: 0, revenue: 0 };
        }
      }));
      setAccounts(detailedAccs);
      setError(null);
      
      // Auto-initialize visibility ONLY if it has never been set
      setVisibleAccountIds(currentVisible => {
        const stored = localStorage.getItem('cr_visible_accounts');
        if (stored === null && detailedAccs.length > 0) {
          const allIds = detailedAccs.map(a => a.id);
          localStorage.setItem('cr_visible_accounts', JSON.stringify(allIds));
          return allIds;
        }
        
        // If we have accounts but none matches our visible list, and we aren't intentionally showing nothing
        const hasVisibleMatches = detailedAccs.some(a => 
          currentVisible.some(vId => matchId(vId, a.id) || matchId(vId, a.account_id))
        );
        
        if (detailedAccs.length > 0 && currentVisible.length > 0 && !hasVisibleMatches) {
          // This happens if the user changed the App ID or similar and the visible list is stale
          const allIds = detailedAccs.map(a => a.id);
          localStorage.setItem('cr_visible_accounts', JSON.stringify(allIds));
          return allIds;
        }
        
        return currentVisible;
      });
      
      setLastSync(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      setError(err.message || 'Error al sincronizar con Meta Ads');
    } finally {
      setLoading(false);
    }
  }, [dateRange, isLogged]); // Removed visibleAccountIds from dependency

  useEffect(() => {
    if (isLogged) {
      loadData();
    }
  }, [dateRange, isLogged]); // Manual triggers or date changes

  const onLogin = async () => {
    if (!appId) {
      setError('Por favor, ingresa un App ID válido');
      return;
    }
    localStorage.setItem('cr_appid', appId);
    try {
      await loginWithFacebook();
      handleLoginSuccess();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const onLogout = () => {
    localStorage.removeItem('cr_appid');
    window.location.reload();
  };

  const updateSetting = (id: string, field: keyof AccountSettings, value: any) => {
    const newSettings = {
      ...settings,
      [id]: {
        ...(settings[id] || { objective: 0, budget: 0, currency: 'ARS', tracking: 'ecommerce' }),
        [field]: value
      }
    };
    setSettings(newSettings);
    localStorage.setItem('cr_settings', JSON.stringify(newSettings));
  };

  const handleSaveSettings = (id: string, s: AccountSettings) => {
    const newSettings = { ...settings, [id]: s };
    setSettings(newSettings);
    localStorage.setItem('cr_settings', JSON.stringify(newSettings));
  };

  const toggleCol = (col: string) => {
    if (visibleCols.includes(col)) {
      setVisibleCols(visibleCols.filter(c => c !== col));
    } else {
      setVisibleCols([...visibleCols, col]);
    }
  };

  const toggleAccountVisibility = (id: string) => {
    const exists = visibleAccountIds.some(v => matchId(v, id));
    const next = exists 
      ? visibleAccountIds.filter(v => !matchId(v, id)) 
      : [...visibleAccountIds, id];
    
    setVisibleAccountIds(next);
    localStorage.setItem('cr_visible_accounts', JSON.stringify(next));
  };

  const saveGroups = (newGroups: ClientGroup[]) => {
    setGroups(newGroups);
    localStorage.setItem('cr_groups', JSON.stringify(newGroups));
  };

  const { overviewEntities, overviewSettings } = React.useMemo(() => {
    try {
      const activeAccounts = accounts || [];
      const currentVisibleIds = Array.isArray(visibleAccountIds) ? visibleAccountIds : [];
      const currentGroups = Array.isArray(groups) ? groups : [];
      
      const entities: AdAccount[] = [];
      const virtualSettings: Record<string, AccountSettings> = { ...(settings || {}) };

      const handledAccountIds = new Set<string>();

      // 1. Process Groups
      currentGroups.forEach(g => {
        if (!g) return;
        // Member accounts currently loaded from Meta
        const gAccs = activeAccounts.filter(a => 
          (g.accountIds || []).some(id => matchId(id, a.id) || matchId(id, a.account_id))
        );

        if (gAccs.length > 0) {
          // Group is visible if: its ID is selected OR any of its member accounts are selected
          const isGroupVisible = currentVisibleIds.some(vId => 
            matchId(vId, g.id) || gAccs.some(a => matchId(vId, a.id) || matchId(vId, a.account_id))
          );

          if (isGroupVisible) {
             const sG = settings[g.id];
             entities.push({
               id: g.id,
               account_id: 'GRUPO',
               name: g.name || 'Grupo',
               account_status: 1,
               currency: sG?.currency || gAccs[0].currency || 'ARS',
               spend: gAccs.reduce((sum, a) => sum + (a?.spend || 0), 0),
               revenue: gAccs.reduce((sum, a) => sum + (a?.revenue || 0), 0),
               purchases: gAccs.reduce((sum, a) => sum + (a?.purchases || 0), 0),
               messages: gAccs.reduce((sum, a) => sum + (a?.messages || 0), 0),
             });
             // Mark accounts as handled so they don't appear twice
             gAccs.forEach(a => handledAccountIds.add(a.id?.toString()));
          }
        }
      });

      // 2. Process Individual Accounts
      activeAccounts.forEach(acc => {
        if (handledAccountIds.has(acc.id?.toString())) return;

        const isSelected = currentVisibleIds.some(vId => matchId(vId, acc.id) || matchId(vId, acc.account_id));
        if (isSelected) {
          const s = settings[acc.id];
          const entry = { ...acc };
          if (s?.customName) entry.name = s.customName;
          entities.push(entry);
        }
      });

      if (calcError) setCalcError(null);
      return { overviewEntities: entities, overviewSettings: virtualSettings };
    } catch (e: any) {
      console.error("Memo Error:", e);
      return { overviewEntities: [], overviewSettings: settings };
    }
  }, [accounts, groups, visibleAccountIds, settings]);

  const filteredAccounts = (accounts || []).filter(acc => 
    visibleAccountIds.some(vId => matchId(vId, acc.id) || matchId(vId, acc.account_id))
  );

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[#111] rounded-[2.5rem] border border-white/5 p-10 shadow-2xl overflow-hidden relative"
        >
          {/* Abstract glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 blur-[80px] rounded-full"></div>
          
          <div className="flex flex-col items-center mb-10 relative">
            <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl shadow-blue-600/40 transform -rotate-6">
              <BarChart3 className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white">Control ROAS</h1>
            <p className="text-neutral-500 text-center text-sm font-bold uppercase tracking-widest mt-2 px-10">Meta Ads Dashboard</p>
          </div>

          <div className="space-y-5 relative">
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-2 ml-1">Meta App ID</label>
              <input 
                type="text" 
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="ID de tu app..."
                className="w-full px-5 py-4 bg-neutral-900 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 font-bold transition-all text-neutral-200 placeholder:text-neutral-700"
              />
            </div>

            {error && (
              <div className="bg-red-900/10 border border-red-900/20 text-red-500 p-4 rounded-2xl text-xs font-bold flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 opacity-70" />
                {error}
              </div>
            )}

            <button 
              onClick={onLogin}
              className="w-full bg-blue-600 text-white h-16 rounded-[1.5rem] text-sm font-black flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/25 active:scale-[0.98]"
            >
              <Facebook className="w-5 h-5 fill-current" />
              Ingresar con Facebook
            </button>
          </div>

          <div className="mt-12 pt-10 border-t border-white/5 relative">
            <h3 className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-6">Guía rápida</h3>
            <div className="space-y-4">
              {[
                { n: "01", t: "Ve a developers.facebook.com" },
                { n: "02", t: "Configura Producto: Marketing API" },
                { n: "03", t: "Pega el App ID aquí arriba" }
              ].map(step => (
                <div key={step.n} className="flex gap-4 items-center">
                  <span className="text-[10px] font-black text-blue-600">{step.n}</span>
                  <span className="text-xs font-bold text-neutral-500">{step.t}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex selection:bg-blue-600 selection:text-white">
      <Sidebar 
        activePage={activePage} 
        onPageChange={setActivePage} 
        user={user} 
        onLogout={onLogout}
        onRefresh={loadData}
        loading={loading}
        lastSync={lastSync}
      />
      
      <main className="flex-1 min-w-0 p-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-10">
          {error && (
            <div className="bg-danger/10 border border-danger/20 p-4 rounded-lg flex items-center gap-3 text-danger animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div className="text-xs font-black uppercase tracking-widest">{error}</div>
              <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-danger/10 rounded-lg">×</button>
            </div>
          )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 print:hidden mb-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black tracking-widest text-white uppercase opacity-80 flex items-center gap-3">
                  {activePage === 'overview' ? 'Vista general' : 
                   activePage === 'detail' ? 'Análisis individual de cuenta' : 
                   activePage === 'accounts' ? 'Cuentas visibles' : 
                   activePage === 'strategy' ? 'Lienzo Estratégico' : activePage}
                  {activePage === 'strategy' && (
                    <div className="px-1.5 py-0.5 bg-blue-600/10 border border-blue-600/20 rounded-full text-[8px] text-blue-500 uppercase tracking-widest">Planificación</div>
                  )}
                </h2>
              </div>

              {activePage === 'strategy' ? (
                <div className="flex items-center gap-2 bg-[#111] p-1 rounded-lg border border-white/5 animate-in slide-in-from-right-4 duration-500">
                   <div className="flex items-center gap-2 w-[380px]">
                      <div className="flex-1">
                        <AccountSelectorDropdown
                          label="Visible"
                          accounts={accounts.filter(a => visibleAccountIds.includes(a.id))}
                          activeId={(structure as any)?.activeAccId}
                          onSelect={async (acc) => {
                            setLoadingStructure(true);
                            const data = await fetchAccountStructure(acc.id);
                            setStructure({ ...data, activeAccId: acc.id } as any);
                            setLoadingStructure(false);
                          }}
                          variant="blue"
                        />
                      </div>
                      <div className="flex-1">
                        <AccountSelectorDropdown
                          label="Ocultas"
                          accounts={accounts.filter(a => !visibleAccountIds.includes(a.id))}
                          activeId={(structure as any)?.activeAccId}
                          onSelect={async (acc) => {
                            setLoadingStructure(true);
                            const data = await fetchAccountStructure(acc.id);
                            setStructure({ ...data, activeAccId: acc.id } as any);
                            setLoadingStructure(false);
                          }}
                          variant="neutral"
                        />
                      </div>
                   </div>
                </div>
              ) : activePage === 'overview' && (
                <div className="flex flex-wrap items-center gap-3 bg-[#111] p-2 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-neutral-600 ml-2" />
                    <div className="text-[10px] font-black text-neutral-400 uppercase tracking-wider mr-4">
                      {dateRange.since} — {dateRange.until}
                    </div>
                  </div>

                <div className="flex items-center gap-2">
                  <select 
                    value={isCustomDate ? 'custom' : (dateRange.since === format(startOfMonth(new Date()), 'yyyy-MM-dd') ? 'this_month' : 'last_7')}
                    onChange={(e) => {
                      const val = e.target.value;
                      const now = new Date();
                      if (val === 'custom') {
                        setIsCustomDate(true);
                      } else {
                        setIsCustomDate(false);
                        if (val === 'this_month') {
                          setDateRange({ since: format(startOfMonth(now), 'yyyy-MM-dd'), until: format(now, 'yyyy-MM-dd') });
                        } else if (val === 'last_7') {
                          setDateRange({ since: format(subDays(now, 7), 'yyyy-MM-dd'), until: format(now, 'yyyy-MM-dd') });
                        } else if (val === 'last_30') {
                          setDateRange({ since: format(subDays(now, 30), 'yyyy-MM-dd'), until: format(now, 'yyyy-MM-dd') });
                        }
                      }
                    }}
                    className="bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black text-neutral-100 uppercase tracking-widest outline-none focus:border-blue-600 transition-all cursor-pointer hover:bg-[#222]"
                  >
                    <option value="this_month">Este mes</option>
                    <option value="last_7">Últimos 7 días</option>
                    <option value="last_30">Últimos 30 días</option>
                    <option value="custom">Personalizado</option>
                  </select>

                  {isCustomDate && (
                    <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                      <input 
                        type="date" 
                        value={dateRange.since}
                        onChange={(e) => setDateRange(prev => ({ ...prev, since: e.target.value }))}
                        className="bg-[#1c1c1c] border border-white/10 rounded-xl px-2 py-1.5 text-[10px] font-bold text-white outline-none focus:border-blue-600 appearance-none"
                      />
                      <span className="text-[10px] text-neutral-600 font-black">A</span>
                      <input 
                        type="date" 
                        value={dateRange.until}
                        onChange={(e) => setDateRange(prev => ({ ...prev, until: e.target.value }))}
                        className="bg-[#1c1c1c] border border-white/10 rounded-xl px-2 py-1.5 text-[10px] font-bold text-white outline-none focus:border-blue-600 appearance-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {loading && !accounts.length ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6 text-neutral-700">
              <RefreshCw className="w-12 h-12 animate-spin text-blue-600/30" />
              <p className="text-xs font-black uppercase tracking-[0.3em]">Sincronizando con Meta...</p>
            </div>
          ) : (
            <>
              {activePage === 'overview' && (
                <div className="space-y-10 animate-in fade-in duration-1000">
                  <Overview accounts={overviewEntities} settings={overviewSettings} />
                  
                  {/* Column Toggles Toggle */}
                  <div className="flex justify-end">
                    <button 
                      onClick={() => setShowColSelectors(!showColSelectors)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                        showColSelectors ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-white/5 text-neutral-600 hover:text-neutral-400"
                      )}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      {showColSelectors ? 'Ocultar columnas' : 'Personalizar columnas'}
                    </button>
                  </div>

                  {/* Column Toggles */}
                  <AnimatePresence>
                    {showColSelectors && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap items-center gap-3 py-4 border-y border-white/5">
                          <span className="text-[9px] font-black text-neutral-700 uppercase tracking-[0.2em] mr-2">Visibilidad de columnas</span>
                          {Object.keys(COLUMN_DEFS).map(col => (
                            <button
                              key={col}
                              onClick={() => toggleCol(col)}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border",
                                visibleCols.includes(col) 
                                  ? "bg-blue-600/10 border-blue-600/30 text-blue-500" 
                                  : "bg-transparent border-white/5 text-neutral-600 grayscale opacity-50 hover:opacity-100"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full", visibleCols.includes(col) ? "bg-blue-500" : "bg-neutral-800")}></div>
                                {COLUMN_DEFS[col].label}
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Accounts Table Styled for Overview */}
                  <div className="bg-[#111] rounded-xl border border-white/5 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                          <DndContext 
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext 
                              items={colOrder}
                              strategy={horizontalListSortingStrategy}
                            >
                              <tr className="border-b border-white/5 bg-white/[0.01]">
                                <th className="px-5 py-2 text-[9px] font-black text-neutral-700 uppercase tracking-[0.2em] w-48">Cliente</th>
                                {colOrder.map((colId: string) => {
                                  if (!visibleCols.includes(colId)) return null;
                                  return <SortableHeader key={colId} id={colId} label={COLUMN_DEFS[colId].label} width={COLUMN_DEFS[colId].width} />;
                                })}
                                <th className="px-2 py-2 text-[9px] font-black text-neutral-700 uppercase tracking-[0.2em] text-right w-16 pr-5"></th>
                              </tr>
                            </SortableContext>
                          </DndContext>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                          {overviewEntities.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="px-8 py-20 text-center">
                                <div className="flex flex-col items-center gap-4 text-neutral-600">
                                  <Facebook className="w-12 h-12 opacity-10" />
                                  <div className="space-y-1">
                                    <p className="text-xs font-black uppercase tracking-[0.2em]">No hay datos para mostrar</p>
                                    <p className="text-[10px] font-medium max-w-[250px] mx-auto leading-relaxed">
                                      {accounts.length === 0 
                                        ? "No se encontró ninguna cuenta vinculada. Asegúrate de tener permisos de Administrador o Anunciante en Meta Ads."
                                        : visibleAccountIds.length === 0
                                          ? "No has seleccionado cuentas en el panel de configuración."
                                          : `Se detectaron ${accounts.length} cuentas en total, pero ninguna coincide con los filtros actuales.`}
                                    </p>
                                    <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5 text-left">
                                      <p className="text-[8px] font-black uppercase text-neutral-600 tracking-widest mb-1">Diagnóstico:</p>
                                      <p className="text-[9px] text-neutral-400 font-bold">• Cuentas cargadas de Meta: {accounts.length}</p>
                                      <p className="text-[9px] text-neutral-400 font-bold">• Cuentas seleccionadas: {visibleAccountIds.length}</p>
                                      <p className="text-[9px] text-neutral-400 font-bold">• Entidades Dashboard: {overviewEntities.length}</p>
                                      {accounts.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                          <p className="text-[9px] text-neutral-500 font-medium break-all opacity-50">
                                            Ref (Meta): {accounts[0].id}<br/>
                                            Ref (Selección): {visibleAccountIds[0] || 'N/A'}
                                          </p>
                                          <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest mt-1">
                                            ¿Hay coincidencias en total?: {accounts.some(a => visibleAccountIds.some(v => matchId(v, a.id) || matchId(v, a.account_id))) ? 'SÍ' : 'NO'}
                                          </p>
                                          {calcError && (
                                            <p className="text-[9px] text-red-500 font-bold uppercase tracking-widest mt-1 bg-red-500/10 p-1 rounded">
                                              ERROR MEMO: {calcError}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-2 mt-6">
                                      {accounts.length > 0 && (
                                        <button 
                                          onClick={() => {
                                            const allIds = accounts.map(a => a.id);
                                            setVisibleAccountIds(allIds);
                                            localStorage.setItem('cr_visible_accounts', JSON.stringify(allIds));
                                          }}
                                          className="bg-blue-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"
                                        >
                                          Forzar aparición de todas las cuentas
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            overviewEntities.map((acc) => {
                              const s = overviewSettings[acc.id] || { objective: 0, budget: 0, currency: acc.currency || 'ARS', tracking: 'ecommerce' };
                              const roas = acc.spend && acc.spend > 0 ? (acc.revenue || 0) / acc.spend : 0;
                              const progress = s.objective > 0 ? Math.min((acc.revenue || 0) / s.objective, 1.2) : 0;
                              const budgetProgress = s.budget > 0 ? Math.min((acc.spend || 0) / s.budget, 1.2) : 0;
                             
                              // Semaphore Logic
                            const getStatusInfo = () => {
                              const p = (acc.revenue || 0) / (s.objective || 1);
                              if (p >= 1) return { label: 'Objetivo', color: 'text-success', bg: 'bg-success' };
                              if (p >= 0.7) return { label: 'Riesgo', color: 'text-warning', bg: 'bg-warning' };
                              return { label: 'Alerta', color: 'text-danger', bg: 'bg-danger' };
                            };
                            const status = getStatusInfo();

                            return (
                              <React.Fragment key={acc.id}>
                                <tr className="hover:bg-white/[0.01] transition-colors group">
                                   <td className="px-5 py-1.5">
                                  <div className="flex items-center gap-2">
                                    <div className="relative group/name inline-block min-w-[100px]">
                                      {editingId === acc.id ? (
                                        <input
                                          autoFocus
                                          type="text"
                                          value={editValue}
                                          onChange={(e) => setEditValue(e.target.value)}
                                          onBlur={() => {
                                            if (editValue && editValue !== acc.name) {
                                              if (acc.account_id === 'GRUPO') {
                                                const nextGroups = groups.map(g => g.id === acc.id ? { ...g, name: editValue } : g);
                                                saveGroups(nextGroups);
                                              } else {
                                                updateSetting(acc.id, 'customName', editValue);
                                              }
                                            }
                                            setEditingId(null);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') e.currentTarget.blur();
                                            if (e.key === 'Escape') setEditingId(null);
                                          }}
                                          className="bg-neutral-800 border-none outline-none rounded px-2 py-1 text-[10px] font-bold text-white w-full"
                                        />
                                      ) : (
                                        <div 
                                          onDoubleClick={() => {
                                            setEditingId(acc.id);
                                            setEditValue(acc.name);
                                          }}
                                          className="font-bold text-[11px] truncate max-w-[160px] text-neutral-300 group-hover:text-white transition-colors cursor-text select-none py-1"
                                          title="Doble clic para editar"
                                        >
                                          {acc.name}
                                        </div>
                                      )}
                                    </div>
                                    <div className="px-1 py-0.5 bg-blue-600/5 border border-blue-600/10 rounded text-[7px] font-black text-blue-500/50 uppercase leading-none tracking-tighter">
                                      {s.currency}
                                    </div>
                                  </div>
                                </td>
                                
                                {colOrder.map(colId => {
                                  if (!visibleCols.includes(colId)) return null;

                                  if (colId === 'objetivo') return (
                                    <td key={colId} className="px-2 py-1.5 text-center text-[10px] font-bold text-neutral-500">
                                      {s.objective ? formatCurrency(s.objective, s.currency) : '—'}
                                    </td>
                                  );

                                  if (colId === 'facturado') return (
                                    <td key={colId} className="px-2 py-1.5 text-center text-[10px] font-bold text-neutral-200">
                                      {formatCurrency(acc.revenue || 0, s.currency)}
                                    </td>
                                  );

                                  if (colId === 'roas') return (
                                    <td key={colId} className="px-2 py-1.5 text-center">
                                      <span className={cn("text-[10px] font-bold", status.color)}>
                                        ×{formatDecimal(roas)}
                                      </span>
                                    </td>
                                  );

                                  if (colId === 'mensajes') return (
                                    <td key={colId} className="px-2 py-1.5 text-center text-[10px] font-bold text-neutral-400">
                                      {formatNumber(acc.messagesReal || acc.messages || 0)}
                                    </td>
                                  );

                                  if (colId === 'progreso') return (
                                    <td key={colId} className="px-2 py-1.5">
                                      <div className="flex flex-col gap-1.5 justify-center">
                                        <div className="flex justify-between items-center px-0.5">
                                          <span className={cn("text-[9px] font-black tracking-tight", status.color)}>{Math.round(progress * 100)}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-white/5 relative">
                                          <div 
                                            className={cn("h-full transition-all duration-1000 shadow-[0_0_8px_rgba(0,0,0,0.3)]", status.bg)} 
                                            style={{ width: `${Math.min(progress * 100, 100)}%` }}
                                          ></div>
                                        </div>
                                      </div>
                                    </td>
                                  );

                                  if (colId === 'invertido') return (
                                    <td key={colId} className="px-2 py-1.5 text-center text-[10px] font-bold text-neutral-400 tabular-nums">
                                      {formatCurrency(acc.spend || 0, s.currency)}
                                    </td>
                                  );

                                  if (colId === 'presupuesto') return (
                                    <td key={colId} className="px-2 py-1.5 text-center text-[10px] font-medium text-neutral-500">
                                      {s.budget ? formatCurrency(s.budget, s.currency) : '—'}
                                    </td>
                                  );

                                  if (colId === 'prespct') return (
                                    <td key={colId} className="px-2 py-1.5">
                                      <div className="flex flex-col gap-1.5 justify-center">
                                        <div className="flex justify-between items-center px-0.5">
                                          <span className={cn("text-[9px] font-black tracking-tight", 
                                            budgetProgress > 1 ? "text-danger" : 
                                            budgetProgress > 0.9 ? "text-warning" : 
                                            "text-success/70"
                                          )}>{Math.round(budgetProgress * 100)}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-white/5 relative">
                                          <div 
                                            className={cn("h-full transition-all duration-1000 shadow-[0_0_8px_rgba(0,0,0,0.3)]", 
                                              budgetProgress > 1 ? "bg-danger" : 
                                              budgetProgress > 0.9 ? "bg-warning" : 
                                              "bg-success/50"
                                            )} 
                                            style={{ width: `${Math.min(budgetProgress * 100, 100)}%` }}
                                          ></div>
                                        </div>
                                      </div>
                                    </td>
                                  );

                                  if (colId === 'estado') return (
                                    <td key={colId} className="px-2 py-1.5 text-center">
                                      <div className="inline-flex items-center gap-1.5">
                                        <div className={cn("w-1 h-1 rounded-full", status.bg)}></div>
                                        <span className={cn("text-[9px] font-bold uppercase tracking-widest leading-none", status.color)}>
                                          {status.label}
                                        </span>
                                      </div>
                                    </td>
                                  );

                                  return null;
                                })}

                                <td className="px-2 py-1.5 text-right pr-5">
                                  <div className="flex items-center justify-end gap-1">
                                    <button 
                                      onClick={() => setConfigEntity(acc)}
                                      className="p-1.5 hover:bg-white/5 rounded-lg text-neutral-700 hover:text-blue-500 transition-all opacity-0 group-hover:opacity-100"
                                      title="Configurar cliente"
                                    >
                                      <Settings className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            </React.Fragment>
                            );
                          }))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activePage === 'detail' && (
                <AccountDetailView 
                  accounts={accounts}
                  visibleAccountIds={visibleAccountIds}
                  settings={settings}
                  onSaveSettings={handleSaveSettings}
                  dateRange={dateRange}
                  setDateRange={setDateRange}
                  isCustomDate={isCustomDate}
                  setIsCustomDate={setIsCustomDate}
                  onRefresh={loadData}
                />
              )}
              {activePage === 'accounts' && (
                <div className="animate-in fade-in duration-500 max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
                  {/* --- SECCIÓN 1: CUENTAS INDIVIDUALES --- */}
                  <div className="bg-[#111] rounded-lg border border-white/5 overflow-hidden shadow-2xl p-8 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Cuentas Visibles</h3>
                        <p className="text-[10px] font-bold text-neutral-600 mt-1 uppercase tracking-widest">Selecciona qué cuentas mostrar en el panel</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            const allIds = accounts.map(a => a.id);
                            setVisibleAccountIds(allIds);
                            localStorage.setItem('cr_visible_accounts', JSON.stringify(allIds));
                          }}
                          className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:bg-blue-500/10 px-3 py-2 rounded-lg transition-all border border-blue-500/20"
                        >
                          Todas
                        </button>
                        <button 
                          onClick={() => {
                            setVisibleAccountIds([]);
                            localStorage.setItem('cr_visible_accounts', JSON.stringify([]));
                          }}
                          className="text-[9px] font-black text-neutral-600 uppercase tracking-widest hover:bg-white/5 px-3 py-2 rounded-xl transition-all border border-white/5"
                        >
                          Ninguna
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                      {accounts.map(acc => {
                        const isVisible = visibleAccountIds.some(v => matchId(v, acc.id));
                        return (
                          <button
                            key={acc.id}
                            onClick={() => toggleAccountVisibility(acc.id)}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-lg border transition-all",
                              isVisible 
                                ? "bg-blue-600/10 border-blue-600/30 text-white" 
                                : "bg-transparent border-white/5 text-neutral-500 hover:bg-white/[0.02]"
                            )}
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className={cn("w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0", isVisible ? "bg-blue-600 border-blue-600" : "bg-transparent border-neutral-700")}>
                                {isVisible && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                              </div>
                              <div className="text-left truncate">
                                <div className="text-[11px] font-bold truncate tracking-tight">{acc.name}</div>
                                <div className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest truncate">{acc.account_id}</div>
                              </div>
                            </div>
                            <div className="text-[9px] font-black uppercase tracking-widest bg-neutral-900 px-2 py-1 rounded shrink-0 ml-2">
                              {acc.currency}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* --- SECCIÓN 2: GRUPOS DE CLIENTE --- */}
                  <div className="bg-[#111] rounded-lg border border-white/5 overflow-hidden shadow-2xl p-8 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Grupos de cliente</h3>
                        <p className="text-[10px] font-bold text-neutral-600 mt-1 uppercase tracking-widest">Agrupa múltiples cuentas en una sola entidad</p>
                      </div>
                      <button 
                        onClick={() => {
                          setGroupModal({ isOpen: true, type: 'create', inputValue: '' });
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2"
                      >
                        <Settings2 className="w-3 h-3" />
                        Nuevo Grupo
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {groups.length === 0 && (
                        <div className="col-span-full py-8 text-center bg-white/[0.02] rounded-2xl border border-dashed border-white/5">
                          <p className="text-xs text-neutral-600 font-bold uppercase tracking-widest">No hay grupos creados</p>
                        </div>
                      )}
                      {groups.filter(g => g && g.id).map(group => (
                        <div key={group.id} className="bg-[#1c1c1c] p-6 rounded-lg border border-white/5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="font-black text-neutral-100">{group.name}</div>
                              <button 
                                onClick={() => {
                                  setGroupModal({ 
                                    isOpen: true, 
                                    type: 'edit', 
                                    group: group, 
                                    inputValue: group.name 
                                  });
                                }}
                                className="p-1 hover:bg-neutral-800 rounded text-neutral-600 hover:text-white transition-all"
                              >
                                <Settings2 className="w-3 h-3" />
                              </button>
                            </div>
                            <button 
                              onClick={() => {
                                setGroupModal({ 
                                  isOpen: true, 
                                  type: 'delete', 
                                  group: group, 
                                  inputValue: '' 
                                });
                              }}
                              className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-all"
                            >
                              <LogOut className="w-4 h-4 rotate-90" />
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                             <div className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Cuentas vinculadas:</div>
                             {(group.accountIds || []).length === 0 && <div className="text-xs text-neutral-500 italic">Sin cuentas asignadas</div>}
                             <div className="space-y-1">
                               {(group.accountIds || []).map(accId => {
                                 const acc = accounts.find(a => a.id === accId);
                                 return (
                                   <div key={accId} className="flex items-center justify-between text-[10px] font-bold text-neutral-400 bg-black/20 px-3 py-2 rounded-lg group/acc">
                                     <span className="truncate">{acc?.name || accId}</span>
                                     <button 
                                       onClick={() => {
                                         saveGroups(groups.map(g => g?.id === group.id ? { ...g, accountIds: (g.accountIds || []).filter(id => id !== accId) } : g));
                                       }}
                                       className="text-neutral-700 hover:text-red-500 transition-all opacity-0 group-hover/acc:opacity-100"
                                     >
                                       Quitar
                                     </button>
                                   </div>
                                 );
                               })}
                             </div>
                          </div>

                          <GroupAccountSelector 
                            accounts={accounts.filter(a => !(group.accountIds || []).includes(a.id))}
                            onSelect={(accId) => {
                              saveGroups(groups.map(g => g?.id === group.id ? { ...g, accountIds: [...new Set([...(g.accountIds || []), accId])] } : g));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activePage === 'strategy' && (
                <div className="space-y-0 relative">
                  <div className="bg-[#111] p-0 rounded-lg border border-white/0 lg:border-white/5 space-y-0 animate-in fade-in duration-700">
                    {loadingStructure && (
                      <div className="h-[500px] flex flex-col items-center justify-center gap-4 bg-black/20 rounded-lg border border-white/5">
                        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] animate-pulse">Sincronizando jerarquía de Meta Ads...</span>
                      </div>
                    )}

                    {structure && !loadingStructure && (
                      <div className="h-[730px] animate-in zoom-in-95 duration-500">
                        <StrategyCanvas 
                          accountId={(structure as any).activeAccId}
                          campaigns={structure.campaigns}
                          adsets={structure.adsets}
                          ads={structure.ads}
                        />
                      </div>
                    )}

                    {!structure && !loadingStructure && (
                      <div className="h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-lg gap-6 group">
                        <div className="p-6 bg-white/5 rounded-full group-hover:scale-110 transition-transform duration-500">
                          <Share2 className="w-10 h-10 text-neutral-700" />
                        </div>
                        <div className="text-center space-y-2">
                          <p className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.2em]">Lienzo de Planificación Vacío</p>
                          <p className="text-[9px] font-bold text-neutral-700 uppercase tracking-widest leading-relaxed">Selecciona un cliente de la lista superior para<br/>generar el diagrama de flujo automático.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Individual Report View (Overlay) */}
      {reportAccount && (
        <IndividualReport 
          account={reportAccount}
          settings={settings[reportAccount.id] || { objective: 0, budget: 0, currency: reportAccount.currency || 'ARS', tracking: 'ecommerce' }}
          dateLabel={`${dateRange.since} — ${dateRange.until}`}
          onClose={() => setReportAccount(null)}
        />
      )}

      {/* Config Modal (Local Component) */}
      <AnimatePresence>
        {configEntity && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfigEntity(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            ></motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#161616] border border-white/10 rounded-2xl shadow-2xl p-10 overflow-hidden"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 blur-[80px] rounded-full"></div>
              
              <div className="relative">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">{configEntity.name}</h3>
                    <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mt-1">Configuración del cliente</p>
                  </div>
                  <button onClick={() => setConfigEntity(null)} className="p-2 hover:bg-white/5 rounded-full text-neutral-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-2 ml-1">Objetivo Mensual</label>
                      <input 
                        type="number"
                        defaultValue={overviewSettings[configEntity.id]?.objective || 0}
                        id="set_objective"
                        className="w-full bg-black/40 border border-white/5 rounded-lg px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-2 ml-1">Presupuesto</label>
                      <input 
                        type="number"
                        defaultValue={overviewSettings[configEntity.id]?.budget || 0}
                        id="set_budget"
                        className="w-full bg-black/40 border border-white/5 rounded-lg px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-2 ml-1">Moneda</label>
                      <select 
                        id="set_currency"
                        defaultValue={overviewSettings[configEntity.id]?.currency || 'ARS'}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                      >
                        <option value="ARS">ARS ($)</option>
                        <option value="USD">USD (U$D)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="BRL">BRL (R$)</option>
                        <option value="CLP">CLP ($)</option>
                        <option value="MXN">MXN ($)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-2 ml-1">Tracking</label>
                      <select 
                        id="set_tracking"
                        defaultValue={overviewSettings[configEntity.id]?.tracking || 'ecommerce'}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                      >
                        <option value="ecommerce">Solo E-commerce</option>
                        <option value="messaging">Solo Mensajes</option>
                        <option value="both">Ambos (Ecom + Msg)</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      const obj = Number((document.getElementById('set_objective') as HTMLInputElement).value);
                      const bud = Number((document.getElementById('set_budget') as HTMLInputElement).value);
                      const cur = (document.getElementById('set_currency') as HTMLSelectElement).value;
                      const trk = (document.getElementById('set_tracking') as HTMLSelectElement).value as any;

                      const newSettings = {
                        ...settings,
                        [configEntity.id]: {
                          ...(settings[configEntity.id] || {}),
                          objective: obj,
                          budget: bud,
                          currency: cur,
                          tracking: trk
                        }
                      };
                      setSettings(newSettings);
                      localStorage.setItem('cr_settings', JSON.stringify(newSettings));
                      setConfigEntity(null);
                    }}
                    className="w-full bg-blue-600 text-white h-14 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Group Management Modal */}
      <AnimatePresence>
        {groupModal.isOpen && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGroupModal({ ...groupModal, isOpen: false })}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-lg shadow-2xl p-8 overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-600/10 blur-3xl rounded-full" />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-white tracking-widest uppercase">
                      {groupModal.type === 'create' ? 'Nuevo Grupo' : groupModal.type === 'edit' ? 'Editar Grupo' : 'Eliminar Grupo'}
                    </h3>
                    <p className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest mt-1">
                      {groupModal.type === 'delete' ? 'Esta acción no se puede deshacer' : 'Configura las propiedades del grupo'}
                    </p>
                  </div>
                  <button 
                    onClick={() => setGroupModal({ ...groupModal, isOpen: false })}
                    className="p-2 hover:bg-white/5 rounded-full text-neutral-600 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {groupModal.type !== 'delete' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-2 ml-1">Nombre del Grupo</label>
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="Ej: Marca Premium VIP"
                        value={groupModal.inputValue}
                        onChange={(e) => setGroupModal({ ...groupModal, inputValue: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && groupModal.inputValue) {
                            const name = groupModal.inputValue;
                            if (groupModal.type === 'create') {
                              saveGroups([...groups, { id: Math.random().toString(36).substr(2, 9), name, accountIds: [] }]);
                            } else if (groupModal.group) {
                              saveGroups(groups.map(g => g.id === groupModal.group?.id ? { ...g, name } : g));
                            }
                            setGroupModal({ ...groupModal, isOpen: false });
                          }
                        }}
                        className="w-full bg-black/50 border border-white/5 rounded-lg px-4 py-3.5 text-xs text-white font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-neutral-800"
                      />
                    </div>
                    
                    <button 
                      disabled={!groupModal.inputValue}
                      onClick={() => {
                        const name = groupModal.inputValue;
                        if (groupModal.type === 'create') {
                          saveGroups([...groups, { id: Math.random().toString(36).substr(2, 9), name, accountIds: [] }]);
                        } else if (groupModal.group) {
                          saveGroups(groups.map(g => g.id === groupModal.group?.id ? { ...g, name } : g));
                        }
                        setGroupModal({ ...groupModal, isOpen: false });
                      }}
                      className="w-full bg-blue-600 disabled:opacity-20 text-white h-12 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"
                    >
                      {groupModal.type === 'create' ? 'Crear Grupo' : 'Guardar Cambios'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p className="text-xs text-neutral-400 font-bold text-center leading-relaxed px-4">
                      ¿Seguro que quieres eliminar el grupo <span className="text-white">"{groupModal.group?.name}"</span>? Las cuentas vinculadas volverán a mostrarse individualmente.
                    </p>
                    <div className="grid grid-cols-2 gap-3 mt-8">
                       <button 
                         onClick={() => setGroupModal({ ...groupModal, isOpen: false })}
                         className="h-12 rounded-lg text-[10px] font-black uppercase tracking-widest text-neutral-600 hover:text-white hover:bg-white/5 transition-all"
                       >
                         Cancelar
                       </button>
                       <button 
                         onClick={() => {
                           if (groupModal.group) {
                             saveGroups(groups.filter(g => g.id !== groupModal.group?.id));
                           }
                           setGroupModal({ ...groupModal, isOpen: false });
                         }}
                         className="h-12 rounded-lg bg-red-600/10 border border-red-600/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                       >
                         Eliminar
                       </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const AccountSelectorDropdown: React.FC<{
  label: string;
  accounts: AdAccount[];
  activeId?: string;
  onSelect: (acc: AdAccount) => void;
  variant: 'blue' | 'neutral';
}> = ({ label, accounts, activeId, onSelect, variant }) => {
  const [isOpen, setIsOpen] = useState(false);
  const activeAccount = accounts.find(a => a.id === activeId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-black/40 border border-white/5 rounded-lg pl-3 pr-2 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-between group",
          activeAccount ? "text-white border-white/20" : "text-neutral-500 hover:border-white/10"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", variant === 'blue' ? "bg-blue-500" : "bg-neutral-700")} />
          <span className="truncate opacity-50 mr-1">{label}:</span>
          <span className="truncate">{activeAccount ? activeAccount.name : `...`}</span>
        </div>
        <ChevronDown className={cn("w-3 h-3 transition-transform opacity-40 ml-1 shrink-0", isOpen ? "rotate-180" : "")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.98 }}
              className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl overflow-hidden max-h-64 overflow-y-auto custom-scrollbar"
            >
              {accounts.length === 0 ? (
                <div className="p-4 text-center text-[10px] font-bold text-neutral-600 uppercase tracking-widest italic">
                  No hay cuentas disponibles
                </div>
              ) : (
                accounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      onSelect(acc);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-5 py-4 hover:bg-blue-600 text-neutral-300 hover:text-white transition-colors text-[11px] font-bold border-b border-white/5 last:border-0 flex items-center justify-between",
                      activeId === acc.id ? "bg-blue-600/20 text-white" : ""
                    )}
                  >
                    <span>{acc.name}</span>
                    {activeId === acc.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />}
                  </button>
                ))
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const GroupAccountSelector: React.FC<{
  accounts: AdAccount[];
  onSelect: (id: string) => void;
}> = ({ accounts, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:border-blue-600/30 transition-all flex items-center justify-between group"
      >
        <span>+ Añadir cuenta al grupo</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen ? "rotate-180" : "")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
            >
              {accounts.length === 0 ? (
                <div className="p-4 text-center text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                  No hay más cuentas disponibles
                </div>
              ) : (
                accounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      onSelect(acc.id);
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-blue-600 text-neutral-300 hover:text-white transition-colors text-[11px] font-bold border-b border-white/5 last:border-0"
                  >
                    {acc.name}
                  </button>
                ))
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

interface SortableHeaderProps {
  id: string;
  label: string;
  width: string;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ id, label, width }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging ? 0.8 : 1
  };

  return (
    <th 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "py-3 text-[9px] font-black text-neutral-700 uppercase tracking-[0.2em] text-center cursor-grab active:cursor-grabbing hover:bg-white/[0.02] transition-colors relative group",
        width
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center justify-center gap-1">
        <GripVertical className="w-2.5 h-2.5 opacity-0 group-hover:opacity-50 transition-opacity whitespace-nowrap" />
        <span className="truncate">{label}</span>
      </div>
    </th>
  );
}
