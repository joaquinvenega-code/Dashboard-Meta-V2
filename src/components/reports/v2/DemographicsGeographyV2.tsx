import React from 'react';
import { Users, Map, PieChart as PieChartIcon } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';

interface DemographicsGeographyV2Props {
  demoData: {
    age: string;
    male: number;
    female: number;
  }[];
  regions: {
    name: string;
    value: number;
    intensity: number; // 0 to 1
  }[];
}

export const DemographicsGeographyV2: React.FC<DemographicsGeographyV2Props> = ({ demoData, regions }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-250">
      {/* Demographics Column */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">05</div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Demografía de Audiencia</h3>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distribución por Edad y Género</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Hombres</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-pink-400" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mujeres</span>
              </div>
            </div>
          </div>
          
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demoData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="age" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#cbd5e1' }}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    fontSize: '10px',
                    fontWeight: 700
                  }}
                  formatter={(val: number) => [`${val}%`, '']}
                />
                <Bar dataKey="male" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="female" fill="#f472b6" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Geography Heatmap Column */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">06</div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Concentración Geográfica</h3>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col h-fit">
          <div className="flex items-center gap-2 mb-6">
            <Map className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mapa de Calor por Región</span>
          </div>

          <div className="grid grid-cols-2 gap-8 items-start">
            {/* Simple Graphic Representation instead of full map for performance & elegance */}
            <div className="space-y-1 relative">
              {regions.map((region, i) => (
                <div key={region.name} className="flex flex-col gap-1">
                   <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-tighter">
                     <span className="text-slate-500 truncate w-24">{region.name}</span>
                     <span className="text-blue-600">{(region.value * 100).toFixed(0)}%</span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                     <div 
                       className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                       style={{ width: `${region.value * 100}%`, opacity: region.intensity }}
                     />
                   </div>
                </div>
              ))}
            </div>

            <div className="relative aspect-[3/4] bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden">
               {/* Minimalist abstract Argentina map or just circular indicators */}
               <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  {/* Styled pulse circles representing order concentration */}
                  <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-500/20 rounded-full animate-ping" />
                  <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full" />
                  
                  <div className="absolute top-1/2 left-1/3 w-6 h-6 bg-blue-500/10 rounded-full animate-ping delay-300" />
                  <div className="absolute top-1/2 left-1/3 w-4 h-4 bg-blue-500/30 rounded-full" />

                  <div className="absolute bottom-1/4 right-1/4 w-3 h-3 bg-blue-500/20 rounded-full animate-ping delay-700" />
                  <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-blue-500/40 rounded-full" />
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest text-center mt-auto">Puntos de Concentración</span>
               </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[9px] font-bold text-slate-400 italic">
              "Gran Buenos Aires y Córdoba representan el 65% del volumen de ventas nacional."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
