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
    if (!s.objective) return { label: 'Sin objetivo', color: 'bg-neutral-500', text: 'text-neutral-400' };
    const progress = (acc.revenue || 0) / s.objective;
    if (progress >= 1) return { label: 'En objetivo', color: 'bg-success', text: 'text-success' };
    if (progress >= 0.7) return { label: 'En riesgo', color: 'bg-warning', text: 'text-warning' };
    return { label: 'Fuera de objetivo', color: 'bg-danger', text: 'text-danger' };
  };

  const onTrackCount = accounts.filter(acc => getStatus(acc).label === 'En objetivo').length;

  return (
    <div className="space-y-8">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard 
          label="Facturación" 
          value={totalRevenueStr} 
          sub="Revenue total de conversiones" 
        />
        <SummaryCard 
          label="Inversión" 
          value={totalSpendStr} 
          sub="Gasto total en Meta Ads" 
        />
        <SummaryCard 
          label="ROAS Promedio" 
          value={`×${formatDecimal(avgRoas)}`} 
          sub="Retorno sobre inversión" 
        />
        <SummaryCard 
          label="En Objetivo" 
          value={`${onTrackCount} / ${accounts.length}`} 
          sub="Cuentas activas" 
        />
      </div>

      {/* Evolution Section */}
      <div className="bg-[#1c1c1c] rounded-2xl p-6 border border-white/5">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400">Evolución del período</h3>
          <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
            <div className="flex items-center gap-1.5 text-success">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              En objetivo
            </div>
            <div className="flex items-center gap-1.5 text-warning">
              <div className="w-2 h-2 rounded-full bg-warning"></div>
              En riesgo
            </div>
            <div className="flex items-center gap-1.5 text-danger">
              <div className="w-2 h-2 rounded-full bg-danger"></div>
              Fuera de objetivo
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-[160px_1fr_100px_60px] gap-4 px-2 text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
            <div>Cliente</div>
            <div className="text-center">Progreso del objetivo</div>
            <div className="text-right">Facturado</div>
            <div className="text-right">ROAS</div>
          </div>
          
          {accounts.map(acc => {
            const s = settings[acc.id] || { objective: 0 };
            const status = getStatus(acc);
            const progress = s.objective > 0 ? Math.min((acc.revenue || 0) / s.objective, 1) : 0;
            const progressPct = Math.round(progress * 100);
            const roas = acc.spend && acc.spend > 0 ? (acc.revenue || 0) / acc.spend : 0;

            return (
              <div key={acc.id} className="grid grid-cols-[160px_1fr_100px_60px] gap-4 items-center group">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", status.color)}></div>
                  <div className="text-xs font-bold truncate text-neutral-300">{acc.name}</div>
                </div>
                
                <div className="relative h-6 bg-neutral-900 rounded-lg overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn("h-full relative", status.color.replace('bg-', 'bg-'))}
                  >
                    {progressPct > 15 && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-white/90">
                        {progressPct}%
                      </span>
                    )}
                  </motion.div>
                </div>

                <div className="text-right text-xs font-black text-neutral-300">
                  {formatCurrency(acc.revenue || 0, (s as any).currency || acc.currency)}
                </div>

                <div className="text-right">
                  <span className={cn("text-xs font-black px-2 py-0.5 rounded", status.text, status.color.replace('bg-', 'bg-') + "/10")}>
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

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[#1c1c1c] border border-white/5 p-6 rounded-2xl shadow-xl card-gradient">
      <div className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-3">{label}</div>
      <div className="text-xl lg:text-2xl font-black text-neutral-100 mb-1 leading-tight">{value}</div>
      <div className="text-[10px] text-neutral-500 font-medium">{sub}</div>
    </div>
  );
}
