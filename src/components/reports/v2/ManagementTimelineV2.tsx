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
    case 'optimizacion': return <Zap className="w-3.5 h-3.5 text-amber-500" />;
    case 'alerta': return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
    case 'estrategia': return <TrendingUp className="w-3.5 h-3.5 text-blue-500" />;
    case 'creativo': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    case 'config': return <Settings className="w-3.5 h-3.5 text-slate-500" />;
    default: return <Clock className="w-3.5 h-3.5 text-slate-400" />;
  }
};

export const ManagementTimelineV2: React.FC<ManagementTimelineV2Props> = ({ logs }) => {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-slate-400 opacity-50">
        <Clock className="w-8 h-8 mb-2" />
        <p className="text-[10px] font-black uppercase tracking-widest text-center">No hay registros de bitácora para este período</p>
      </div>
    );
  }

  const itemsPerRow = 3;
  const rowHeight = 260; 

  const getXPercent = (index: number) => {
     const rowIndex = Math.floor(index / itemsPerRow);
     const colIndex = index % itemsPerRow;
     const isEvenRow = rowIndex % 2 === 0;
     const visualColIndex = isEvenRow ? colIndex : (itemsPerRow - 1 - colIndex);
     return (visualColIndex * (100 / itemsPerRow)) + (50 / itemsPerRow);
  };
  
  const getYPos = (index: number) => {
     const rowIndex = Math.floor(index / itemsPerRow);
     return (rowIndex * rowHeight) + (rowHeight / 2);
  };

  const drawPathStr = () => {
    if (logs.length <= 1) return '';
    let d = `M ${getXPercent(0)}% ${getYPos(0)}`;
    for (let i = 0; i < logs.length - 1; i++) {
        const x1 = getXPercent(i);
        const y1 = getYPos(i);
        const x2 = getXPercent(i+1);
        const y2 = getYPos(i+1);
        
        if (y1 === y2) {
           d += ` L ${x2}% ${y2}`;
        } else {
           const isRightSide = x1 > 50; 
           const curveOffset = isRightSide ? 10 : -10; 
           d += ` C ${x1 + curveOffset}% ${y1}, ${x2 + curveOffset}% ${y2}, ${x2}% ${y2}`;
        }
    }
    return d;
  };

  const totalRows = Math.ceil(logs.length / itemsPerRow);
  const totalHeight = totalRows * rowHeight;

  return (
    <div className="w-full relative">
      
      {/* DESKTOP VIEW (Serpentine Timeline) */}
      <div className="hidden lg:block relative w-full overflow-hidden mb-8" style={{ height: `${totalHeight}px` }}>
        
        {/* The Serpentine Path */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <path 
               d={drawPathStr()} 
               stroke="#94a3b8" 
               strokeWidth="5" 
               fill="none" 
               strokeLinecap="round"
               strokeLinejoin="round" 
               className="opacity-70"
            />
        </svg>

        {/* Nodes and Cards */}
        {logs.map((log, index) => {
           const xPos = getXPercent(index);
           const yPos = getYPos(index);
           const cardTop = index % 2 === 0;

           return (
             <div 
               key={log.id} 
               className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500 will-change-transform"
               style={{ left: `${xPos}%`, top: `${yPos}px`, width: `${90 / itemsPerRow}%`, animationDelay: `${index * 50}ms` }}
             >
               {/* Node Dot */}
               <div className="relative z-20 w-5 h-5 bg-[#3b82f6] rounded-full border-[4px] border-white shadow flex items-center justify-center">
                 <div className="w-1.5 h-1.5 bg-blue-100 rounded-full animate-pulse" />
               </div>

               {/* Date Label */}
               <div className={`absolute ${cardTop ? 'top-[16px]' : '-top-[32px]'} font-black text-slate-900 text-[11px] tracking-widest bg-white/95 px-1.5 py-0.5 rounded backdrop-blur-sm z-30`}>
                 {log.date}
               </div>

               {/* Card Container */}
               <div className={`absolute ${cardTop ? 'bottom-[30px]' : 'top-[30px]'} left-1/2 -translate-x-1/2 w-full px-2 z-10 hover:z-50`}>
                 <div className="bg-white border-2 border-slate-200 hover:border-blue-400 rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all cursor-default relative">
                    {/* Directional Arrow pointing to node */}
                    <div className={`absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-r-2 border-b-2 border-slate-200 transform rotate-45 transition-colors ${cardTop ? '-bottom-[8px] rotate-[45deg]' : '-top-[8px] rotate-[-135deg] border-t-2 border-l-2 border-r-0 border-b-0'} group-hover:border-blue-400`} />
                    
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 text-slate-500 rounded bg-slate-50 border border-slate-100">
                          <CategoryIcon category={log.category} />
                        </div>
                        <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest leading-none pt-0.5">
                          {log.category || 'Acción'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                       {log.description}
                    </p>
                 </div>
               </div>
             </div>
           );
        })}
      </div>

      {/* MOBILE / TABLET VIEW (Vertical Alternating Timeline) */}
      <div className="block lg:hidden relative pb-8 mt-4">
        {/* Center Line for alternating timeline */}
        <div className="absolute left-[24px] sm:left-1/2 sm:-translate-x-1/2 top-0 bottom-0 w-1 bg-[#94a3b8] opacity-70 rounded-full" />

        <div className="space-y-6 sm:space-y-8 relative">
            {logs.map((log, index) => {
              const isEven = index % 2 === 0;
              return (
                <div key={log.id} className={`relative flex flex-col sm:flex-row items-start sm:items-center w-full animate-in fade-in slide-in-from-bottom-4 duration-500 ${isEven ? 'sm:justify-start' : 'sm:justify-end'}`} style={{ animationDelay: `${index * 50}ms` }}>
                  
                  {/* Node Dot Mobile/Tablet */}
                  <div className="absolute left-[16px] sm:left-1/2 sm:-translate-x-1/2 top-4 sm:top-1/2 sm:-translate-y-1/2 z-20 w-5 h-5 bg-[#3b82f6] rounded-full border-[4px] border-white shadow-md flex items-center justify-center">
                     <div className="w-1.5 h-1.5 bg-blue-100 rounded-full animate-pulse" />
                  </div>

                  {/* Card wrapper */}
                  <div className={`w-full sm:w-[45%] pl-[56px] sm:pl-0 ${isEven ? 'sm:pr-8' : 'sm:pl-8'}`}>
                     <div className="bg-white border-2 border-slate-200 rounded-xl p-4 relative shadow-sm hover:border-blue-400 transition-all cursor-default">
                        
                        {/* Mobile arrow (left) */}
                        <div className={`absolute top-4 -left-[9px] w-4 h-4 bg-white border-b-2 border-l-2 border-slate-200 transform rotate-45 sm:hidden`} />
                        
                        {/* Tablet arrow (alternating) */}
                        <div className={`hidden sm:block absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-slate-200 transform rotate-45 ${isEven ? '-right-[9px] border-t-2 border-r-2' : '-left-[9px] border-b-2 border-l-2'}`} />

                        <div className="flex items-center justify-between gap-2 mb-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 bg-slate-50 border border-slate-100 rounded text-slate-500">
                              <CategoryIcon category={log.category} />
                            </div>
                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest pt-0.5">
                              {log.category || 'Acción'}
                            </span>
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{log.date}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">{log.description}</p>
                     </div>
                  </div>

                </div>
              );
            })}
        </div>
      </div>

    </div>
  );
};
