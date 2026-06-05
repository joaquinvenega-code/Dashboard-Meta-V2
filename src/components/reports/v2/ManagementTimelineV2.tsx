import React, { useState } from 'react';
import { Clock, LayoutTemplate, Waypoints } from 'lucide-react';
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


export const ManagementTimelineV2: React.FC<ManagementTimelineV2Props> = ({ logs }) => {
  const [viewMode, setViewMode] = useState<'serpentine' | 'masonry'>('masonry');

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-slate-400 opacity-50">
        <Clock className="w-8 h-8 mb-2" />
        <p className="text-[10px] font-black uppercase tracking-widest text-center">No hay registros de bitácora para este período</p>
      </div>
    );
  }

  const itemsPerRow = 2;

  const getXPercent = (index: number) => {
     const rowIndex = Math.floor(index / itemsPerRow);
     const colIndex = index % itemsPerRow;
     const isEvenRow = rowIndex % 2 === 0;
     const visualColIndex = isEvenRow ? colIndex : (itemsPerRow - 1 - colIndex);
     return (visualColIndex * (100 / itemsPerRow)) + (50 / itemsPerRow);
  };
  
  const getYPos = (index: number) => {
     const rowIndex = Math.floor(index / itemsPerRow);
     const blockIndex = Math.floor(rowIndex / 2); 
     const isSecondInBlock = rowIndex % 2 === 1;
     
     let y = 180; 
     y += blockIndex * (60 + 200); 
     if (isSecondInBlock) {
        y += 60;
     }
     return y;
  };

  const drawPathStr = () => {
    if (logs.length <= 1) return '';
    let d = `M ${getXPercent(0) * 10} ${getYPos(0)}`;
    for (let i = 0; i < logs.length - 1; i++) {
        const x1 = getXPercent(i) * 10;
        const y1 = getYPos(i);
        const x2 = getXPercent(i+1) * 10;
        const y2 = getYPos(i+1);
        
        if (y1 === y2) {
           d += ` L ${x2} ${y2}`;
        } else {
           const isRightSide = x1 > 500; 
           const curveOffset = isRightSide ? 200 : -200; 
           d += ` C ${x1 + curveOffset} ${y1}, ${x2 + curveOffset} ${y2}, ${x2} ${y2}`;
        }
    }
    return d;
  };

  const lastY = logs.length > 0 ? getYPos(logs.length - 1) : 0;
  const totalHeight = lastY + 200;

  return (
    <div className="w-full relative">
      <div className="flex justify-end mb-6">
         <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button 
               onClick={() => setViewMode('masonry')}
               className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'masonry' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
            >
               <LayoutTemplate className="w-3.5 h-3.5" />
               Flexible
            </button>
            <button 
               onClick={() => setViewMode('serpentine')}
               className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'serpentine' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
            >
               <Waypoints className="w-3.5 h-3.5" />
               Camino
            </button>
         </div>
      </div>
      
      {/* DESKTOP VIEW (Serpentine Timeline) */}
      {viewMode === 'serpentine' && (
      <div className="hidden lg:block relative w-full overflow-hidden mb-8" style={{ height: `${totalHeight}px` }}>
        
        {/* The Serpentine Path */}
        <svg 
           className="absolute inset-0 w-full h-full pointer-events-none" 
           viewBox={`0 0 1000 ${totalHeight}`}
           preserveAspectRatio="none"
        >
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
           const rowIndex = Math.floor(index / itemsPerRow);
           
           const colIndex = index % itemsPerRow;
           const isEvenRow = rowIndex % 2 === 0;
           const visualColIndex = isEvenRow ? colIndex : (itemsPerRow - 1 - colIndex);
           const cardTop = visualColIndex === 0;

           return (
             <div 
               key={log.id} 
               className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500 will-change-transform"
               style={{ left: `${xPos}%`, top: `${yPos}px`, width: `${96 / itemsPerRow}%`, animationDelay: `${index * 50}ms` }}
             >
               {/* Node Dot */}
               <div className="relative z-20 w-5 h-5 bg-[#3b82f6] rounded-full border-[4px] border-white shadow flex items-center justify-center">
                 <div className="w-1.5 h-1.5 bg-blue-100 rounded-full animate-pulse" />
               </div>

               {/* Date Label */}
               <div className={`absolute ${cardTop ? 'bottom-[34px]' : 'top-[34px]'} left-1/2 -translate-x-1/2 font-black text-slate-900 text-[10px] tracking-widest bg-white/95 px-1.5 py-0.5 rounded backdrop-blur-sm z-30 shadow-sm border border-slate-100`}>
                 {log.date}
               </div>

               {/* Card Container */}
               <div className={`absolute ${cardTop ? 'bottom-[50px]' : 'top-[50px]'} left-1/2 -translate-x-1/2 w-full px-1 z-10 hover:z-50`}>
                 <div className="bg-white border text-center border-slate-200 hover:border-blue-400 rounded-xl p-2.5 shadow-sm hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all cursor-default relative">
                    {/* Directional Arrow pointing to node */}
                    <div className={`absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-r border-b border-slate-200 transform rotate-45 transition-colors ${cardTop ? '-bottom-[7px] rotate-[45deg]' : '-top-[7px] rotate-[-135deg] border-t border-l border-r-0 border-b-0'} group-hover:border-blue-400`} />
                    
                    <div className="px-1">
                      <p className="text-[10px] text-slate-600 font-medium leading-tight">
                         {log.description}
                      </p>
                    </div>
                 </div>
               </div>
             </div>
           );
        })}
      </div>
      )}

      {/* MOBILE / TABLET VIEW (Vertical Alternating Timeline) */}
      <div className={cn("relative pb-8 mt-4", viewMode === 'masonry' ? 'block' : 'block lg:hidden')}>
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
                  <div className={`w-full sm:w-[50%] pl-[56px] sm:pl-0 ${isEven ? 'sm:pr-6' : 'sm:pl-6'}`}>
                     <div className="bg-white text-center border border-slate-200 rounded-xl p-3 relative shadow-sm hover:border-blue-400 transition-all cursor-default">
                        
                        {/* Mobile arrow (left) */}
                        <div className={`absolute top-4 -left-[6px] w-3 h-3 bg-white border-b border-l border-slate-200 transform rotate-45 sm:hidden`} />
                        
                        {/* Tablet arrow (alternating) */}
                        <div className={`hidden sm:block absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-slate-200 transform rotate-45 ${isEven ? '-right-[6px] border-t border-r' : '-left-[6px] border-b border-l'}`} />

                        <div className="flex items-center justify-center mb-1 pb-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{log.date}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 leading-tight font-medium">{log.description}</p>
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
