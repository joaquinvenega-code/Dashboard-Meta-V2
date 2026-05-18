import React from 'react';
import { Clock, CheckCircle2, Zap, Settings, AlertCircle, TrendingUp } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface LogEntry {
  id: string;
  date: string;
  description: string;
  category?: 'optimizacion' | 'alerta' | 'estrategia' | 'creativo' | 'config';
}

interface ManagementTimelineV2Props {
  logs: LogEntry[];
}

const CategoryIcon = ({ category }: { category?: string }) => {
  switch (category) {
    case 'optimizacion': return <Zap className="w-3 h-3 text-amber-500" />;
    case 'alerta': return <AlertCircle className="w-3 h-3 text-rose-500" />;
    case 'estrategia': return <TrendingUp className="w-3 h-3 text-blue-500" />;
    case 'creativo': return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
    case 'config': return <Settings className="w-3 h-3 text-slate-500" />;
    default: return <Clock className="w-3 h-3 text-slate-400" />;
  }
};

export const ManagementTimelineV2: React.FC<ManagementTimelineV2Props> = ({ logs }) => {
  return (
    <div className="relative">
      {/* Línea vertical de fondo */}
        <div className="absolute left-[39px] top-0 bottom-0 w-px bg-slate-200 print:bg-slate-300" />

        <div className="space-y-8">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div key={log.id} className="relative flex gap-6 animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                {/* Indicador de Fecha */}
                <div className="w-20 pt-1 shrink-0 text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{log.date}</span>
                </div>

                {/* Punto en la línea */}
                <div className="relative z-10 w-5 h-5 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                </div>

                {/* Contenido Card */}
                <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-4 hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 bg-white rounded border border-slate-100 shadow-sm">
                      <CategoryIcon category={log.category} />
                    </div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {log.category || 'Acción de Gestión'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">{log.description}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center py-10 text-slate-400 opacity-50">
              <Clock className="w-8 h-8 mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest text-center">No hay registros de bitácora para este período</p>
            </div>
          )}
        </div>
      </div>
  );
};
