import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  Settings, 
  History, 
  Share2, 
  ChevronRight, 
  LogOut, 
  RefreshCcw,
  Settings2
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  user: any;
  onLogout: () => void;
  onRefresh: () => void;
  loading?: boolean;
  lastSync: string | null;
}

export function Sidebar({ activePage, onPageChange, user, onLogout, onRefresh, loading, lastSync }: SidebarProps) {
  const NavItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <button
      onClick={() => onPageChange(id)}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold tracking-tight transition-all w-full text-left",
        activePage === id 
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
          : "text-neutral-500 hover:text-neutral-100 hover:bg-white/5"
      )}
    >
      <Icon className={cn("w-4 h-4 shrink-0", activePage === id ? "opacity-100" : "opacity-50")} />
      {label}
    </button>
  );

  return (
    <aside className="w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col h-screen sticky top-0 shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0 border border-white/5">
          <BarChart3 className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <div className="font-black text-sm leading-tight tracking-tighter text-white">Control ROAS</div>
          <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest leading-none mt-1">Meta Ads Dashboard</div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-black text-neutral-700 uppercase tracking-[0.2em] px-3 mb-3 mt-4">Vistas</div>
        <NavItem id="overview" icon={LayoutDashboard} label="Vista general" />
        <NavItem id="detail" icon={BarChart3} label="Detalle de cuentas" />

        <div className="text-[10px] font-black text-neutral-700 uppercase tracking-[0.2em] px-3 mb-3 mt-8">Configuración</div>
        <NavItem id="accounts" icon={Settings} label="Cuentas visibles" />
        <NavItem id="groups" icon={Settings2} label="Grupos de cliente" />
        <NavItem id="history" icon={History} label="Historial" />
        <NavItem id="share" icon={Share2} label="Snapshot" />
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
