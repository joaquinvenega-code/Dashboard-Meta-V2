import React, { useState, useEffect, useCallback } from 'react';
import { 
  initFacebookSdk, 
  loginWithFacebook, 
  getFacebookLoginStatus, 
  getUserProfile, 
  getAdAccounts, 
  fetchInsights 
} from './services/facebook';
import { AdAccount, AccountSettings } from './types';
import { Sidebar } from './components/Sidebar';
import { AccountDetailExpansion } from './components/AccountDetailExpansion';
import { IndividualReport } from './components/IndividualReport';
import { formatCurrency, formatNumber, formatDecimal, cn } from './lib/utils';
import { 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  AlertCircle, 
  Facebook, 
  Settings2,
  Calendar,
  BarChart3,
  LayoutDashboard,
  Settings,
  History,
  Share2,
  ChevronRight,
  LogOut,
  RefreshCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, subDays, startOfMonth } from 'date-fns';

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
  
  // Date Range State
  const [dateRange, setDateRange] = useState({
    since: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    until: format(new Date(), 'yyyy-MM-dd')
  });

  // Settings & Expansion State
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<string, AccountSettings>>(() => {
    return JSON.parse(localStorage.getItem('cr_settings') || '{}');
  });
  
  // Report State
  const [reportAccount, setReportAccount] = useState<AdAccount | null>(null);

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
    setLoading(true);
    try {
      const accs = await getAdAccounts();
      const detailedAccs = await Promise.all(accs.map(async (acc) => {
        const insights = await fetchInsights(acc.id, dateRange.since, dateRange.until);
        return { ...acc, ...insights };
      }));
      setAccounts(detailedAccs);
      setLastSync(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

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

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
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

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <BarChart3 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Control ROAS</h1>
            <p className="text-neutral-500 text-center text-sm mt-1">Dashboard interno de métricas publicitarias</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1.5 ml-1">Meta App ID</label>
              <input 
                type="text" 
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="ID de tu app de Meta..."
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button 
              onClick={onLogin}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
            >
              <Facebook className="w-5 h-5 fill-current" />
              Ingresar con Facebook
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-neutral-100 dark:border-neutral-800">
            <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">¿Cómo obtener el App ID?</h3>
            <ul className="space-y-3">
              {[
                { n: 1, t: "Ir a developers.facebook.com" },
                { n: 2, t: "Crear app tipo 'Negocios'" },
                { n: 3, t: "Configurar Producto: Marketing API" }
              ].map(step => (
                <li key={step.n} className="flex gap-3 items-center text-xs text-neutral-500">
                  <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">{step.n}</span>
                  {step.t}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex">
      <Sidebar 
        activePage={activePage} 
        onPageChange={setActivePage} 
        user={user} 
        onLogout={onLogout}
        onRefresh={loadData}
        lastSync={lastSync}
      />
      
      <main className="flex-1 min-w-0 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold capitalize">{activePage === 'overview' ? 'Vista general' : 'Detalle de cuentas'}</h2>
              <p className="text-neutral-500 text-sm">Monitoreo de rendimiento en tiempo real</p>
            </div>

            <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-900 p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-400">
                <Calendar className="w-4 h-4" />
                {dateRange.since} — {dateRange.until}
              </div>
              <select 
                onChange={(e) => {
                  const val = e.target.value;
                  const now = new Date();
                  if (val === 'this_month') {
                    setDateRange({ since: format(startOfMonth(now), 'yyyy-MM-dd'), until: format(now, 'yyyy-MM-dd') });
                  } else if (val === 'last_7') {
                    setDateRange({ since: format(subDays(now, 7), 'yyyy-MM-dd'), until: format(now, 'yyyy-MM-dd') });
                  } else if (val === 'last_30') {
                    setDateRange({ since: format(subDays(now, 30), 'yyyy-MM-dd'), until: format(now, 'yyyy-MM-dd') });
                  }
                }}
                className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 py-1.5 text-xs outline-none"
              >
                <option value="this_month">Este mes</option>
                <option value="last_7">Últimos 7 días</option>
                <option value="last_30">Últimos 30 días</option>
              </select>
            </div>
          </div>

          {loading && !accounts.length ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-neutral-400">
              <RefreshCw className="w-10 h-10 animate-spin" />
              <p className="font-medium">Sincronizando con Meta...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards would go here in Overview */}
              {activePage === 'overview' && <OverviewGrid accounts={accounts} settings={settings} />}
              
              {/* Accounts Table */}
              <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800">
                        <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest w-64">Cuenta</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-center">Inversión</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-center">Revenue</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-center">ROAS</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-center">Estado</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((acc) => {
                        const isExpanded = expandedId === acc.id;
                        const s = settings[acc.id] || { objective: 0, budget: 0, currency: acc.currency || 'ARS', tracking: 'ecommerce' };
                        const roas = acc.spend && acc.spend > 0 ? (acc.revenue || 0) / acc.spend : 0;
                        const progress = s.objective > 0 ? Math.round(((acc.revenue || 0) / s.objective) * 100) : null;
                        
                        // Simple semaphore logic
                        let statusColor = "bg-neutral-200 text-neutral-600";
                        if (progress !== null) {
                          if (progress >= 100) statusColor = "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400";
                          else if (progress >= 70) statusColor = "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400";
                          else statusColor = "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400";
                        }

                        return (
                          <React.Fragment key={acc.id}>
                            <tr 
                              onClick={() => toggleExpand(acc.id)}
                              className={cn(
                                "border-b border-neutral-100 dark:border-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors cursor-pointer",
                                isExpanded && "bg-neutral-50 dark:bg-neutral-900/30"
                              )}
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="font-bold text-sm truncate max-w-[200px]">{acc.name}</div>
                                  <span className="text-[9px] font-bold bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-400 uppercase">
                                    {acc.currency}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center text-sm font-medium">
                                {formatCurrency(acc.spend || 0, acc.currency)}
                              </td>
                              <td className="px-6 py-4 text-center text-sm font-medium">
                                {formatCurrency(acc.revenue || 0, acc.currency)}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={cn(
                                  "inline-block px-3 py-1 rounded-full font-bold text-sm",
                                  roas >= 4 ? "text-green-600 dark:text-green-400" : 
                                  roas >= 2 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
                                )}>
                                  ×{formatDecimal(roas)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", statusColor)}>
                                  <div className={cn("w-1.5 h-1.5 rounded-full", statusColor.split(' ')[1].replace('text-', 'bg-'))}></div>
                                  {progress !== null ? `${progress}% Objetivo` : 'Sin objetivo'}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const obj = prompt('Objetivo de facturación mensual:', s.objective.toString());
                                      if (obj !== null) updateSetting(acc.id, 'objective', parseFloat(obj));
                                    }}
                                    className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400 transition-colors"
                                  >
                                    <Settings2 className="w-4 h-4" />
                                  </button>
                                  {isExpanded ? <ChevronUp className="w-5 h-5 text-neutral-300" /> : <ChevronDown className="w-5 h-5 text-neutral-300" />}
                                </div>
                              </td>
                            </tr>
                            <AnimatePresence>
                              {isExpanded && (
                                <tr>
                                  <td colSpan={6} className="p-0 border-b border-neutral-200 dark:border-neutral-800">
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                                      className="overflow-hidden"
                                    >
                                      <AccountDetailExpansion 
                                        account={acc} 
                                        settings={s} 
                                        dateRange={dateRange}
                                        onOpenReport={(a) => setReportAccount(a)}
                                      />
                                    </motion.div>
                                  </td>
                                </tr>
                              )}
                            </AnimatePresence>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
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
    </div>
  );
}

function OverviewGrid({ accounts, settings }: { accounts: AdAccount[], settings: Record<string, AccountSettings> }) {
  const totalSpend = accounts.reduce((a, c) => a + (c.spend || 0), 0);
  const totalRevenue = accounts.reduce((a, c) => a + (c.revenue || 0), 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Inversión Total" value={formatCurrency(totalSpend)} sub="Gasto acumulado" />
      <StatCard label="Revenue Total" value={formatCurrency(totalRevenue)} sub="Ventas reportadas" />
      <StatCard label="ROAS Promedio" value={`×${formatDecimal(avgRoas)}`} sub="Retorno sobre inversión" highlight />
      <StatCard label="Cuentas Activas" value={accounts.length.toString()} sub="Bajo monitoreo" />
    </div>
  );
}

function StatCard({ label, value, sub, highlight }: { label: string, value: string, sub: string, highlight?: boolean }) {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm">
      <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">{label}</div>
      <div className={cn("text-2xl font-black mb-1", highlight && "text-blue-600 dark:text-blue-400")}>{value}</div>
      <div className="text-xs text-neutral-500">{sub}</div>
    </div>
  );
}
