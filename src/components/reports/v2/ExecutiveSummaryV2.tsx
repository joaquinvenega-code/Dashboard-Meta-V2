import React from 'react';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { cn, formatCurrency } from '../../../lib/utils';

interface KPIProps {
  label: string;
  value: string;
  change: number; 
  prefix?: string;
}

const KPICard = ({ label, value, change, prefix }: KPIProps) => {
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-end justify-between">
        <h4 className="text-2xl font-black text-slate-900">{value}</h4>
        <div className={cn(
          "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold",
          isNeutral ? "bg-slate-100 text-slate-500" : 
          isPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
        )}>
          {isNeutral ? <Minus className="w-3 h-3" /> : isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(change)}%
        </div>
      </div>
    </div>
  );
};

interface ExecutiveSummaryV2Props {
  metrics: {
    spend: number;
    purchases: number;
    roas: number;
    revenue: number;
  };
  prevMonthMetrics: {
    spend: number;
    purchases: number;
    roas: number;
    revenue: number;
  };
  narrative: string;
  onNarrativeChange: (value: string) => void;
  isEditing: boolean;
}

export const ExecutiveSummaryV2: React.FC<ExecutiveSummaryV2Props> = ({ 
  metrics, 
  prevMonthMetrics, 
  narrative, 
  onNarrativeChange,
  isEditing
}) => {
  const calculateChange = (current: number, prev: number) => {
    if (prev === 0) return 0;
    return Math.round(((current - prev) / prev) * 100);
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">01</div>
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Resumen Ejecutivo</h3>
      </div>

      <div className="space-y-4">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Info className="w-4 h-4" />
          Status General y Análisis Narrativo
        </div>
        {isEditing ? (
          <textarea
            value={narrative}
            onChange={(e) => onNarrativeChange(e.target.value)}
            placeholder="Escribe el resumen ejecutivo para el cliente..."
            className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {narrative || "No se ha ingresado un resumen narrativo para este período."}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          label="Inversión" 
          value={formatCurrency(metrics.spend, 'ARS')} 
          change={calculateChange(metrics.spend, prevMonthMetrics.spend)} 
        />
        <KPICard 
          label="Conversiones" 
          value={metrics.purchases.toString()} 
          change={calculateChange(metrics.purchases, prevMonthMetrics.purchases)} 
        />
        <KPICard 
          label="ROAS Promedio" 
          value={`${metrics.roas.toFixed(2)}x`} 
          change={calculateChange(metrics.roas, prevMonthMetrics.roas)} 
        />
        <KPICard 
          label="Facturación Total" 
          value={formatCurrency(metrics.revenue, 'ARS')} 
          change={calculateChange(metrics.revenue, prevMonthMetrics.revenue)} 
        />
      </div>
    </section>
  );
};
