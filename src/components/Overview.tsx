import React from 'react';
import { AdAccount, AccountSettings } from '../types';
import { formatCurrency, formatNumber, formatDecimal, cn } from '../lib/utils';
import { motion } from 'motion/react';

interface OverviewProps {
  accounts: AdAccount[];
  settings: Record<string, AccountSettings>;
}

export function Overview({ accounts, settings }: OverviewProps) {
  // Aggregate data by currency
  const totalsByCurrency: Record<string, { spend: number; revenue: number }> = {};
  
  accounts.forEach(acc => {
    const s = settings[acc.id] || { currency: acc.currency || 'ARS' };
    const cur = s.currency;
    if (!totalsByCurrency[cur]) totalsByCurrency[cur] = { spend: 0, revenue: 0 };
    totalsByCurrency[cur].spend += (acc.spend || 0);
    totalsByCurrency[cur].revenue += (acc.revenue || 0);
  });

  const currencies = Object.keys(totalsByCurrency);
  const totalSpendStr = currencies.map(c => formatCurrency(totalsByCurrency[c].spend, c)).join(' + ');
  const totalRevenueStr = currencies.map(c => formatCurrency(totalsByCurrency[c].revenue, c)).join(' + ');
  
  const totalSpendGlobal = accounts.reduce((a, c) => a + (c.spend || 0), 0);
  const totalRevenueGlobal = accounts.reduce((a, c) => a + (c.revenue || 0), 0);
  const avgRoas = totalSpendGlobal > 0 ? totalRevenueGlobal / totalSpendGlobal : 0;

  // Semaphore Logic
  const getStatus = (acc: AdAccount) => {
    const s = settings[acc.id] || { objective: 0 };
    if (!s.objective) return { label: 'Sin objetivo', color: 'bg-neutral-500', text: 'text-neutral-400', border: 'border-neutral-500/20' };
    const progress = (acc.revenue || 0) / s.objective;
    if (progress >= 1) return { label: 'En objetivo', color: 'bg-success', text: 'text-success', border: 'border-success/20' };
    if (progress >= 0.7) return { label: 'En riesgo', color: 'bg-warning', text: 'text-warning', border: 'border-warning/20' };
    return { label: 'Fuera de objetivo', color: 'bg-danger', text: 'text-danger', border: 'border-danger/20' };
  };

  const onTrackCount = accounts.filter(acc => getStatus(acc).label === 'En objetivo').length;

  return (
    <div className="space-y-6">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <SummaryCard 
          label="Facturación Total" 
          value={totalRevenueStr} 
          sub="Período seleccionado" 
        />
        <SummaryCard 
          label="Inversión Consumida" 
          value={totalSpendStr} 
          sub="Reportado por Meta" 
        />
        <SummaryCard 
          label="Ponderado ROAS" 
          value={`×${formatDecimal(avgRoas)}`} 
          sub="Eficiencia general" 
        />
        <SummaryCard 
          label="Cuentas Saludables" 
          value={`${onTrackCount} / ${accounts.length}`} 
          sub="Cuentas en meta" 
        />
      </div>

      {/* Evolution Section */}
      <div className="bg-[#141414] rounded-xl p-6 border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
        
        <div className="flex items-center justify-between mb-6 relative">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Monitoreo de Objetivos</h3>
            <p className="text-[9px] text-neutral-700 font-bold uppercase tracking-widest mt-0.5">Status vs Metas</p>
          </div>
          <div className="flex gap-4">
            <StatusLegend color="bg-success" label="Objetivo" />
            <StatusLegend color="bg-warning" label="Riesgo" />
            <StatusLegend color="bg-danger" label="Alerta" />
          </div>
        </div>

        <div className="space-y-4 relative">
          <div className="grid grid-cols-[180px_1fr_110px_70px] gap-4 px-2 text-[9px] font-black text-neutral-700 uppercase tracking-[0.2em] border-b border-white/5 pb-3">
            <div>Entidad / Cliente</div>
            <div className="text-center">Progreso Comercial</div>
            <div className="text-right">Ingresos</div>
            <div className="text-right">ROAS</div>
          </div>
          
          {accounts.map(acc => {
            const s = settings[acc.id] || { objective: 0 };
            const status = getStatus(acc);
            const progress = s.objective > 0 ? Math.min((acc.revenue || 0) / s.objective, 1) : 0;
            const progressPct = Math.round(progress * 100);
            const roas = acc.spend && acc.spend > 0 ? (acc.revenue || 0) / acc.spend : 0;

            return (
              <div key={acc.id} className="grid grid-cols-[180px_1fr_110px_70px] gap-4 items-center group py-0.5 border-b border-white/[0.02] last:border-0 pb-3 last:pb-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", status.color)}></div>
                  <div className="text-xs font-bold truncate text-neutral-300 tracking-tight group-hover:text-white transition-colors">{acc.name}</div>
                </div>
                
                <div className="space-y-1.5 px-2">
                  <div className="flex justify-between items-center px-0.5">
                    <span className={cn("text-[8px] font-black uppercase tracking-tight", status.text)}>{progressPct}%</span>
                    <span className="text-[7px] font-bold text-neutral-700 uppercase tracking-widest">
                      {formatCurrency(acc.revenue || 0, 'ARS')} / {formatCurrency(s.objective || 0, 'ARS')}
                    </span>
                  </div>
                  <div className="relative h-1 bg-white/[0.02] rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress * 100}%` }}
                      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                      className={cn("h-full rounded-full", status.color)}
                    />
                  </div>
                </div>

                <div className="text-right text-xs font-bold text-neutral-200 font-mono tracking-tighter">
                  {formatCurrency(acc.revenue || 0, (s as any).currency || acc.currency)}
                </div>

                <div className="text-right">
                  <span className={cn(
                    "text-[9px] font-black px-1.5 py-0.5 rounded-md border transition-all", 
                    status.text, 
                    status.border,
                    "bg-white/[0.01] group-hover:bg-white/[0.03]"
                  )}>
                    ×{formatDecimal(roas, 1)}
                  </span>
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
      <span className="text-[9px] font-black text-neutral-700 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[#141414] border border-white/5 p-5 rounded-xl shadow-lg hover:bg-[#181818] transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 blur-3xl rounded-full -mr-10 -mt-10 transition-all group-hover:bg-blue-600/10"></div>
      <div className="relative">
        <div className="text-[9px] font-black text-neutral-600 uppercase tracking-[0.15em] mb-2.5 group-hover:text-neutral-500 transition-colors">{label}</div>
        <div className="text-lg lg:text-xl font-bold text-white mb-1.5 leading-tight tracking-tight">{value}</div>
        <div className="text-[9px] text-neutral-800 font-bold uppercase tracking-wide group-hover:text-neutral-700 transition-colors">{sub}</div>
      </div>
    </div>
  );
}
