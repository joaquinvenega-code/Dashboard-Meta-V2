import React from 'react';
import { History, Target, Zap, TrendingUp, FlaskConical } from 'lucide-react';
import { BitacoraLog } from '../backend/types/orion';

interface TimelineGestionProps {
  logs: BitacoraLog[];
}

const CategoryIcon = ({ category }: { category: string }) => {
  switch (category) {
    case 'estructura': return <Target className="w-3 h-3 text-indigo-400" />;
    case 'optimizacion': return <Zap className="w-3 h-3 text-blue-400" />;
    case 'escalado': return <TrendingUp className="w-3 h-3 text-emerald-400" />;
    case 'testing': return <FlaskConical className="w-3 h-3 text-amber-400" />;
    default: return <History className="w-3 h-3 text-slate-400" />;
  }
};

export const TimelineGestion: React.FC<TimelineGestionProps> = ({ logs }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg max-h-[500px] overflow-y-auto">
      <h3 className="text-sm font-bold text-slate-200 mb-6 flex items-center gap-2 sticky top-0 bg-slate-900 py-1 z-10">
        <History className="w-4 h-4 text-indigo-400" />
        Bitácora de Gestión
      </h3>
      
      {logs.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-xs text-slate-500 italic">No hay acciones registradas este mes.</p>
        </div>
      ) : (
        <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-800">
          {[...logs].reverse().map((log) => (
            <div key={log.id} className="relative pl-8 animate-in fade-in slide-in-from-left-2 duration-500">
              <div className="absolute left-0 top-1 p-1 bg-slate-950 border border-slate-800 rounded-full z-10 shadow-sm">
                <CategoryIcon category={log.category} />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{log.category}</span>
                  <span className="text-[9px] font-bold text-slate-500">{log.date}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{log.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
