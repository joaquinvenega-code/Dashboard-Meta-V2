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
  Bot
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
    <aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "bg-[#0a0a0a] border-r border-white/5 flex flex-col h-screen sticky top-0 shrink-0 z-50 print:hidden transition-all duration-300 ease-in-out select-none shadow-2xl",
        isHovered ? "w-64" : "w-[80px]"
      )}
    >
      {/* HEADER / LOGO */}
      <div className="p-4 flex flex-col gap-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          {/* Circular Logo Icon */}
          <motion.div 
            whileHover={{ scale: 1.08, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600/20 to-blue-400/10 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/10 cursor-pointer"
          >
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </motion.div>

          <AnimatePresence>
            {isHovered && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap min-w-0 flex-1"
              >
                <div className="font-black text-sm tracking-tighter text-white truncate">Orion Metrics</div>
                <div className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest leading-none mt-0.5">Meta Ads Dashboard</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ORION ASSISTANT TOGGLE */}
        <div className={cn(
          "flex items-center justify-between rounded-full bg-white/[0.03] border border-white/5 p-1 transition-all",
          !isHovered && "justify-center border-none bg-transparent p-0"
        )}>
          {isHovered ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 pl-2"
            >
              <div className={cn("w-2 h-2 rounded-full", isOrionEnabled ? "bg-blue-500 animate-pulse" : "bg-neutral-600")} />
              <span className="text-xs font-bold text-neutral-300">Asistente Orión</span>
            </motion.div>
          ) : null}

          <button 
            onClick={() => onOrionToggle && onOrionToggle(!isOrionEnabled)}
            title={isOrionEnabled ? "Desactivar Asistente Orión" : "Activar Asistente Orión"}
            className={cn(
              "relative transition-all duration-300 shrink-0",
              isHovered 
                ? "w-8 h-4 rounded-full bg-neutral-800 p-0.5" 
                : "w-11 h-11 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white"
            )}
          >
            {isHovered ? (
              <div className={cn(
                "w-3 h-3 rounded-full bg-white transition-transform duration-300",
                isOrionEnabled ? "bg-blue-500 translate-x-4" : "translate-x-0"
              )} />
            ) : (
              <Bot className={cn("w-5 h-5 transition-colors", isOrionEnabled ? "text-blue-400" : "text-neutral-500")} />
            )}
          </button>
        </div>
      </div>

      {/* NAVIGATION SECTIONS */}
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto custom-scrollbar">
        {/* VISTAS SECTION */}
        <div>
          {isHovered && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[9px] font-black text-neutral-600 uppercase tracking-[0.2em] px-3 mb-2"
            >
              Vistas
            </motion.div>
          )}

          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={cn(
                    "relative flex items-center gap-3.5 p-1.5 rounded-full transition-all group w-full text-left outline-none cursor-pointer",
                    isActive ? "bg-blue-600/10 text-white" : "text-neutral-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {/* CIRCULAR ICON BUTTON */}
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.92 }}
                    className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 shadow-md",
                      isActive 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/40 ring-2 ring-blue-500/50" 
                        : "bg-white/5 text-neutral-400 group-hover:bg-white/10 group-hover:text-white border border-white/5"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </motion.div>

                  {/* LABEL (shown on hover) */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          "text-xs font-bold tracking-tight whitespace-nowrap overflow-hidden pr-2",
                          isActive ? "text-blue-400 font-extrabold" : "text-neutral-300"
                        )}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* TOOLTIP WHEN COLLAPSED */}
                  {!isHovered && (
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#181818] text-white text-xs font-bold rounded-xl shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 transform translate-x-1 group-hover:translate-x-0">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* SYSTEM / CONFIGURATION SECTION */}
        <div>
          {isHovered && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[9px] font-black text-neutral-600 uppercase tracking-[0.2em] px-3 mb-2"
            >
              Sistema
            </motion.div>
          )}

          <div className="space-y-2">
            {/* CONFIGURATION TOGGLE BUTTON */}
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className={cn(
                "relative flex items-center gap-3.5 p-1.5 rounded-full transition-all group w-full text-left outline-none cursor-pointer",
                isConfigActive ? "bg-blue-600/10 text-white" : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 shadow-md",
                  isConfigActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/40 ring-2 ring-blue-500/50"
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
                    className="flex items-center justify-between flex-1 pr-2 overflow-hidden"
                  >
                    <span className={cn(
                      "text-xs font-bold tracking-tight whitespace-nowrap",
                      isConfigActive ? "text-blue-400 font-extrabold" : "text-neutral-300"
                    )}>
                      Configuración
                    </span>
                    <ChevronDown className={cn("w-4 h-4 text-neutral-500 transition-transform duration-300", isConfigOpen && "rotate-180")} />
                  </motion.div>
                )}
              </AnimatePresence>

              {!isHovered && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#181818] text-white text-xs font-bold rounded-xl shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50">
                  Configuración
                </div>
              )}
            </button>

            {/* CONFIGURATION SUB-ITEMS */}
            <AnimatePresence>
              {(isConfigOpen || !isHovered) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "space-y-2 overflow-hidden",
                    isHovered ? "pl-4 pt-1" : "pt-1"
                  )}
                >
                  {configItems.map((sub, idx) => {
                    const SubIcon = sub.icon;
                    const isSubActive = activePage === sub.id;

                    return (
                      <button
                        key={sub.id}
                        onClick={() => onPageChange(sub.id)}
                        className={cn(
                          "relative flex items-center gap-3 p-1 rounded-full transition-all group w-full text-left outline-none cursor-pointer",
                          isSubActive ? "text-blue-400" : "text-neutral-400 hover:text-white"
                        )}
                      >
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: idx * 0.04 }}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.92 }}
                          className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 shadow-sm",
                            isSubActive
                              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-400/50"
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
                                "text-[11px] font-bold tracking-tight whitespace-nowrap truncate",
                                isSubActive ? "text-blue-400 font-black" : "text-neutral-400 group-hover:text-neutral-200"
                              )}
                            >
                              {sub.label}
                            </motion.span>
                          )}
                        </AnimatePresence>

                        {!isHovered && (
                          <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#181818] text-white text-xs font-bold rounded-xl shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50">
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
        </div>
      </nav>

      {/* FOOTER SECTION */}
      <div className="p-3 border-t border-white/5 space-y-3 bg-[#080808]">
        {/* USER PROFILE CARD */}
        <div className={cn(
          "bg-[#111] border border-white/5 rounded-full p-1.5 flex items-center gap-3 transition-all",
          !isHovered && "justify-center border-none bg-transparent p-0"
        )}>
          <motion.div 
            whileHover={{ scale: 1.08 }}
            className="w-11 h-11 rounded-full bg-blue-600 overflow-hidden flex items-center justify-center text-white text-xs font-black shadow-inner shrink-0 ring-2 ring-blue-500/20"
          >
            {user?.picture?.data?.url ? (
              <img src={user.picture.data.url} alt="" className="w-full h-full object-cover" />
            ) : (
              (user?.name || 'U')[0].toUpperCase()
            )}
          </motion.div>

          <AnimatePresence>
            {isHovered && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1 min-w-0 pr-2 overflow-hidden"
              >
                <div className="text-xs font-black truncate text-neutral-100">{user?.name || 'Usuario'}</div>
                {lastSync && (
                  <div className="text-[8px] font-bold text-neutral-600 mt-0.5 uppercase tracking-wider truncate">
                    Sync: {lastSync}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SYNC & LOGOUT CIRCULAR BUTTONS */}
        <div className="flex items-center gap-2">
          {/* SYNC BUTTON */}
          <button 
            onClick={onRefresh}
            disabled={loading}
            title="Sincronizar Meta Ads"
            className={cn(
              "relative flex items-center justify-center transition-all duration-200 outline-none group cursor-pointer",
              isHovered 
                ? "flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 rounded-full text-neutral-300 text-xs font-bold gap-2 border border-white/5" 
                : "w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-neutral-400 hover:text-white mx-auto"
            )}
          >
            <RefreshCcw className={cn("w-4 h-4 shrink-0", loading && "animate-spin text-blue-400")} />
            {isHovered && (
              <span className="text-[11px] font-bold truncate">
                {loading ? 'Sincronizando...' : 'Sincronizar'}
              </span>
            )}
            {!isHovered && (
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#181818] text-white text-xs font-bold rounded-xl shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50">
                Sincronizar
              </div>
            )}
          </button>

          {/* LOGOUT BUTTON */}
          <button 
            onClick={onLogout}
            title="Cerrar sesión"
            className={cn(
              "relative flex items-center justify-center transition-all duration-200 outline-none group cursor-pointer",
              isHovered 
                ? "py-2 px-3 bg-red-500/10 hover:bg-red-500/20 rounded-full text-red-400 text-xs font-bold gap-2 border border-red-500/20" 
                : "w-11 h-11 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 mx-auto"
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {isHovered && (
              <span className="text-[11px] font-bold truncate">
                Salir
              </span>
            )}
            {!isHovered && (
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#181818] text-white text-xs font-bold rounded-xl shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50">
                Cerrar sesión
              </div>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

