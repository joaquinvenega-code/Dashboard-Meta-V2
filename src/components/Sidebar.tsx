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

export function Sidebar({ activePage, onPageChange, user, onLogout, onRefresh, loading, lastSync, isOrionEnabled = true, onOrionToggle }: SidebarProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Auto-expand if a sub-item is active
  useEffect(() => {
    if (['accounts', 'alerts', 'user_settings', 'orion_settings'].includes(activePage)) {
      setIsConfigOpen(true);
    }
  }, [activePage]);

  const NavItem = ({ id, icon: Icon, label, className }: { id: string, icon: any, label: string, className?: string }) => (
    <button
      onClick={() => onPageChange(id)}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold tracking-tight transition-all w-full text-left",
        activePage === id 
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
          : "text-neutral-500 hover:text-neutral-100 hover:bg-white/5",
        className
      )}
    >
      <Icon className={cn("w-4 h-4 shrink-0", activePage === id ? "opacity-100" : "opacity-50")} />
      {label}
    </button>
  );

  return (
    <aside className="w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col h-screen sticky top-0 shrink-0 print:hidden">
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0 border border-white/5">
            <BarChart3 className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <div className="font-black text-sm leading-tight tracking-tighter text-white">Orion Metrics</div>
            <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest leading-none mt-1">Meta Ads Dashboard</div>
          </div>
        </div>

        {/* Toggle Assistant */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Bot className={cn("w-3.5 h-3.5", isOrionEnabled ? "text-blue-500" : "text-neutral-600")} />
            <span className="text-xs font-bold text-neutral-400">Asistente Orión</span>
          </div>
          <button 
            onClick={() => onOrionToggle && onOrionToggle(!isOrionEnabled)}
            className={cn(
              "w-8 h-4 rounded-full relative transition-colors duration-300",
              isOrionEnabled ? "bg-blue-600" : "bg-neutral-800"
            )}
          >
            <div className={cn(
              "absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-300",
              isOrionEnabled && "transform translate-x-4"
            )} />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-black text-neutral-700 uppercase tracking-[0.2em] px-3 mb-3 mt-4">Vistas</div>
        <NavItem id="overview" icon={LayoutDashboard} label="Vista general" />
        <NavItem id="detail" icon={BarChart3} label="Detalle de cuentas" />
        <NavItem id="strategy" icon={Network} label="Estrategia" />
        <NavItem id="reports" icon={FileText} label="Informes" />

        <div className="text-[10px] font-black text-neutral-700 uppercase tracking-[0.2em] px-3 mb-3 mt-8">Sistema</div>
        
        <div className="space-y-1">
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold tracking-tight transition-all w-full text-left text-neutral-500 hover:text-neutral-100 hover:bg-white/5"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 shrink-0 opacity-50" />
              Configuración
            </div>
            <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform", isConfigOpen ? "rotate-180" : "rotate-0")} />
          </button>
          
          <AnimatePresence>
            {isConfigOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pl-4 pr-2 space-y-1 mt-1 border-l-2 border-white/5 ml-4">
                  <NavItem id="user_settings" icon={User} label="Perfil de Usuario" className="py-2 text-xs" />
                  <NavItem id="orion_settings" icon={Bot} label="Asistente Orión" className="py-2 text-xs" />
                  <NavItem id="accounts" icon={Settings2} label="Cuentas Visibles" className="py-2 text-xs" />
                  <NavItem id="alerts" icon={Bell} label="Centro de Alertas" className="py-2 text-xs" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      <div className="p-4 border-t border-white/5 space-y-4">
        <div className="bg-[#111] rounded-2xl p-3 border border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 overflow-hidden flex items-center justify-center text-white text-xs font-black shadow-inner">
            {user?.picture?.data?.url ? (
              <img src={user.picture.data.url} alt="" className="w-full h-full object-cover" />
            ) : (
              (user?.name || 'U')[0].toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-black truncate text-neutral-100">{user?.name || 'Usuario'}</div>
            {lastSync && (
              <div className="text-[9px] font-bold text-neutral-600 mt-0.5 uppercase tracking-wider">
                Sync: {lastSync}
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-2">
          <button 
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[11px] font-bold text-neutral-400 hover:text-neutral-100 hover:bg-white/5 transition-all disabled:opacity-50"
          >
            <RefreshCcw className={cn("w-3 h-3", loading && "animate-spin")} />
            {loading ? 'Sincronizando...' : 'Sincronizar'}
          </button>
          
          <button 
            onClick={onLogout}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[11px] font-bold text-red-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <LogOut className="w-3 h-3" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  );
}
