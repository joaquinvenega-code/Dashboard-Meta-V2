import React, { useState } from 'react';
import { AdAccount, AccountSettings, ClientCategory } from '../types';
import { formatCurrency, formatNumber, formatDecimal, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { differenceInDays, startOfMonth, endOfMonth, format, parseISO } from 'date-fns';

interface OverviewProps {
  accounts: AdAccount[];
  settings: Record<string, AccountSettings>;
  dateRange: { since: string; until: string };
  clientCategories: ClientCategory[];
}

export function Overview({ accounts, settings, dateRange, clientCategories }: OverviewProps) {
  const periodKey = format(parseISO(dateRange.since), 'yyyy-MM');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');

  // Filter accounts based on category
  const filteredAccounts = accounts.filter(acc => {
    if (filterCategoryId === 'all') return true;
    const catId = settings[acc.id]?.categoryId || '';
    return catId === filterCategoryId;
  });

  // Aggregation logic...
  const totalsByCurrency: Record<string, { spend: number; revenue: number }> = {};
  
  filteredAccounts.forEach(acc => {
    const s = settings[acc.id];
    const cur = (s?.currency || acc.currency || 'ARS').toUpperCase();
    if (!totalsByCurrency[cur]) totalsByCurrency[cur] = { spend: 0, revenue: 0 };
    totalsByCurrency[cur].spend += (acc.spend || 0);
    // Include manual revenue in total revenue calculation
    const log = s?.offlineSalesLogByMonth?.[periodKey] || [];
    const manualRevenue = log.length > 0 ? log.reduce((sum, entry) => sum + entry.amount, 0) : (s?.manualRevenueByMonth?.[periodKey] || 0);
    totalsByCurrency[cur].revenue += (acc.revenue || 0) + manualRevenue;
  });

  const currencies = Object.keys(totalsByCurrency).filter(c => totalsByCurrency[c].spend > 0 || totalsByCurrency[c].revenue > 0);
  const totalSpendStr = currencies.map(c => formatCurrency(totalsByCurrency[c].spend, c)).join(' + ');
  const totalRevenueStr = currencies.map(c => formatCurrency(totalsByCurrency[c].revenue, c)).join(' + ');
  
  const totalSpendGlobal = filteredAccounts.reduce((a, c) => a + (c.spend || 0), 0);
  const totalRevenueGlobal = filteredAccounts.reduce((a, c) => {
    const s = settings[c.id];
    const log = s?.offlineSalesLogByMonth?.[periodKey] || [];
    const manualRevenue = log.length > 0 ? log.reduce((sum, entry) => sum + entry.amount, 0) : (s?.manualRevenueByMonth?.[periodKey] || 0);
    return a + (c.revenue || 0) + manualRevenue;
  }, 0);
  const avgRoas = totalSpendGlobal > 0 ? totalRevenueGlobal / totalSpendGlobal : 0;

  const getStatus = (acc: AdAccount) => {
    const s = settings[acc.id] as AccountSettings | undefined;
    if (!s || !s.objective) return { label: 'Sin objetivo', color: 'bg-neutral-500', text: 'text-neutral-500', border: 'border-neutral-500/10' };
    const log = s.offlineSalesLogByMonth?.[periodKey] || [];
    const manualRevenue = log.length > 0 ? log.reduce((sum, entry) => sum + entry.amount, 0) : (s.manualRevenueByMonth?.[periodKey] || 0);
    const totalRevenue = (acc.revenue || 0) + manualRevenue;
    const progress = totalRevenue / s.objective;
    if (progress >= 1) return { label: 'En objetivo', color: 'bg-success', text: 'text-success', border: 'border-success/10' };
    if (progress >= 0.7) return { label: 'En riesgo', color: 'bg-warning', text: 'text-warning', border: 'border-warning/10' };
    return { label: 'Fuera de objetivo', color: 'bg-danger', text: 'text-danger', border: 'border-danger/10' };
  };

  const onTrackCount = filteredAccounts.filter(acc => getStatus(acc).label === 'En objetivo').length;

  const filterOptions = [
    { id: 'all', label: 'Todos' },
    ...clientCategories.map(cat => ({ id: cat.id, label: cat.name }))
  ];

  return (
    <div className="space-y-6">
      {/* Category Filter Selector */}
      <div className="flex items-center gap-1 self-start opacity-70 hover:opacity-100 transition-opacity">
        <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5 overflow-x-auto max-w-[90vw] custom-scrollbar">
          {filterOptions.map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilterCategoryId(btn.id)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                filterCategoryId === btn.id 
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" 
                  : "text-neutral-600 hover:text-neutral-400"
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          label="Inversión General" 
          value={totalSpendStr} 
          sub="Reportado por Meta" 
          icon={<TrendingUp className="w-3.5 h-3.5 text-blue-500" />}
        />
        <SummaryCard 
          label="Facturación General" 
          value={totalRevenueStr} 
          sub="Período seleccionado" 
        />
        <SummaryCard 
          label="Roas General" 
          value={`×${formatDecimal(avgRoas, 1)}`} 
          sub="Promedio de cuentas" 
        />
        <SummaryCard 
          label="Cuentas en objetivo" 
          value={`${onTrackCount} / ${filteredAccounts.length}`} 
          sub="Cuentas en meta" 
        />
      </div>

      {/* Evolution Section */}
      <div className="bg-[#141414] rounded-lg p-4 border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
        
        <div className="flex items-center justify-between mb-3 relative">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">Monitoreo de Objetivos</h3>
            <p className="text-[8px] text-neutral-800 font-bold uppercase tracking-widest px-0.5">Status vs Metas</p>
          </div>
          <div className="flex gap-4">
            <StatusLegend color="bg-success" label="Objetivo" />
            <StatusLegend color="bg-warning" label="Riesgo" />
            <StatusLegend color="bg-danger" label="Alerta" />
          </div>
        </div>

        <div className="space-y-1.5 relative">
          <div className="grid grid-cols-[140px_1fr_100px_60px] gap-3 px-2 text-[9px] font-bold text-neutral-700 uppercase tracking-widest border-b border-white/5 pb-1.5">
            <div>Cliente</div>
            <div className="text-center">Progreso</div>
            <div className="text-right">Facturación</div>
            <div className="text-right">ROAS</div>
          </div>
          {filteredAccounts.map(acc => {
            const s = settings[acc.id];
            const currency = s?.currency || acc.currency || 'ARS';
            const objective = s?.objective || 0;
            const status = getStatus(acc);
            const log = s?.offlineSalesLogByMonth?.[periodKey] || [];
            const manualRevenue = log.length > 0 ? log.reduce((sum, entry) => sum + entry.amount, 0) : (s?.manualRevenueByMonth?.[periodKey] || 0);
            const totalRevenue = (acc.revenue || 0) + manualRevenue;
            const progress = objective > 0 ? Math.min(totalRevenue / objective, 1) : 0;
            const progressPct = Math.round(progress * 100);
            const roas = acc.spend && acc.spend > 0 ? totalRevenue / acc.spend : 0;

            return (
              <div key={acc.id} className="group relative">
                <div className="grid grid-cols-[140px_1fr_100px_60px] gap-3 items-center py-1.5 border-b border-white/[0.03] group-hover:bg-white/[0.01] transition-all px-2 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", status.color)}></div>
                    <div className="text-[11px] font-semibold truncate text-neutral-400 tracking-tight group-hover:text-white transition-colors">{acc.name}</div>
                  </div>
                  
                  <div className="space-y-1 px-1">
                    <div className="flex justify-between items-center px-0.5">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-bold uppercase tracking-tight", status.text)}>{progressPct}%</span>
                      </div>
                      <span className="text-[8px] font-semibold text-neutral-500 uppercase tracking-widest tabular-nums font-mono">
                        {formatCurrency(totalRevenue, currency)} / {formatCurrency(objective, currency)}
                      </span>
                    </div>
                    <div className="relative h-1.5 bg-white/[0.05] rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${progress * 100}%` }}
                         transition={{ duration: 0.8, ease: "easeOut" }}
                         className={cn("h-full rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]", status.color)}
                      />
                    </div>
                  </div>
 
                  <div className="text-right text-[11px] font-medium text-neutral-300 font-mono tracking-tighter">
                    {formatCurrency(totalRevenue, currency)}
                  </div>
 
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded transition-all", 
                      status.text, 
                      "bg-white/[0.02] group-hover:bg-white/[0.05]"
                    )}>
                      ×{formatDecimal(roas, 1)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusLegend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-1 h-1 rounded-full", color)}></div>
      <span className="text-[9px] font-bold text-neutral-700 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function SummaryCard({ label, value, sub, icon, highlight }: { label: string; value: string; sub: string; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={cn(
      "border p-4 rounded-lg shadow-xl transition-all group relative overflow-hidden flex flex-col justify-between min-h-[95px]",
      highlight 
        ? "bg-blue-600/[0.03] border-blue-600/20 ring-1 ring-blue-600/10" 
        : "bg-[#111] border-white/5 hover:bg-[#141414]"
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] blur-3xl rounded-full -mr-16 -mt-16 transition-all group-hover:bg-blue-600/5"></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-2.5">
          <div className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest group-hover:text-neutral-500 transition-colors">
            {label}
          </div>
          {icon}
        </div>
        <div className="text-lg font-semibold text-white mb-1.5 leading-none tracking-tighter tabular-nums">{value}</div>
      </div>
      <div className="relative flex items-center gap-2">
        <div className={cn("w-1 h-1 rounded-full opacity-50", highlight ? "bg-blue-400" : "bg-neutral-700")}></div>
        <div className="text-[8px] text-neutral-600 font-semibold uppercase tracking-wider group-hover:text-neutral-500 transition-colors line-clamp-1">{sub}</div>
      </div>
    </div>
  );
}
