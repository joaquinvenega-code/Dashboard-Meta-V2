import React from 'react';
import { Target, DollarSign, ShoppingCart, TrendingUp, MousePointer2, Percent, Users, BarChart3 } from 'lucide-react';
import { cn, formatCurrency } from '../../../lib/utils';

interface MonthlyPerformanceV2Props {
  metrics: {
    spend: number;
    purchases: number;
    revenue: number;
    impressions: number;
    clicks: number;
    currency: string;
  };
}

const PerformanceRow = ({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  colorClass 
}: { 
  icon: any, 
  label: string, 
  value: string, 
  subValue?: string,
  colorClass: string 
}) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 group">
    <div className="flex items-center gap-3">
      <div className={cn("p-2 rounded-lg transition-colors", colorClass)}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-xs font-bold text-slate-900">{value}</p>
      </div>
    </div>
    {subValue && (
      <div className="text-right">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Métrica Relativa</p>
        <p className="text-[11px] font-black text-blue-600">{subValue}</p>
      </div>
    )}
  </div>
);

export const MonthlyPerformanceV2: React.FC<MonthlyPerformanceV2Props> = ({ metrics }) => {
  const roas = metrics.revenue / (metrics.spend || 1);
  const cpa = metrics.spend / (metrics.purchases || 1);
  const ctr = (metrics.clicks / (metrics.impressions || 1)) * 100;
  const cpc = metrics.spend / (metrics.clicks || 1);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-full flex flex-col">
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-4 h-4 text-white" />
          <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Rendimiento Mensual</h3>
        </div>
        <div className="px-2 py-0.5 bg-blue-500 rounded text-[8px] font-black text-white uppercase tracking-widest">
          Consolidado
        </div>
      </div>

      <div className="p-6 flex-1 space-y-1">
        <PerformanceRow 
          icon={DollarSign}
          label="Facturación"
          value={formatCurrency(metrics.revenue, metrics.currency)}
          subValue={`ROI: ${((metrics.revenue - metrics.spend) / metrics.spend * 100).toFixed(0)}%`}
          colorClass="bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
        />
        <PerformanceRow 
          icon={ShoppingCart}
          label="Compras Totales"
          value={metrics.purchases.toString()}
          subValue={`CPA: ${formatCurrency(cpa, metrics.currency)}`}
          colorClass="bg-blue-50 text-blue-600 group-hover:bg-blue-100"
        />
        <PerformanceRow 
          icon={TrendingUp}
          label="ROAS"
          value={`${roas.toFixed(2)}x`}
          subValue="Eficiencia Directa"
          colorClass="bg-amber-50 text-amber-600 group-hover:bg-amber-100"
        />
        <PerformanceRow 
          icon={Target}
          label="Inversión"
          value={formatCurrency(metrics.spend, metrics.currency)}
          subValue={`${((metrics.spend / (metrics.revenue || 1)) * 100).toFixed(1)}% de Fact.`}
          colorClass="bg-slate-50 text-slate-600 group-hover:bg-slate-100"
        />
        <PerformanceRow 
          icon={MousePointer2}
          label="Tráfico (Clics)"
          value={metrics.clicks.toString()}
          subValue={`CPC: ${formatCurrency(cpc, metrics.currency)}`}
          colorClass="bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
        />
        <PerformanceRow 
          icon={Percent}
          label="CTR"
          value={`${ctr.toFixed(2)}%`}
          subValue="Relevancia"
          colorClass="bg-rose-50 text-rose-600 group-hover:bg-rose-100"
        />
      </div>

      <div className="bg-slate-50 px-6 py-3 border-t border-slate-100">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">
          Datos extraídos de Meta Ads API v18.0
        </p>
      </div>
    </div>
  );
};
