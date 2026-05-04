import React from 'react';
import { formatCurrency, formatDecimal } from '../../lib/utils';

interface ReportSummaryCardsProps {
  spend: number;
  revenue: number;
  purchases: number;
  messages: number;
  currency: string;
}

function MiniMetricCard({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-neutral-100 flex flex-col justify-between h-28 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-neutral-50 rounded-full -mr-12 -mt-12 opacity-50" />
      <div className="relative z-10">
        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">{label}</div>
        <div className="text-2xl font-black tracking-tight text-neutral-900">{value}</div>
      </div>
      <div className="w-full h-1 bg-neutral-50 rounded-full overflow-hidden mt-4">
        <div className="h-full rounded-full" style={{ backgroundColor: color, width: '45%' }} />
      </div>
    </div>
  );
}

export function ReportSummaryCards({ spend, revenue, purchases, messages, currency }: ReportSummaryCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <MiniMetricCard 
        label="Inversión" 
        value={formatCurrency(spend || 0, currency)} 
        color="#3b82f6" 
      />
      <MiniMetricCard 
        label="Facturación" 
        value={formatCurrency(revenue || 0, currency)} 
        color="#10b981" 
      />
      <MiniMetricCard 
        label="ROAS" 
        value={`×${formatDecimal((revenue || 0) / (spend || 1))}`} 
        color="#8b5cf6" 
      />
      <MiniMetricCard 
        label="CPA / CPR" 
        value={formatCurrency(spend / (purchases || messages || 1), currency)} 
        color="#f59e0b" 
      />
    </div>
  );
}
