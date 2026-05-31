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
import { calculateEffectiveBalance } from './lib/utils';
import { 
  AdAccount, 
  AccountSettings, 
  AccountGroup, 
  ClientCategory, 
  Campaign, 
  AdSet, 
  Ad, 
  AlertRule, 
  InAppNotification, 
  AccountNote,
  OfflineSaleEntry
} from './types';
import { Sidebar } from './components/Sidebar';
import { IndividualReport } from './components/IndividualReport';
import { Overview } from './components/Overview';
import { AccountDetailView, RocketLoader } from './components/AccountDetailView';
import { StrategyCanvas } from './components/StrategyCanvas';
import { AlertsSection } from './components/AlertsSection';
import { ReportsSection } from './components/ReportsSection';
import FloatingAssistant from './components/FloatingAssistant';
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
  ChevronRight,
  LogOut,
  RefreshCcw,
  CheckCircle2,
  X,
  GripVertical,
  Bell,
  Search,
  FileText,
  Network,
  Loader2,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, subDays, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
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

  const [dateRange, setDateRange] = useState({
    since: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    until: format(new Date(), 'yyyy-MM-dd')
  });
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [tempSince, setTempSince] = useState(dateRange.since);
  const [tempUntil, setTempUntil] = useState(dateRange.until);

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd');

  const periodKey = format(parseISO(dateRange.since), 'yyyy-MM');

  const [settings, setSettings] = useState<Record<string, AccountSettings>>(() => {
    try {
      const saved = localStorage.getItem('cr_settings');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [agencySettings, setAgencySettings] = useState<{agencyName: string, logoUrl: string}>(() => {
    try {
      const saved = localStorage.getItem('cr_agency_settings');
      return saved ? JSON.parse(saved) : { agencyName: '', logoUrl: '' };
    } catch {
      return { agencyName: '', logoUrl: '' };
    }
  });

  const [orionSettings, setOrionSettings] = useState<{voiceType: string, capabilities: {notes: boolean, offlineSales: boolean, analyze: boolean}}>(() => {
    try {
      const saved = localStorage.getItem('cr_orion_settings');
      return saved ? JSON.parse(saved) : { voiceType: 'es-US-Neural2-C', capabilities: { notes: true, offlineSales: true, analyze: true } };
    } catch {
      return { voiceType: 'es-US-Neural2-C', capabilities: { notes: true, offlineSales: true, analyze: true } };
    }
  });

  const [previewVoiceType, setPreviewVoiceType] = useState<string>(orionSettings.voiceType);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  useEffect(() => {
    localStorage.setItem('cr_agency_settings', JSON.stringify(agencySettings));
  }, [agencySettings]);

  useEffect(() => {
    localStorage.setItem('cr_orion_settings', JSON.stringify(orionSettings));
  }, [orionSettings]);

  const [notes, setNotes] = useState<AccountNote[]>(() => {
    try {
      const saved = localStorage.getItem('cr_notes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [alertRules, setAlertRules] = useState<AlertRule[]>(() => {
    try {
      const saved = localStorage.getItem('cr_alert_rules');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('cr_alert_rules', JSON.stringify(alertRules));
  }, [alertRules]);

  useEffect(() => {
    localStorage.setItem('cr_notes', JSON.stringify(notes));
  }, [notes]);
  
  const [reportAccount, setReportAccount] = useState<AdAccount | null>(null);
  const [showColSelectors, setShowColSelectors] = useState(false);
  const [accountSelectionSearch, setAccountSelectionSearch] = useState('');
  const [notifications, setNotifications] = useState<InAppNotification[]>(() => {
    const saved = localStorage.getItem('cr_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    localStorage.setItem('cr_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (!isLogged || accounts.length === 0 || alertRules.length === 0) return;

    const newNotifications: InAppNotification[] = [];
    const now = new Date();

    alertRules.forEach(rule => {
      if (!rule.isActive) return;

      const accsToCheck = rule.accountId === 'all' 
        ? accounts 
        : accounts.filter(a => a.id === rule.accountId);

      accsToCheck.forEach(acc => {
        let trigger = false;
        let currentValue = 0;

        if (rule.metric === 'balance') {
          const effBal = calculateEffectiveBalance(acc);
          if (effBal !== null) {
            currentValue = effBal;
            if (rule.condition === 'less_than' && currentValue <= rule.value) trigger = true;
            if (rule.condition === 'greater_than' && currentValue >= rule.value) trigger = true;
          }
        } else if (rule.metric === 'roas') {
          currentValue = (acc.spend && acc.revenue && acc.spend > 0) ? acc.revenue / acc.spend : 0;
          if (rule.condition === 'less_than' && currentValue <= rule.value) trigger = true;
        } else if (rule.metric === 'spend') {
          currentValue = acc.spend || 0;
          if (rule.condition === 'greater_than' && currentValue >= rule.value) trigger = true;
        }

        if (trigger) {
          const alreadyNotified = notifications.some(n => 
            n.ruleId === rule.id && 
            n.accountId === acc.id && 
            (now.getTime() - new Date(n.timestamp).getTime()) < 24 * 60 * 60 * 1000
          );

          if (!alreadyNotified) {
            newNotifications.push({
              id: Math.random().toString(36).substr(2, 9),
              ruleId: rule.id,
              accountId: acc.id,
              title: `Alerta: ${rule.name}`,
              message: `La cuenta ${acc.name} ha activado la regla "${rule.name}". Valor actual: ${currentValue.toFixed(2)}.`,
              timestamp: now.toISOString(),
              isRead: false,
              severity: rule.type === 'performance' ? 'medium' : 'high'
            });
          }
        }
      });
    });

    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev].slice(0, 50));
    }
  }, [isLogged, accounts, alertRules]);

  const [configEntity, setConfigEntity] = useState<AdAccount | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const [structure, setStructure] = useState<{
    campaigns: Campaign[];
    adsets: AdSet[];
    ads: Ad[];
  } | null>(null);
  const [loadingStructure, setLoadingStructure] = useState(false);

  const [accountGroupModal, setAccountGroupModal] = useState<{ 
    isOpen: boolean; 
    type: 'create' | 'edit' | 'delete'; 
    group?: AccountGroup;
    inputValue: string;
  }>({ 
    isOpen: false, 
    type: 'create', 
    inputValue: '' 
  });

  const [categoryModal, setCategoryModal] = useState<{
    isOpen: boolean;
    type: 'create' | 'edit' | 'delete';
    category?: ClientCategory;
    inputValue: string;
  }>({
    isOpen: false,
    type: 'create',
    inputValue: ''
  });

  const [visibleAccountIds, setVisibleAccountIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cr_visible_accounts');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>(() => {
    try {
      const saved = localStorage.getItem('cr_groups');
      const parsed = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(g => g && typeof g === 'object' && g.id).map(g => ({
        ...g,
        accountIds: Array.isArray(g.accountIds) ? g.accountIds : []
      }));
    } catch {
      return [];
    }
  });

  const [clientCategories, setClientCategories] = useState<ClientCategory[]>(() => {
    try {
      const saved = localStorage.getItem('cr_client_categories');
      if (saved) return JSON.parse(saved);
      return [
        { id: 'independiente', name: 'Independientes' },
        { id: 'agencia', name: 'Agencia' }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('cr_client_categories', JSON.stringify(clientCategories));
  }, [clientCategories]);

  useEffect(() => {
    if (activePage === 'strategy' && !structure && !loadingStructure && accounts.length > 0) {
      const firstAcc = accounts.find(a => visibleAccountIds.includes(a.id)) || accounts[0];
      if (firstAcc) {
        setLoadingStructure(true);
        fetchAccountStructure(firstAcc.id).then(data => {
          setStructure({ ...data, activeAccId: firstAcc.id } as any);
          setLoadingStructure(false);
        }).catch(err => {
          console.error("Error auto-loading structure:", err);
          setLoadingStructure(false);
        });
      }
    }
  }, [activePage, accounts, visibleAccountIds, structure, loadingStructure]);

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
      
      setVisibleAccountIds(currentVisible => {
        const stored = localStorage.getItem('cr_visible_accounts');
        if (stored === null && detailedAccs.length > 0) {
          const allIds = detailedAccs.map(a => a.id);
          localStorage.setItem('cr_visible_accounts', JSON.stringify(allIds));
          return allIds;
        }
        
        const hasVisibleMatches = detailedAccs.some(a => 
          currentVisible.some(vId => matchId(vId, a.id) || matchId(vId, a.account_id))
        );
        
        if (detailedAccs.length > 0 && currentVisible.length > 0 && !hasVisibleMatches) {
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
  }, [dateRange, isLogged]);

  useEffect(() => {
    if (isLogged) {
      loadData();
    }
  }, [dateRange, isLogged]);

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

  const handleAddOfflineSaleLog = (accountId: string, amount: number, date: string, customId?: string) => {
    const accSettings = settings[accountId] || { objective: 0, budget: 0, currency: 'ARS', tracking: 'ecommerce' as const };
    const periodKey = date.substring(0, 7); // YYYY-MM
    const currentLogs = accSettings.offlineSalesLogByMonth?.[periodKey] || [];
    
    const newEntry: OfflineSaleEntry = {
      id: customId || Math.random().toString(36).substring(2, 11),
      amount,
      note: 'Registrado vía asistente de voz',
      date
    };

    const updatedSettings: AccountSettings = {
      ...accSettings,
      offlineSalesLogByMonth: {
        ...(accSettings.offlineSalesLogByMonth || {}),
        [periodKey]: [...currentLogs, newEntry]
      }
    };

    handleSaveSettings(accountId, updatedSettings);
  };

  const handleUpdateOfflineSaleLog = (
    accountId: string,
    entryId: string,
    updatedFields: Partial<OfflineSaleEntry>
  ) => {
    const accSettings = settings[accountId] || { objective: 0, budget: 0, currency: 'ARS', tracking: 'ecommerce' as const };
    const logsByMonth = { ...(accSettings.offlineSalesLogByMonth || {}) };
    
    let foundEntry: OfflineSaleEntry | null = null;
    let oldPeriodKey: string | null = null;

    // 1. Locate and remove the entry from its current month list
    for (const periodKey of Object.keys(logsByMonth)) {
      const idx = logsByMonth[periodKey].findIndex(e => e.id === entryId);
      if (idx !== -1) {
        foundEntry = { ...logsByMonth[periodKey][idx] };
        oldPeriodKey = periodKey;
        logsByMonth[periodKey] = logsByMonth[periodKey].filter(e => e.id !== entryId);
        if (logsByMonth[periodKey].length === 0) {
          delete logsByMonth[periodKey];
        }
        break;
      }
    }

    if (!foundEntry) {
      console.warn(`No se encontró el registro de venta con ID ${entryId} para actualizar.`);
      return;
    }

    // 2. Apply updates
    const updatedEntry: OfflineSaleEntry = {
      ...foundEntry,
      ...updatedFields
    };

    // 3. Determine new periodKey (month) and place the updated entry
    const newPeriodKey = updatedEntry.date.substring(0, 7); // YYYY-MM
    const currentNewPeriodLogs = logsByMonth[newPeriodKey] || [];
    logsByMonth[newPeriodKey] = [...currentNewPeriodLogs, updatedEntry];

    // 4. Save updated settings
    const updatedSettings: AccountSettings = {
      ...accSettings,
      offlineSalesLogByMonth: logsByMonth
    };

    handleSaveSettings(accountId, updatedSettings);
  };

  const handleDeleteOfflineSaleLog = (accountId: string, entryId: string) => {
    const accSettings = settings[accountId] || { objective: 0, budget: 0, currency: 'ARS', tracking: 'ecommerce' as const };
    const logsByMonth = { ...(accSettings.offlineSalesLogByMonth || {}) };
    
    let deleted = false;
    for (const periodKey of Object.keys(logsByMonth)) {
      const initialLength = logsByMonth[periodKey].length;
      logsByMonth[periodKey] = logsByMonth[periodKey].filter(e => e.id !== entryId);
      if (logsByMonth[periodKey].length < initialLength) {
        deleted = true;
        if (logsByMonth[periodKey].length === 0) {
          delete logsByMonth[periodKey];
        }
        break;
      }
    }

    if (deleted) {
      const updatedSettings: AccountSettings = {
        ...accSettings,
        offlineSalesLogByMonth: logsByMonth
      };
      handleSaveSettings(accountId, updatedSettings);
    }
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

  const saveAccountGroups = (newGroups: AccountGroup[]) => {
    setAccountGroups(newGroups);
    localStorage.setItem('cr_groups', JSON.stringify(newGroups));
  };

  const { overviewEntities, overviewSettings } = React.useMemo(() => {
    try {
      const activeAccounts = accounts || [];
      const currentVisibleIds = Array.isArray(visibleAccountIds) ? visibleAccountIds : [];
      const currentGroups = Array.isArray(accountGroups) ? accountGroups : [];
      
      const entities: AdAccount[] = [];
      const virtualSettings: Record<string, AccountSettings> = { ...(settings || {}) };
      const handledAccountIds = new Set<string>();

      currentGroups.forEach(g => {
        if (!g) return;
        const gAccs = activeAccounts.filter(a => 
          (g.accountIds || []).some(id => matchId(id, a.id) || matchId(id, a.account_id))
        );

        if (gAccs.length > 0) {
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
             gAccs.forEach(a => handledAccountIds.add(a.id?.toString()));
          }
        }
      });

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
  }, [accounts, accountGroups, visibleAccountIds, settings]);

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[#111] rounded-[2.5rem] border border-white/5 p-10 shadow-2xl overflow-hidden relative"
        >
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 blur-[80px] rounded-full"></div>
          
          <div className="flex flex-col items-center mb-10 relative">
            <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl shadow-blue-600/40 transform -rotate-6">
              <BarChart3 className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white">Orion Metrics</h1>
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

  const fallbackSpeechSynthesis = (text: string) => {
    if (!window.speechSynthesis) {
      setIsTestingVoice(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.15;
    utterance.pitch = 0.52;

    const voices = window.speechSynthesis.getVoices();
    const spanishVoices = voices.filter(v => v.lang.startsWith('es'));
    const preferredVoice = 
      spanishVoices.find(v => (v.lang === 'es-MX' || v.lang === 'es-US' || v.lang === 'es-AR') && v.name.toLowerCase().includes('natural')) ||
      spanishVoices.find(v => v.name.toLowerCase().includes('sabina')) || 
      spanishVoices.find(v => v.lang === 'es-MX' || v.lang === 'es-US' || v.lang === 'es-AR' || v.lang === 'es-419') ||
      spanishVoices.find(v => v.name.toLowerCase().includes('google') && !v.name.toLowerCase().includes('españa')) ||
      spanishVoices[0] || null;

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => setIsTestingVoice(false);
    utterance.onerror = () => setIsTestingVoice(false);
    window.speechSynthesis.speak(utterance);
  };

  const playVoiceTest = async () => {
    setIsTestingVoice(true);
    const testText = "Hola. Esta es una prueba de la voz seleccionada.";
    try {
      const response = await fetch('/orion/tts-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testText, voiceName: previewVoiceType }),
      });
      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audioObj = new Audio(audioUrl);
        audioObj.onended = () => {
          setIsTestingVoice(false);
          URL.revokeObjectURL(audioUrl);
        };
        audioObj.onerror = () => {
          setIsTestingVoice(false);
          fallbackSpeechSynthesis(testText);
        };
        audioObj.play().catch((e) => {
          console.error("Audio playback error by browser. Redirecting to SpeechSynthesis.", e);
          fallbackSpeechSynthesis(testText);
        });
      } else if (response.status === 503 || response.status === 500) {
        const errObj = await response.json().catch(() => ({}));
        alert(`Google Cloud TTS api error: ${response.status} - ${errObj.error || 'Unknown'}. Usando voz basica de respaldo.`);
        fallbackSpeechSynthesis(testText);
      } else {
        alert("Google TTS failed with status: " + response.status + ". Using fallback browser synthesis.");
        fallbackSpeechSynthesis(testText);
      }
    } catch (e) {
      console.error(e);
      fallbackSpeechSynthesis(testText);
    }
  };

  const handleSaveVoice = () => {
    setOrionSettings({ ...orionSettings, voiceType: previewVoiceType });
  };

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
                 activePage === 'alerts' ? 'Centro de Alertas' :
                 activePage === 'reports' ? 'Informes Mensuales' :
                 activePage === 'user_settings' ? 'Perfil de Usuario' :
                 activePage === 'orion_settings' ? 'Configuración de Orión' :
                 activePage === 'strategy' ? 'Lienzo Estratégico' : activePage}
                {activePage === 'strategy' && (
                  <div className="px-1.5 py-0.5 bg-blue-600/10 border border-blue-600/20 rounded-full text-[8px] text-blue-500 uppercase tracking-widest">Planificación</div>
                )}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              {activePage === 'strategy' && (
                <div className="flex items-center gap-2 bg-[#111] p-1 rounded-lg border border-white/5 animate-in slide-in-from-right-4 duration-500">
                   <div className="flex items-center gap-2 w-[320px] sm:w-[400px]">
                      <div className="flex-1 min-w-0">
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
                      <div className="flex-1 min-w-0">
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
              )}

              {/* Notification Bell */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${notifications.some(n => !n.isRead) ? 'bg-blue-600/10 border-blue-600/20 text-blue-500' : 'bg-[#111] border-white/5 text-neutral-500 hover:text-white'}`}
                >
                  <Bell className={`w-5 h-5 ${notifications.some(n => !n.isRead) ? 'animate-pulse' : ''}`} />
                  {notifications.filter(n => !n.isRead).length > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-[8px] font-black text-white border-2 border-[#0a0a0a]">
                      {notifications.filter(n => !n.isRead).length}
                    </div>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-3 w-80 bg-[#161616] border border-white/10 rounded-2xl shadow-2xl z-[500] overflow-hidden"
                    >
                      <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Notificaciones</h3>
                        <button 
                          onClick={() => setNotifications(notifications.map(n => ({...n, isRead: true})))}
                          className="text-[9px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-widest"
                        >
                          Marcar leídas
                        </button>
                      </div>
                      <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-neutral-600">
                            <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                            <p className="text-[9px] font-black uppercase tracking-widest">Sin notificaciones</p>
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div key={n.id} className={`p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors relative ${!n.isRead ? 'bg-blue-600/[0.02]' : ''}`}>
                              {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />}
                              <div className="flex items-start gap-3">
                                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.severity === 'high' ? 'bg-red-500' : n.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                <div className="space-y-1">
                                  <p className="text-[11px] font-black text-white leading-tight uppercase tracking-tight">{n.title}</p>
                                  <p className="text-[10px] text-neutral-500 font-medium leading-relaxed">{n.message}</p>
                                  <p className="text-[8px] text-neutral-700 font-black uppercase tracking-widest pt-1">{format(new Date(n.timestamp), 'HH:mm dd/MM')}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <button 
                          onClick={() => setNotifications([])}
                          className="w-full p-3 text-[9px] font-black text-neutral-600 hover:text-red-500 uppercase tracking-widest border-t border-white/5 bg-black/20"
                        >
                          Limpiar todo
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {activePage === 'overview' && (
              <div className="flex items-center gap-1.5 bg-[#111] border border-white/5 px-3.5 h-10 rounded-xl transition-all">
                <Calendar className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
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
                  className="bg-transparent text-[9px] font-black text-neutral-200 uppercase tracking-widest outline-none cursor-pointer border-none py-0.5 pr-1 focus:text-neutral-100"
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
                      className="bg-transparent text-[9px] font-bold text-neutral-300 outline-none w-[95px] py-0.5"
                    />
                    <span className="text-[9px] text-neutral-600 font-bold uppercase">a</span>
                    <input 
                      type="date" 
                      value={tempUntil}
                      onChange={(e) => setTempUntil(e.target.value)}
                      className="bg-transparent text-[9px] font-bold text-neutral-300 outline-none w-[95px] py-0.5"
                    />
                    <button
                      onClick={() => {
                        setDateRange({ since: tempSince, until: tempUntil });
                      }}
                      className="bg-blue-600/25 hover:bg-blue-600/40 text-blue-400 border border-blue-500/10 text-[9px] font-black px-2 py-0.5 rounded transition-all uppercase tracking-wider"
                    >
                      Aplicar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {loading || overviewEntities.length === 0 ? (
            <RocketLoader />
          ) : (
            <>
              {activePage === 'overview' && (
                <div className="space-y-10 animate-in fade-in duration-1000">
                  <Overview accounts={overviewEntities} settings={overviewSettings} dateRange={dateRange} clientCategories={clientCategories} loading={loading} />
                  
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
                              let manualRevenue = 0;
                              if (s.offlineSalesLogByMonth) {
                                const allEntries: any[] = [];
                                Object.values(s.offlineSalesLogByMonth).forEach((list: any) => {
                                  if (Array.isArray(list)) {
                                    allEntries.push(...list);
                                  }
                                });
                                if (allEntries.length > 0) {
                                  const filteredEntries = allEntries.filter(entry => entry.date >= dateRange.since && entry.date <= dateRange.until);
                                  manualRevenue = filteredEntries.reduce((sum, entry) => sum + entry.amount, 0);
                                } else {
                                  manualRevenue = s.manualRevenueByMonth?.[periodKey] || 0;
                                }
                              } else {
                                manualRevenue = s.manualRevenueByMonth?.[periodKey] || 0;
                              }
                              const totalRevenue = (acc.revenue || 0) + manualRevenue;
                              const roas = acc.spend && acc.spend > 0 ? totalRevenue / acc.spend : 0;
                              const progress = s.objective > 0 ? Math.min(totalRevenue / s.objective, 1.2) : 0;
                              const budgetProgress = s.budget > 0 ? Math.min((acc.spend || 0) / s.budget, 1.2) : 0;
                              
                              const getStatusInfo = () => {
                                const p = totalRevenue / (s.objective || 1);
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
                                                    const nextGroups = accountGroups.map(g => g.id === acc.id ? { ...g, name: editValue } : g);
                                                    saveAccountGroups(nextGroups);
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
                                          {formatCurrency(totalRevenue, s.currency)}
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
                            })
                          )}
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
                  notes={notes}
                  onAddNote={(note) => setNotes([...notes, note])}
                  onDeleteNote={(id) => setNotes(notes.filter(n => n.id !== id))}
                  clientCategories={clientCategories}
                  isSyncing={loading}
                />
              )}

              {activePage === 'reports' && (
                <div className="animate-in fade-in duration-500">
                  <ReportsSection 
                    accounts={accounts} 
                    visibleAccountIds={visibleAccountIds}
                    settings={settings} 
                    notes={notes} 
                    setDateRange={setDateRange}
                  />
                </div>
              )}

              {activePage === 'user_settings' && (
                <div className="animate-in fade-in duration-500 max-w-4xl mx-auto pb-20">
                  <div className="bg-[#111] rounded-lg border border-white/5 overflow-hidden shadow-2xl p-8 flex flex-col">
                    <div className="mb-8 border-b border-white/5 pb-4">
                      <h3 className="text-xl font-black text-white uppercase tracking-widest">Perfil de Usuario / Agencia</h3>
                      <p className="text-xs font-bold text-neutral-500 mt-1 uppercase tracking-widest">Configura la información que se mostrará en los informes</p>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Nombre de la Agencia o Profesional</label>
                        <input
                          type="text"
                          value={agencySettings.agencyName}
                          onChange={(e) => setAgencySettings({...agencySettings, agencyName: e.target.value})}
                          placeholder="Ej. Orion Media"
                          className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-white placeholder-neutral-700 outline-none focus:border-blue-600/50 transition-all font-bold shadow-inner"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">URL del Logo (Opcional)</label>
                        <input
                          type="url"
                          value={agencySettings.logoUrl}
                          onChange={(e) => setAgencySettings({...agencySettings, logoUrl: e.target.value})}
                          placeholder="https://ejemplo.com/logo.png"
                          className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-white placeholder-neutral-700 outline-none focus:border-blue-600/50 transition-all font-bold shadow-inner"
                        />
                        <p className="text-[10px] text-neutral-500 mt-2 font-medium">Este logo se utilizará al exportar los reportes PDF. Preferiblemente formato PNG con fondo transparente.</p>
                        
                        {agencySettings.logoUrl && (
                          <div className="mt-4 p-4 border border-white/5 rounded-xl bg-black/50 inline-block">
                            <img src={agencySettings.logoUrl} alt="Logo Preview" className="h-12 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activePage === 'orion_settings' && (
                <div className="animate-in fade-in duration-500 max-w-4xl mx-auto pb-20">
                  <div className="bg-[#111] rounded-lg border border-white/5 overflow-hidden shadow-2xl p-8 flex flex-col">
                    <div className="mb-8 border-b border-white/5 pb-4">
                      <h3 className="text-xl font-black text-white uppercase tracking-widest">Configuración de Orión</h3>
                      <p className="text-xs font-bold text-neutral-500 mt-1 uppercase tracking-widest">Ajustes del asistente inteligente de voz y texto</p>
                    </div>

                    <div className="space-y-8">
                      <div>
                        <h4 className="text-[13px] font-black text-neutral-200 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Settings2 className="w-4 h-4 text-amber-500" />
                          Voz del Sistema (Premium Neural)
                        </h4>
                        <div className="max-w-md space-y-4">
                          <select
                            value={previewVoiceType}
                            onChange={(e) => setPreviewVoiceType(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-amber-500/50 transition-all font-bold shadow-inner"
                          >
                            <option value="es-US-Neural2-C">Hombre - Castellano Neutro / Latino (Original)</option>
                            <option value="es-US-Neural2-A">Mujer 1 - Castellano Neutro / Latino</option>
                            <option value="es-US-Neural2-B">Hombre 2 - Castellano Neutro / Latino</option>
                            <option value="es-US-News-D">Hombre - EE.UU. Hispano (Noticias)</option>
                            <option value="es-US-News-F">Mujer - EE.UU. Hispano (Noticias)</option>
                            <option value="es-ES-Neural2-B">Hombre - España</option>
                            <option value="es-ES-Neural2-A">Mujer 1 - España</option>
                            <option value="es-ES-Neural2-C">Mujer 2 - España</option>
                            <option value="es-ES-Neural2-D">Mujer 3 - España</option>
                            <option value="es-ES-Neural2-E">Mujer 4 - España</option>
                            <option value="es-ES-Neural2-F">Hombre 2 - España</option>
                          </select>
                          
                          <div className="flex gap-3">
                            <button
                              onClick={playVoiceTest}
                              disabled={isTestingVoice}
                              className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 active:bg-white/5 text-white font-bold py-2.5 px-4 rounded-xl transition-all disabled:opacity-50"
                            >
                              {isTestingVoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                              Escuchar Prueba
                            </button>
                            <button
                              onClick={handleSaveVoice}
                              disabled={previewVoiceType === orionSettings.voiceType}
                              className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-500 text-black font-black py-2.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:bg-neutral-800 disabled:text-neutral-500"
                            >
                              {previewVoiceType === orionSettings.voiceType ? 'Voz Actual' : 'Definir Voz'}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[13px] font-black text-neutral-200 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Settings2 className="w-4 h-4 text-amber-500" />
                          Capacidades del Asistente
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="flex items-start gap-3 p-4 rounded-xl border border-white/5 bg-black/20 cursor-pointer hover:bg-white/[0.02] hover:border-white/10 transition-all">
                            <input
                              type="checkbox"
                              checked={orionSettings.capabilities.notes}
                              onChange={(e) => setOrionSettings({...orionSettings, capabilities: {...orionSettings.capabilities, notes: e.target.checked}})}
                              className="mt-1 shrink-0 rounded border-white/10 bg-black/50 text-amber-500 focus:ring-amber-500/20"
                            />
                            <div>
                              <div className="text-xs font-bold text-white mb-0.5">Tomar notas de voz</div>
                              <div className="text-[10px] text-neutral-500 leading-relaxed">Guardar automáticamente observaciones, aprendizajes y bitácoras dictadas por voz.</div>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 p-4 rounded-xl border border-white/5 bg-black/20 cursor-pointer hover:bg-white/[0.02] hover:border-white/10 transition-all">
                            <input
                              type="checkbox"
                              checked={orionSettings.capabilities.offlineSales}
                              onChange={(e) => setOrionSettings({...orionSettings, capabilities: {...orionSettings.capabilities, offlineSales: e.target.checked}})}
                              className="mt-1 shrink-0 rounded border-white/10 bg-black/50 text-amber-500 focus:ring-amber-500/20"
                            />
                            <div>
                              <div className="text-xs font-bold text-white mb-0.5">Anotar ventas offline</div>
                              <div className="text-[10px] text-neutral-500 leading-relaxed">Permite instruir por voz las ventas generadas en el local para corregir el ROAS real.</div>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 p-4 rounded-xl border border-white/5 bg-black/20 cursor-pointer hover:bg-white/[0.02] hover:border-white/10 transition-all">
                            <input
                              type="checkbox"
                              checked={orionSettings.capabilities.analyze}
                              onChange={(e) => setOrionSettings({...orionSettings, capabilities: {...orionSettings.capabilities, analyze: e.target.checked}})}
                              className="mt-1 shrink-0 rounded border-white/10 bg-black/50 text-amber-500 focus:ring-amber-500/20"
                            />
                            <div>
                              <div className="text-xs font-bold text-white mb-0.5">Análisis de cuentas</div>
                              <div className="text-[10px] text-neutral-500 leading-relaxed">Permite consultas en voz y respuestas estructuradas sobre el rendimiento en vivo de las cuentas.</div>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activePage === 'accounts' && (
                <div className="animate-in fade-in duration-500 max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
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

                    <div className="mb-6 relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-focus-within:text-blue-500 transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Buscar por nombre o ID de cuenta..."
                        value={accountSelectionSearch}
                        onChange={(e) => setAccountSelectionSearch(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-xl py-3.5 pl-11 pr-4 text-xs text-white placeholder-neutral-700 outline-none focus:border-blue-600/50 transition-all font-bold shadow-inner"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                      {accounts.filter(acc => 
                        acc.name.toLowerCase().includes(accountSelectionSearch.toLowerCase()) || 
                        acc.account_id.toLowerCase().includes(accountSelectionSearch.toLowerCase()) ||
                        acc.id.toLowerCase().includes(accountSelectionSearch.toLowerCase())
                      ).map(acc => {
                        const isVisible = visibleAccountIds.some(v => matchId(v, acc.id));
                        return (
                          <div
                            key={acc.id}
                            onClick={() => toggleAccountVisibility(acc.id)}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer",
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
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <div className="text-[9px] font-black uppercase tracking-widest bg-neutral-900 px-2 py-1 rounded">
                                {acc.currency}
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfigEntity(acc);
                                }}
                                className="p-1.5 hover:bg-white/10 rounded-md text-neutral-500 hover:text-white transition-all"
                                title="Configurar cuenta"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-[#111] rounded-lg border border-white/5 overflow-hidden shadow-2xl p-8 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Grupos de cuentas por cliente</h3>
                        <p className="text-[10px] font-bold text-neutral-600 mt-1 uppercase tracking-widest">Agrupa múltiples cuentas en una sola entidad</p>
                      </div>
                      <button 
                        onClick={() => {
                          setAccountGroupModal({ isOpen: true, type: 'create', inputValue: '' });
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2"
                      >
                        <Settings2 className="w-3 h-3" />
                        Nuevo Grupo
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {accountGroups.length === 0 && (
                        <div className="col-span-full py-8 text-center bg-white/[0.02] rounded-2xl border border-dashed border-white/5">
                          <p className="text-xs text-neutral-600 font-bold uppercase tracking-widest">No hay grupos creados</p>
                        </div>
                      )}
                      {accountGroups.filter(g => g && g.id).map(group => (
                        <div key={group.id} className="bg-[#1c1c1c] p-6 rounded-lg border border-white/5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="font-black text-neutral-100">{group.name}</div>
                              <button 
                                onClick={() => {
                                  setAccountGroupModal({ 
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
                                setAccountGroupModal({ 
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
                                         saveAccountGroups(accountGroups.map(g => g?.id === group.id ? { ...g, accountIds: (g.accountIds || []).filter(id => id !== accId) } : g));
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
                              saveAccountGroups(accountGroups.map(g => g?.id === group.id ? { ...g, accountIds: [...new Set([...(g.accountIds || []), accId])] } : g));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#111] rounded-lg border border-white/5 overflow-hidden shadow-2xl p-8 flex flex-col lg:col-span-2">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Grupos de clientes</h3>
                        <p className="text-[10px] font-bold text-neutral-600 mt-1 uppercase tracking-widest">Crea categorías para organizar tus clientes en el dashboard</p>
                      </div>
                      <button 
                        onClick={() => {
                          setCategoryModal({ isOpen: true, type: 'create', inputValue: '' });
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2"
                      >
                        <Settings2 className="w-3 h-3" />
                        Nuevo Grupo de Clientes
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {clientCategories.length === 0 && (
                        <div className="col-span-full py-8 text-center bg-white/[0.02] rounded-2xl border border-dashed border-white/5">
                          <p className="text-xs text-neutral-600 font-bold uppercase tracking-widest">No hay grupos de clientes creados</p>
                        </div>
                      )}
                      {clientCategories.map(cat => (
                        <div key={cat.id} className="bg-[#1c1c1c] p-5 rounded-xl border border-white/5 flex items-center justify-between group">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-white uppercase tracking-widest">{cat.name}</span>
                            <span className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest mt-0.5">ID: {cat.id}</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <button 
                              onClick={() => {
                                setCategoryModal({ 
                                  isOpen: true, 
                                  type: 'edit', 
                                  category: cat, 
                                  inputValue: cat.name 
                                });
                              }}
                              className="p-2 hover:bg-white/5 rounded-lg text-neutral-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Settings2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => {
                                setCategoryModal({ 
                                  isOpen: true, 
                                  type: 'delete', 
                                  category: cat, 
                                  inputValue: '' 
                                });
                              }}
                              className="p-2 hover:bg-red-500/10 rounded-lg text-neutral-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activePage === 'alerts' && (
                <div className="animate-in fade-in duration-500">
                  <AlertsSection 
                    accounts={accounts} 
                    rules={alertRules} 
                    onRulesChange={setAlertRules} 
                  />
                </div>
              )}

              {activePage === 'strategy' && (
                <div className="space-y-0 relative">
                  <div className="bg-[#111] p-0 rounded-lg border border-white/0 lg:border-white/5 space-y-0 animate-in fade-in duration-700">
                    {loadingStructure && (
                      <div className="h-[730px] flex items-center justify-center bg-black/20 rounded-lg border border-white/5">
                        <RocketLoader />
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
                          <Network className="w-10 h-10 text-neutral-700" />
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

      {reportAccount && (
        <IndividualReport 
          account={reportAccount}
          settings={settings[reportAccount.id] || { objective: 0, budget: 0, currency: reportAccount.currency || 'ARS', tracking: 'ecommerce' }}
          dateLabel={`${dateRange.since} — ${dateRange.until}`}
          onClose={() => setReportAccount(null)}
        />
      )}

      {/* Config Modal */}
      <FloatingAssistant
        accounts={accounts}
        accountGroups={accountGroups}
        notes={notes}
        orionSettings={orionSettings}
        onAddNote={(note) => setNotes([...notes, note])}
        onUpdateNote={(updatedNote) => setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n))}
        onDeleteNote={(noteId) => setNotes(prev => prev.filter(n => n.id !== noteId))}
        onAddOfflineSale={handleAddOfflineSaleLog}
        onUpdateOfflineSale={handleUpdateOfflineSaleLog}
        onDeleteOfflineSale={handleDeleteOfflineSaleLog}
        settings={settings}
        isSyncingGlobal={loading}
        onTriggerSync={loadData}
      />
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
                      <label className="block text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-2 ml-1">Grupo de Clientes</label>
                      <select 
                        id="set_category"
                        defaultValue={overviewSettings[configEntity.id]?.categoryId || ''}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                      >
                        <option value="">Sin Grupo</option>
                        {clientCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1">
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
                      const catId = (document.getElementById('set_category') as HTMLSelectElement).value;

                      const newSettings = {
                        ...settings,
                        [configEntity.id]: {
                          ...(settings[configEntity.id] || {}),
                          objective: obj,
                          budget: bud,
                          currency: cur,
                          tracking: trk,
                          categoryId: catId
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

      {/* Account Group Modal */}
      <AnimatePresence>
        {accountGroupModal.isOpen && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAccountGroupModal({ ...accountGroupModal, isOpen: false })}
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
                      {accountGroupModal.type === 'create' ? 'Nuevo Grupo' : accountGroupModal.type === 'edit' ? 'Editar Grupo' : 'Eliminar Grupo'}
                    </h3>
                    <p className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest mt-1">
                      {accountGroupModal.type === 'delete' ? 'Esta acción no se puede deshacer' : 'Configura las propiedades del grupo'}
                    </p>
                  </div>
                  <button 
                    onClick={() => setAccountGroupModal({ ...accountGroupModal, isOpen: false })}
                    className="p-2 hover:bg-white/5 rounded-full text-neutral-600 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {accountGroupModal.type !== 'delete' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-2 ml-1">Nombre del Grupo</label>
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="Ej: Marca Premium VIP"
                        value={accountGroupModal.inputValue}
                        onChange={(e) => setAccountGroupModal({ ...accountGroupModal, inputValue: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && accountGroupModal.inputValue) {
                            const name = accountGroupModal.inputValue;
                            if (accountGroupModal.type === 'create') {
                              saveAccountGroups([...accountGroups, { id: Math.random().toString(36).substr(2, 9), name, accountIds: [] }]);
                            } else if (accountGroupModal.group) {
                              saveAccountGroups(accountGroups.map(g => g.id === accountGroupModal.group?.id ? { ...g, name } : g));
                            }
                            setAccountGroupModal({ ...accountGroupModal, isOpen: false });
                          }
                        }}
                        className="w-full bg-black/50 border border-white/5 rounded-lg px-4 py-3.5 text-xs text-white font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-neutral-800"
                      />
                    </div>
                    
                    <button 
                      disabled={!accountGroupModal.inputValue}
                      onClick={() => {
                        const name = accountGroupModal.inputValue;
                        if (accountGroupModal.type === 'create') {
                          saveAccountGroups([...accountGroups, { id: Math.random().toString(36).substr(2, 9), name, accountIds: [] }]);
                        } else if (accountGroupModal.group) {
                          saveAccountGroups(accountGroups.map(g => g.id === accountGroupModal.group?.id ? { ...g, name } : g));
                        }
                        setAccountGroupModal({ ...accountGroupModal, isOpen: false });
                      }}
                      className="w-full bg-blue-600 disabled:opacity-20 text-white h-12 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"
                    >
                      {accountGroupModal.type === 'create' ? 'Crear Grupo' : 'Guardar Cambios'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p className="text-xs text-neutral-400 font-bold text-center leading-relaxed px-4">
                      ¿Seguro que quieres eliminar el grupo <span className="text-white">"{accountGroupModal.group?.name}"</span>? Las cuentas vinculadas volverán a mostrarse individualmente.
                    </p>
                    <div className="grid grid-cols-2 gap-3 mt-8">
                       <button 
                         onClick={() => setAccountGroupModal({ ...accountGroupModal, isOpen: false })}
                         className="h-12 rounded-lg text-[10px] font-black uppercase tracking-widest text-neutral-600 hover:text-white hover:bg-white/5 transition-all"
                       >
                         Cancelar
                       </button>
                       <button 
                         onClick={() => {
                           if (accountGroupModal.group) {
                             saveAccountGroups(accountGroups.filter(g => g.id !== accountGroupModal.group?.id));
                           }
                           setAccountGroupModal({ ...accountGroupModal, isOpen: false });
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

      {/* Client Category Modal */}
      <AnimatePresence>
        {categoryModal.isOpen && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCategoryModal({ ...categoryModal, isOpen: false })}
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
                      {categoryModal.type === 'create' ? 'Nuevo Grupo de Clientes' : categoryModal.type === 'edit' ? 'Editar Grupo de Clientes' : 'Eliminar Grupo de Clientes'}
                    </h3>
                    <p className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest mt-1">
                      Organiza tus clientes de forma personalizada
                    </p>
                  </div>
                  <button 
                    onClick={() => setCategoryModal({ ...categoryModal, isOpen: false })}
                    className="p-2 hover:bg-white/5 rounded-full text-neutral-600 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {categoryModal.type !== 'delete' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-2 ml-1">Nombre del Grupo</label>
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="Ej: Agencia Independiente"
                        value={categoryModal.inputValue}
                        onChange={(e) => setCategoryModal({ ...categoryModal, inputValue: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && categoryModal.inputValue) {
                            const name = categoryModal.inputValue;
                            if (categoryModal.type === 'create') {
                              setClientCategories([...clientCategories, { id: Math.random().toString(36).substr(2, 9), name }]);
                            } else if (categoryModal.category) {
                              setClientCategories(clientCategories.map(c => c.id === categoryModal.category?.id ? { ...c, name } : c));
                            }
                            setCategoryModal({ ...categoryModal, isOpen: false });
                          }
                        }}
                        className="w-full bg-black/50 border border-white/5 rounded-lg px-4 py-3.5 text-xs text-white font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-neutral-800"
                      />
                    </div>
                    
                    <button 
                      disabled={!categoryModal.inputValue}
                      onClick={() => {
                        const name = categoryModal.inputValue;
                        if (categoryModal.type === 'create') {
                          setClientCategories([...clientCategories, { id: Math.random().toString(36).substr(2, 9), name }]);
                        } else if (categoryModal.category) {
                          setClientCategories(clientCategories.map(c => c.id === categoryModal.category?.id ? { ...c, name } : c));
                        }
                        setCategoryModal({ ...categoryModal, isOpen: false });
                      }}
                      className="w-full bg-blue-600 disabled:opacity-20 text-white h-12 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"
                    >
                      {categoryModal.type === 'create' ? 'Crear Grupo' : 'Guardar Cambios'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p className="text-xs text-neutral-400 font-bold text-center leading-relaxed px-4">
                      ¿Seguro que quieres eliminar el grupo <span className="text-white">"{categoryModal.category?.name}"</span>? Los clientes en este grupo quedarán sin categoría.
                    </p>
                    <div className="grid grid-cols-2 gap-3 mt-8">
                       <button 
                         onClick={() => setCategoryModal({ ...categoryModal, isOpen: false })}
                         className="h-12 rounded-lg text-[10px] font-black uppercase tracking-widest text-neutral-600 hover:text-white hover:bg-white/5 transition-all"
                       >
                         Cancelar
                       </button>
                       <button 
                         onClick={() => {
                           if (categoryModal.category) {
                             setClientCategories(clientCategories.filter(c => c.id !== categoryModal.category?.id));
                           }
                           setCategoryModal({ ...categoryModal, isOpen: false });
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