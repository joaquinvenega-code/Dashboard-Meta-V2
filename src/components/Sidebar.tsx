import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  Settings, 
  LogOut, 
  RefreshCcw,
  Settings2,
  Bell,
  FileText,
  Network,
  ChevronDown,
  User,
  Bot,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
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
  user, 
  onLogout, 
  onRefresh, 
  loading, 
  lastSync, 
  isOrionEnabled = true, 
  onOrionToggle 
}: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

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
    { id: 'reports', label: 'Informes', icon: FileText },
  ];

  const configItems = [
    { id: 'user_settings', label: 'Perfil de Usuario', icon: User },
    { id: 'orion_settings', label: 'Asistente Orión', icon: Bot },
    { id: 'accounts', label: 'Cuentas Visibles', icon: Settings2 },
    { id: 'alerts', label: 'Centro de Alertas', icon: Bell },
  ];

  const isConfigActive = ['accounts', 'alerts', 'user_settings', 'orion_settings'].includes(activePage);

  return (
    <aside 
      className={cn(
        "sticky top-0 h-screen flex flex-col justify-between p-4 bg-[#0c0d12] border-r border-white/10 shrink-0 z-40 transition-all duration-300 print:hidden select-none",
        isExpanded ? "w-64" : "w-20 items-center"
      )}
    >
      {/* HEADER: LOGO & ORION */}
      <div className="space-y-6 w-full">
        {/* Logo & Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30 ring-1 ring-blue-400/30">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>

            {isExpanded && (
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
            )}
          </div>
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
                onClick={() => onPageChange(item.id)}
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
                {!isExpanded && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#16161a] text-white text-xs font-medium rounded-lg shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}

          {/* Config Section */}
          <div className="pt-3 border-t border-white/5 space-y-1">
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
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
              {!isExpanded && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#16161a] text-white text-xs font-medium rounded-lg shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  Configuración
                </div>
              )}
            </button>

            {/* Config Sub-items */}
            <AnimatePresence>
              {(isConfigOpen || !isExpanded) && (
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
                        onClick={() => onPageChange(sub.id)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all w-full text-left outline-none cursor-pointer group relative",
                          isSubActive 
                            ? "text-blue-400 font-semibold bg-blue-600/10" 
                            : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
                        )}
                      >
                        <SubIcon className={cn("w-4 h-4 shrink-0", isSubActive ? "text-blue-400" : "text-neutral-500 group-hover:text-neutral-300")} />
                        {isExpanded && <span className="text-xs truncate">{sub.label}</span>}
                        {!isExpanded && (
                          <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#16161a] text-white text-xs font-medium rounded-lg shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                            {sub.label}
                          </div>
                        )}
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
        <div className="flex items-center gap-1.5">
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
