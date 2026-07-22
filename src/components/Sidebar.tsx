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
  ChevronRight,
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
  const [isHovered, setIsHovered] = useState(false);
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
    <aside className="sticky top-0 h-screen flex items-center justify-center pl-2 shrink-0 z-50 print:hidden select-none">
      {/* Semicircular Floating Expandable Panel */}
      <motion.div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={false}
        animate={{
          width: isHovered ? 310 : 88,
          borderRadius: isHovered ? "0 240px 240px 0" : "0 140px 140px 0",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className={cn(
          "bg-[#0c0d12]/95 backdrop-blur-2xl border-t border-b border-r border-blue-500/25 shadow-[15px_0_50px_rgba(0,0,0,0.85)] flex flex-col justify-between overflow-hidden relative transition-colors duration-300",
          isHovered ? "py-8 px-6 h-[88vh] max-h-[720px]" : "py-6 px-3 h-[78vh] max-h-[600px] items-center"
        )}
      >
        {/* Glow ambient background along the semi-circle edge */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-32 h-64 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
        
        {/* Semi-circular decorative boundary line */}
        <div className="absolute inset-y-0 right-0 w-[2px] bg-gradient-to-b from-transparent via-blue-500/40 to-transparent pointer-events-none" />

        {/* HEADER: LOGO & ORION */}
        <div className="relative z-10 space-y-4 w-full">
          <div className="flex items-center gap-3">
            {/* Main Semicircular/Circular Hub Logo Button */}
            <motion.div
              whileHover={{ scale: 1.1, rotate: 10 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30 ring-2 ring-blue-400/30 cursor-pointer"
            >
              <BarChart3 className="w-6 h-6 text-white" />
            </motion.div>

            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="overflow-hidden min-w-0 flex-1 whitespace-nowrap"
                >
                  <div className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
                    Orion Metrics
                    <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  </div>
                  <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                    Meta Ads Dashboard
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Assistant Toggle */}
          <div className={cn(
            "flex items-center justify-between rounded-full bg-white/[0.03] border border-white/5 p-1 transition-all",
            !isHovered && "justify-center border-none bg-transparent p-0"
          )}>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 pl-2"
              >
                <div className={cn("w-2 h-2 rounded-full", isOrionEnabled ? "bg-blue-500 animate-pulse" : "bg-neutral-600")} />
                <span className="text-[11px] font-bold text-neutral-300">Asistente Orión</span>
              </motion.div>
            )}

            <button
              onClick={() => onOrionToggle && onOrionToggle(!isOrionEnabled)}
              title={isOrionEnabled ? "Desactivar Asistente" : "Activar Asistente"}
              className={cn(
                "relative transition-all duration-300 shrink-0 cursor-pointer",
                isHovered
                  ? "w-8 h-4 rounded-full bg-neutral-800 p-0.5"
                  : "w-10 h-10 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400"
              )}
            >
              {isHovered ? (
                <div className={cn(
                  "w-3 h-3 rounded-full bg-white transition-transform duration-300",
                  isOrionEnabled ? "bg-blue-500 translate-x-4" : "translate-x-0"
                )} />
              ) : (
                <Bot className={cn("w-5 h-5", isOrionEnabled ? "text-blue-400" : "text-neutral-500")} />
              )}
            </button>
          </div>
        </div>

        {/* NAVIGATION ITEMS ALONG THE SEMI-CIRCLE */}
        <nav className="relative z-10 my-auto space-y-3 w-full custom-scrollbar overflow-y-auto max-h-[380px] pr-1">
          {/* Main Views */}
          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={cn(
                    "relative flex items-center gap-3 p-1 rounded-full transition-all w-full text-left outline-none cursor-pointer group",
                    isActive ? "bg-blue-600/10 text-white" : "text-neutral-400 hover:text-white"
                  )}
                >
                  {/* CIRCULAR BADGE */}
                  <motion.div
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 shadow-md",
                      isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/40 ring-2 ring-blue-400/60"
                        : "bg-white/5 text-neutral-400 group-hover:bg-white/10 group-hover:text-white border border-white/5"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </motion.div>

                  <AnimatePresence>
                    {isHovered && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className={cn(
                          "text-xs font-bold tracking-tight whitespace-nowrap truncate",
                          isActive ? "text-blue-400 font-black" : "text-neutral-300 group-hover:text-white"
                        )}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Tooltip when collapsed */}
                  {!isHovered && (
                    <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#16161a] text-white text-xs font-bold rounded-xl shadow-2xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Config Group */}
          <div className="pt-2 border-t border-white/5 space-y-2">
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className={cn(
                "relative flex items-center gap-3 p-1 rounded-full transition-all w-full text-left outline-none cursor-pointer group",
                isConfigActive ? "bg-blue-600/10 text-white" : "text-neutral-400 hover:text-white"
              )}
            >
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 shadow-md",
                  isConfigActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/40 ring-2 ring-blue-400/60"
                    : "bg-white/5 text-neutral-400 group-hover:bg-white/10 group-hover:text-white border border-white/5"
                )}
              >
                <Settings className="w-5 h-5" />
              </motion.div>

              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center justify-between flex-1 pr-2 overflow-hidden whitespace-nowrap"
                  >
                    <span className={cn("text-xs font-bold", isConfigActive ? "text-blue-400 font-extrabold" : "text-neutral-300")}>
                      Configuración
                    </span>
                    <ChevronDown className={cn("w-4 h-4 text-neutral-500 transition-transform", isConfigOpen && "rotate-180")} />
                  </motion.div>
                )}
              </AnimatePresence>

              {!isHovered && (
                <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#16161a] text-white text-xs font-bold rounded-xl shadow-2xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50">
                  Configuración
                </div>
              )}
            </button>

            <AnimatePresence>
              {(isConfigOpen || !isHovered) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={cn("space-y-1.5", isHovered ? "pl-4" : "")}
                >
                  {configItems.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = activePage === sub.id;

                    return (
                      <button
                        key={sub.id}
                        onClick={() => onPageChange(sub.id)}
                        className="relative flex items-center gap-3 p-1 rounded-full transition-all w-full text-left outline-none cursor-pointer group"
                      >
                        <motion.div
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 shadow-sm",
                            isSubActive
                              ? "bg-blue-600 text-white shadow-md shadow-blue-600/40"
                              : "bg-white/[0.04] text-neutral-400 group-hover:bg-white/10 group-hover:text-white border border-white/5"
                          )}
                        >
                          <SubIcon className="w-4 h-4" />
                        </motion.div>

                        <AnimatePresence>
                          {isHovered && (
                            <motion.span
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -8 }}
                              className={cn(
                                "text-[11px] font-bold whitespace-nowrap truncate",
                                isSubActive ? "text-blue-400 font-extrabold" : "text-neutral-400 group-hover:text-neutral-200"
                              )}
                            >
                              {sub.label}
                            </motion.span>
                          )}
                        </AnimatePresence>

                        {!isHovered && (
                          <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#16161a] text-white text-xs font-bold rounded-xl shadow-2xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50">
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

        {/* FOOTER: USER & ACTIONS */}
        <div className="relative z-10 pt-3 border-t border-white/5 space-y-3 w-full">
          {/* User Badge */}
          <div className={cn(
            "bg-white/[0.03] border border-white/5 rounded-full p-1.5 flex items-center gap-3",
            !isHovered && "justify-center border-none bg-transparent p-0"
          )}>
            <motion.div
              whileHover={{ scale: 1.08 }}
              className="w-10 h-10 rounded-full bg-blue-600 overflow-hidden flex items-center justify-center text-white text-xs font-black shrink-0 shadow-inner ring-2 ring-blue-500/20"
            >
              {user?.picture?.data?.url ? (
                <img src={user.picture.data.url} alt="" className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0] || 'U'
              )}
            </motion.div>

            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="overflow-hidden min-w-0 flex-1 pr-1"
                >
                  <div className="text-xs font-black truncate text-neutral-200">{user?.name || 'Usuario'}</div>
                  {lastSync && (
                    <div className="text-[8px] font-bold text-neutral-500 uppercase tracking-wider truncate">
                      Sync: {lastSync}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Circular Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={loading}
              title="Sincronizar Meta Ads"
              className={cn(
                "relative flex items-center justify-center transition-all cursor-pointer group outline-none",
                isHovered
                  ? "flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 rounded-full text-neutral-300 text-xs font-bold gap-2 border border-white/5"
                  : "w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-neutral-400 hover:text-white mx-auto"
              )}
            >
              <RefreshCcw className={cn("w-4 h-4 shrink-0", loading && "animate-spin text-blue-400")} />
              {isHovered && (
                <span className="text-[11px] font-bold truncate">
                  {loading ? 'Sincronizando...' : 'Sincronizar'}
                </span>
              )}
              {!isHovered && (
                <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#16161a] text-white text-xs font-bold rounded-xl shadow-2xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50">
                  Sincronizar
                </div>
              )}
            </button>

            <button
              onClick={onLogout}
              title="Cerrar sesión"
              className={cn(
                "relative flex items-center justify-center transition-all cursor-pointer group outline-none",
                isHovered
                  ? "py-2 px-3 bg-red-500/10 hover:bg-red-500/20 rounded-full text-red-400 text-xs font-bold gap-2 border border-red-500/20"
                  : "w-10 h-10 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 mx-auto"
              )}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {isHovered && (
                <span className="text-[11px] font-bold truncate">Salir</span>
              )}
              {!isHovered && (
                <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#16161a] text-white text-xs font-bold rounded-xl shadow-2xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50">
                  Cerrar sesión
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Floating Expand Arrow indicator on the right semi-circle peak */}
        {!isHovered && (
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-8 bg-blue-600/30 border border-blue-400/40 rounded-r-full flex items-center justify-center text-blue-400 shadow-lg animate-pulse">
            <ChevronRight className="w-3 h-3" />
          </div>
        )}
      </motion.div>
    </aside>
  );
}
