import React from 'react';
import { TrendingUp, Users } from 'lucide-react';
import { formatCurrency, formatDecimal } from '../../lib/utils';

interface ReportBreakdownSectionProps {
  spend: number;
  currency: string;
}

export function ReportBreakdownSection({ spend, currency }: ReportBreakdownSectionProps) {
  return (
    <div className="bg-neutral-50 rounded-xl p-10 border border-neutral-100 mt-2">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Resultados por Cuenta</h3>
          <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest">Atribución 7-días click + 1-día vista</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-neutral-100 shadow-sm">
           <span className="text-[10px] font-black text-blue-600">Verified Analytics</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-12">
         <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-black text-neutral-400 uppercase">CTR AVG</span>
            </div>
            <div className="text-3xl font-black text-neutral-900">{formatDecimal(1.65)}%</div>
            <div className="h-1 w-full bg-neutral-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-[65%]" />
            </div>
         </div>
         <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-black text-neutral-400 uppercase">CPM AVG</span>
            </div>
            <div className="text-3xl font-black text-neutral-900">{formatCurrency(12.45, currency)}</div>
            <div className="h-1 w-full bg-neutral-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[45%]" />
            </div>
         </div>
         <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" />
              <span className="text-[10px] font-black text-neutral-400 uppercase">FRECUENCIA</span>
            </div>
            <div className="text-3xl font-black text-neutral-900">1.74</div>
            <div className="h-1 w-full bg-neutral-200 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 w-[30%]" />
            </div>
         </div>
         <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-black text-neutral-400 uppercase">CPC AVG</span>
            </div>
            <div className="text-3xl font-black text-neutral-900">{formatCurrency(spend / (spend * 0.8 || 1), currency)}</div>
            <div className="h-1 w-full bg-neutral-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 w-[55%]" />
            </div>
         </div>
      </div>
    </div>
  );
}
