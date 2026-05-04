import React from 'react';
import { BarChart3 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReportHeaderProps {
  name: string;
  logo?: string;
  month: string;
}

export function ReportHeader({ name, logo, month }: ReportHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b-2 border-neutral-100 pb-8">
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-center p-3 shadow-inner">
          {logo ? (
            <img src={logo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          ) : (
            <BarChart3 className="w-10 h-10 text-blue-600" />
          )}
        </div>
        <div className="space-y-1">
          <h1 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600">Informe de Rendimiento Publicitario</h1>
          <div className="text-3xl font-black tracking-tight text-neutral-900">{name}</div>
        </div>
      </div>
      <div className="text-right">
         <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">Periodo Analizado</div>
         <div className="text-sm font-bold text-neutral-900 bg-neutral-50 px-4 py-2 rounded-xl border border-neutral-100">
           {format(parseISO(month + '-01'), 'MMMM yyyy', { locale: es }).toUpperCase()}
         </div>
      </div>
    </div>
  );
}
