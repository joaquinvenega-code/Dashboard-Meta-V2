import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  Settings, 
  History, 
  Share2, 
  ChevronRight, 
  LogOut, 
  RefreshCcw 
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  user: any;
  onLogout: () => void;
  onRefresh: () => void;
  lastSync: string | null;
}

export function Sidebar({ activePage, onPageChange, user, onLogout, onRefresh, lastSync }: SidebarProps) {
  const NavItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <button
      onClick={() => onPageChange(id)}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left",
        activePage === id 
          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" 
          : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </button>
  );

  return (
    <aside className="w-64 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col h-screen sticky top-0 shrink-0">
      <div className="p-5 border-bottom border-neutral-100 dark:border-neutral-900 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-sm leading-tight">Control ROAS</div>
          <div className="text-[10px] text-neutral-400">Meta Ads Dashboard</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-3 mb-2 mt-4">Vistas</div>
        <NavItem id="overview" icon={LayoutDashboard} label="Vista general" />
        <NavItem id="detail" icon={BarChart3} label="Detalle de cuentas" />

        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-3 mb-2 mt-6">Configuración</div>
        <NavItem id="accounts" icon={Settings} label="Cuentas visibles" />
        <NavItem id="history" icon={History} label="Historial" />
        <NavItem id="share" icon={Share2} label="Snapshot" />
      </nav>

      <div className="p-3 border-t border-neutral-100 dark:border-neutral-900">
        <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-2.5 flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 overflow-hidden flex items-center justify-center text-white text-xs font-bold">
            {user?.picture?.data?.url ? (
              <img src={user.picture.data.url} alt="" className="w-full h-full object-cover" />
            ) : (
              (user?.name || 'U')[0].toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{user?.name || 'Usuario'}</div>
          </div>
        </div>
        
        {lastSync && (
          <div className="text-[10px] text-neutral-400 text-center mb-2">
            Sync: {lastSync}
          </div>
        )}
        
        <button 
          onClick={onRefresh}
          className="flex items-center justify-center gap-2 w-full py-1.5 px-3 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 mb-1"
        >
          <RefreshCcw className="w-3 h-3" />
          Sincronizar
        </button>
        
        <button 
          onClick={onLogout}
          className="flex items-center justify-center gap-2 w-full py-1.5 px-3 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <LogOut className="w-3 h-3" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
