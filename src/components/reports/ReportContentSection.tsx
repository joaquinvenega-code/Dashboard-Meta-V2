import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

export function ReportContentSection() {
  return (
    <div className="bg-neutral-50 rounded-xl p-10 border border-neutral-100 flex flex-col h-96">
       <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Contenido Ganador</h3>
             <p className="text-xl font-black text-neutral-900">Anuncios con Mayor ROI</p>
          </div>
       </div>
       <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-neutral-100 p-6 flex flex-col gap-4 hover:shadow-xl transition-all group">
               <div className="aspect-[4/5] bg-neutral-100 rounded-lg flex items-center justify-center relative overflow-hidden group-hover:-translate-y-2 transition-transform">
                  <ImageIcon className="w-12 h-12 text-neutral-200" />
                  <div className="absolute top-4 left-4 bg-blue-600 text-white text-[8px] font-black px-2 py-1 rounded-lg">TOP {i}</div>
               </div>
               <div className="space-y-3">
                  <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest truncate">Ad_Performance_0{i}_ID_772</div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <div className="text-[8px] font-black text-neutral-300 uppercase leading-none mb-1">ROAS</div>
                        <div className="text-lg font-black text-blue-600">×{12 - i * 2}.5</div>
                     </div>
                     <div>
                        <div className="text-[8px] font-black text-neutral-300 uppercase leading-none mb-1">Conversiones</div>
                        <div className="text-lg font-black text-neutral-800">{150 - i * 30}</div>
                     </div>
                  </div>
               </div>
            </div>
          ))}
       </div>
    </div>
  );
}
