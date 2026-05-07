import React from 'react';
import { formatCurrency, formatDecimal } from '../../lib/utils';

interface ReportSummaryCardsProps {
  spend: number;
  revenue: number;
  offlineRevenue?: number;
  purchases: number;
  messages: number;
  currency: string;
}

function MiniMetricCard({ label, value, color, secondary }: { label: string, value: string, color: string, secondary?: string }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-neutral-100 flex flex-col justify-between h-32 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-neutral-50 rounded-full -mr-12 -mt-12 opacity-50" />
      <div className="relative z-10 flex flex-col h-full">
        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">{label}</div>
        <div className="text-xl font-black tracking-tight text-neutral-900">{value}</div>
        {secondary && <div className="text-[9px] font-bold text-neutral-500 mt-auto">{secondary}</div>}
      </div>
      {!secondary && (
        <div className="w-full h-1 bg-neutral-50 rounded-full overflow-hidden mt-2">
          <div className="h-full rounded-full" style={{ backgroundColor: color, width: '45%' }} />
        </div>
      )}
    </div>
  );
}

export function ReportSummaryCards({ spend, revenue, offlineRevenue = 0, purchases, messages, currency }: ReportSummaryCardsProps) {
  const totalRevenue = (revenue || 0) + (offlineRevenue || 0);
  const roasReal = totalRevenue / (spend || 1);
  const cpa = spend / (purchases || messages || 1);

  return (
    <div className="grid grid-cols-4 gap-4">
      <MiniMetricCard 
        label="Inversión" 
        value={formatCurrency(spend || 0, currency)} 
        color="#3b82f6" 
      />
      <MiniMetricCard 
        label="Facturación Total" 
        value={formatCurrency(totalRevenue, currency)} 
        secondary={`Meta: ${formatCurrency(revenue, currency)} | Offline: ${formatCurrency(offlineRevenue, currency)}`}
        color="#10b981" 
      />
      <MiniMetricCard 
        label="ROAS Real" 
        value={`×${formatDecimal(roasReal)}`} 
        secondary={`ROAS Meta: ×${formatDecimal((revenue || 0) / (spend || 1))}`}
        color="#8b5cf6" 
      />
      <MiniMetricCard 
        label="CPA / CPR" 
        value={formatCurrency(cpa, currency)} 
        color="#f59e0b" 
      />
    </div>
  );
}
