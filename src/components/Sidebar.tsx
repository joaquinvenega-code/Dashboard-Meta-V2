import React, { useState, useEffect, useRef, useId } from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  Settings, 
  LogOut, 
  RefreshCcw,
  Settings2,
  Bell,
  FileText,
  CalendarDays,
  CalendarRange,
  FilePenLine,
  Network,
  ChevronDown,
  User,
  Bot,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { REPORT_TABS, type ReportTab } from '../lib/reportTabs';
import { motion, AnimatePresence } from 'motion/react';

const reportIcons = { weekly: CalendarDays, monthly: CalendarRange, special: FilePenLine };

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  reportTab: ReportTab;
  onReportTabChange: (tab: ReportTab) => void;
  user: any;
  onLogout: () => void;
  onRefresh: () => void;
  loading?: boolean;
  lastSync: string | null;
  isOrionEnabled?: boolean;
  onOrionToggle?: (enabled: boolean) => void;
}

export function Sidebar({ 
  activePage, 
  onPageChange, 
  reportTab,
  onReportTabChange,
  user, 
  onLogout, 
  onRefresh, 
  loading, 
  lastSync, 
  isOrionEnabled = true, 
  onOrionToggle 
}: SidebarProps) {
  const [desktopExpanded, setDesktopExpanded] = useState(() => {
    try { return localStorage.getItem('orion:sidebar:collapsed') !== 'true'; }
    catch { return true; }
  });
  const toggleDesktop = () => {
    setDesktopExpanded(!desktopExpanded);
    try { localStorage.setItem('orion:sidebar:collapsed', String(desktopExpanded)); }
    catch { /* The sidebar still works when the browser blocks storage. */ }
  };
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(activePage === 'reports');
  const mobileMenu = useRef<HTMLDialogElement>(null);
  const menuId = useId();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const closeMenu = () => mobileMenu.current?.close();
  const navigate = (page: string) => {
    onPageChange(page);
    closeMenu();
  };

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const onResize = () => { if (desktop.matches) closeMenu(); };
    desktop.addEventListener('change', onResize);
    return () => desktop.removeEventListener('change', onResize);
  }, []);

  useEffect(() => {
    if (!isMobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [isMobileOpen]);

  // Auto-open config section when a sub-item is active
  useEffect(() => {
    if (['accounts', 'alerts', 'user_settings', 'orion_settings'].includes(activePage)) {
      setIsConfigOpen(true);
    }
  }, [activePage]);

  const navItems = [
    { id: 'overview', label: 'Vista general', icon: LayoutDashboard },
    { id: 'detail', label: 'Detalle de cuentas', icon: BarChart3 },
    { id: 'strategy', label: 'Estrategia', icon: Network },
  ];

  const configItems = [
    { id: 'user_settings', label: 'Perfil de Usuario', icon: User },
    { id: 'orion_settings', label: 'Asistente Orión', icon: Bot },
    { id: 'accounts', label: 'Cuentas Visibles', icon: Settings2 },
    { id: 'alerts', label: 'Centro de Alertas', icon: Bell },
  ];

  const isConfigActive = ['accounts', 'alerts', 'user_settings', 'orion_settings'].includes(activePage);

  function renderSidebar(mobile: boolean) {
    const isExpanded = mobile || desktopExpanded;
    const reportsMenuId = menuId + (mobile ? '-reports-mobile' : '-reports-desktop');
    const toggleLabel = isExpanded ? 'Contraer panel lateral' : 'Expandir panel lateral';
    return (
    <aside 
      className={cn(
        "orion-sidebar sticky top-0 h-dvh flex flex-col justify-between gap-8 overflow-y-auto p-4 bg-[#0c0d12] border-r border-white/10 shrink-0 z-40 transition-all duration-300 print:hidden select-none",
        isExpanded ? "w-64" : "w-20 items-center"
      )}
    >
      {/* HEADER: LOGO & ORION */}
      <div className="space-y-6 w-full">
        {/* Logo & Toggle */}
        <div className={cn("flex items-center gap-2", isExpanded ? "justify-between" : "justify-center")}>
          {isExpanded && <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30 ring-1 ring-blue-400/30">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <div className="font-bold text-sm text-white flex items-center gap-1.5">
                  Orion Metrics
                  <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                </div>
                <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
                  Meta Ads Dashboard
                </div>
              </motion.div>
          </div>}
          {mobile ? (
            <button type="button" aria-label="Cerrar menú" onClick={closeMenu} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-neutral-300 hover:bg-white/10"><X className="h-5 w-5" /></button>
          ) : (
            <button type="button" aria-label={toggleLabel} title={toggleLabel} aria-expanded={isExpanded} onClick={toggleDesktop}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-neutral-400 hover:bg-white/10 hover:text-white">
              {isExpanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
          )}
        </div>

        {/* Assistant Toggle Card */}
        <div className={cn(
          "rounded-xl bg-white/[0.03] border border-white/5 p-2.5 transition-all",
          !isExpanded && "p-2 text-center"
        )}>
          {isExpanded ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", isOrionEnabled ? "bg-blue-500 animate-pulse" : "bg-neutral-600")} />
                <span className="text-xs font-semibold text-neutral-300">Asistente Orión</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isOrionEnabled}
                aria-label="Asistente Orión"
                onClick={() => onOrionToggle && onOrionToggle(!isOrionEnabled)}
                className={cn(
                  "w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer",
                  isOrionEnabled ? "bg-blue-600" : "bg-neutral-700"
                )}
              >
                <div className={cn(
                  "w-3 h-3 rounded-full bg-white transition-transform duration-200",
                  isOrionEnabled ? "translate-x-4" : "translate-x-0"
                )} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              role="switch"
              aria-checked={isOrionEnabled}
              aria-label="Asistente Orión"
              onClick={() => onOrionToggle && onOrionToggle(!isOrionEnabled)}
              title={isOrionEnabled ? "Desactivar Asistente" : "Activar Asistente"}
              className="w-full flex justify-center text-neutral-400 hover:text-white"
            >
              <Bot className={cn("w-5 h-5", isOrionEnabled ? "text-blue-400" : "text-neutral-500")} />
            </button>
          )}
        </div>

        {/* NAV ITEMS */}
        <nav className="space-y-1.5 w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                title={isExpanded ? undefined : item.label}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full text-left outline-none cursor-pointer group relative",
                  isActive 
                    ? "bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/25" 
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "text-neutral-400 group-hover:text-white")} />
                {isExpanded && (
                  <span className="text-sm truncate">{item.label}</span>
                )}
              </button>
            );
          })}

          <div className="space-y-1">
            <button type="button" aria-label="Informes" title={isExpanded ? undefined : 'Informes'}
              aria-expanded={reportsOpen} aria-controls={reportsMenuId} onClick={() => setReportsOpen(open => !open)}
              className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left",
                activePage === 'reports' ? "bg-blue-600/10 font-semibold text-blue-400" : "text-neutral-400 hover:bg-white/5 hover:text-white")}>
              <FileText className="h-5 w-5 shrink-0" />
              {isExpanded && <><span className="flex-1 text-sm">Informes</span><ChevronDown className={cn("h-4 w-4 transition-transform", reportsOpen && "rotate-180")} /></>}
            </button>
            <div id={reportsMenuId} hidden={!reportsOpen} className={cn("space-y-1", isExpanded && "pl-4")}>
              {REPORT_TABS.map(item => {
                const Icon = reportIcons[item.id];
                const selected = activePage === 'reports' && item.id === reportTab;
                return <button type="button" key={item.id} aria-label={item.title} title={isExpanded ? undefined : item.title}
                  aria-current={selected ? 'page' : undefined}
                  onClick={() => { onReportTabChange(item.id); navigate('reports'); }}
                  className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left",
                    selected ? "bg-blue-600/10 font-semibold text-blue-400" : "text-neutral-400 hover:bg-white/5 hover:text-white")}>
                  <Icon className="h-4 w-4 shrink-0" />
                  {isExpanded && <span className="text-xs">{item.title}</span>}
                </button>;
              })}
            </div>
          </div>

          {/* Config Section */}
          <div className="pt-3 border-t border-white/5 space-y-1">
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              aria-label="Configuración"
              aria-expanded={isConfigOpen}
              title={isExpanded ? undefined : 'Configuración'}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-xl transition-all w-full text-left outline-none cursor-pointer group relative",
                isConfigActive 
                  ? "text-blue-400 bg-blue-600/10 font-semibold" 
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-3">
                <Settings className={cn("w-5 h-5 shrink-0", isConfigActive ? "text-blue-400" : "text-neutral-400 group-hover:text-white")} />
                {isExpanded && <span className="text-sm truncate">Configuración</span>}
              </div>
              {isExpanded && (
                <ChevronDown className={cn("w-4 h-4 text-neutral-500 transition-transform duration-200", isConfigOpen && "rotate-180")} />
              )}
            </button>

            {/* Config Sub-items */}
            <AnimatePresence>
              {isConfigOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={cn("space-y-1 overflow-hidden", isExpanded ? "pl-4" : "")}
                >
                  {configItems.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = activePage === sub.id;

                    return (
                      <button
                        key={sub.id}
                        onClick={() => navigate(sub.id)}
                        title={isExpanded ? undefined : sub.label}
                        aria-label={sub.label}
                        aria-current={isSubActive ? 'page' : undefined}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all w-full text-left outline-none cursor-pointer group relative",
                          isSubActive 
                            ? "text-blue-400 font-semibold bg-blue-600/10" 
                            : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
                        )}
                      >
                        <SubIcon className={cn("w-4 h-4 shrink-0", isSubActive ? "text-blue-400" : "text-neutral-500 group-hover:text-neutral-300")} />
                        {isExpanded && <span className="text-xs truncate">{sub.label}</span>}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>
      </div>

      {/* FOOTER USER & ACTIONS */}
      <div className="pt-4 border-t border-white/5 space-y-3 w-full">
        {/* User Card */}
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] border border-white/5",
          !isExpanded && "justify-center border-none bg-transparent p-0"
        )}>
          <div className="w-8 h-8 rounded-full bg-blue-600 overflow-hidden flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.picture?.data?.url ? (
              <img src={user.picture.data.url} alt="" className="w-full h-full object-cover" />
            ) : (
              user?.name?.[0] || 'U'
            )}
          </div>

          {isExpanded && (
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-neutral-200 truncate">{user?.name || 'Usuario'}</div>
              {lastSync && (
                <div className="text-[9px] text-neutral-500 truncate">Sync: {lastSync}</div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={cn("flex items-center gap-1.5", !isExpanded && "flex-col")}>
          <button
            onClick={onRefresh}
            disabled={loading}
            title="Sincronizar Meta Ads"
            className={cn(
              "flex items-center justify-center gap-2 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer border border-white/5 text-xs font-medium",
              isExpanded ? "flex-1" : "w-full"
            )}
          >
            <RefreshCcw className={cn("w-4 h-4 shrink-0", loading && "animate-spin text-blue-400")} />
            {isExpanded && <span>{loading ? 'Sincronizando...' : 'Sincronizar'}</span>}
          </button>

          <button
            onClick={onLogout}
            title="Cerrar sesión"
            className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-all cursor-pointer border border-red-500/10"
          >
            <LogOut className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>
    </aside>
    );
  }

  return <>
    <div className="hidden shrink-0 lg:block print:hidden">{renderSidebar(false)}</div>
    <header className="mobile-app-bar sticky top-0 z-[260] flex items-center gap-3 border-b border-white/10 bg-[#0c0d12]/95 px-4 py-2 backdrop-blur-lg lg:hidden print:hidden">
      <button type="button" aria-label="Abrir menú" aria-haspopup="dialog" aria-controls={menuId} aria-expanded={isMobileOpen} onClick={() => { mobileMenu.current?.showModal(); setIsMobileOpen(true); }} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-white hover:bg-white/10"><Menu className="h-5 w-5" /></button>
      <div className="min-w-0"><p className="text-sm font-semibold text-white">Orion Metrics</p><p className="truncate text-xs text-neutral-400">{activePage === 'reports' ? `Informes · ${REPORT_TABS.find(item => item.id === reportTab)?.title}` : [...navItems, ...configItems].find(item => item.id === activePage)?.label}</p></div>
    </header>
    <dialog id={menuId} ref={mobileMenu} aria-label="Menú principal" onClose={() => setIsMobileOpen(false)} onClick={event => { if (event.target === event.currentTarget) closeMenu(); }} className="mobile-nav-dialog fixed inset-y-0 left-0 m-0 h-dvh max-h-dvh w-[min(320px,calc(100%-2rem))] max-w-none border-0 bg-[#0c0d12] p-0 text-white shadow-2xl backdrop:bg-black/65 backdrop:backdrop-blur-sm print:hidden">
      {renderSidebar(true)}
    </dialog>
  </>;
}
