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

            <div className="relative aspect-[3/4] bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden p-6">
               {/* Realistic Argentina SVG Map (Simplified but accurate) */}
               <svg viewBox="0 0 200 300" className="w-full h-full drop-shadow-sm">
                 {/* Simplified Argentina Provinces Path (General shape) */}
                 <path 
                   d="M93.3,10.6 C88.2,12.5 83.1,16.4 80.5,21.5 L78.2,26.1 L73.6,26.4 C67.9,26.8 65.4,28.2 62.6,32.3 L60.4,35.7 L56.1,35.1 C49.3,34.1 47.7,35.4 46.8,42.7 L46.2,47.8 L41.2,49.8 C34.3,52.6 34.0,52.9 34.0,60.8 L34.0,68.9 L30.9,71.0 C24.6,75.1 23.3,83.9 27.2,95.0 C28.9,99.9 29.3,107.8 28.5,123.8 L27.7,139.7 L34.3,158.4 C41.6,179.3 43.1,185.3 43.1,196.7 C43.1,208.5 45.4,213.9 57.0,229.4 C63.5,238.1 76.5,263.1 78.6,270.6 L80.0,275.4 L85.1,273.8 C98.5,269.4 100.8,266.3 103.5,248.8 C105.7,235.1 107.0,231.8 113.8,223.3 C120.3,215.1 123.2,207.7 124.9,195.4 L126.7,181.7 L132.3,174.4 C136.6,168.9 141.6,160.7 141.9,158.8 L142.4,155.3 L135.5,148.9 L128.5,142.5 L129.5,135.2 C130.5,127.3 129.5,121.2 126.0,111.4 L123.3,103.7 L116.4,103.7 C109.9,103.7 109.5,103.4 109.5,98.6 C109.5,93.4 113.8,87.6 122.9,81.1 L131.0,75.3 L129.6,68.2 C127.3,56.7 125.7,54.4 117.8,51.8 L111.1,49.6 L111.3,44.7 C111.5,41.2 110.6,38.6 108.5,36.5 L106.0,34.0 L107.1,28.8 C108.3,23.3 107.6,19.2 104.9,15.7 C102.3,12.3 98.6,10.1 93.3,10.6 Z" 
                   fill="#f1f5f9"
                   stroke="#cbd5e1"
                   strokeWidth="1.5"
                 />
                 {/* Heat hotspots */}
                 {regions.map((region, idx) => {
                    const positions: Record<string, { x: number, y: number }> = {
                      'Buenos Aires': { x: 105, y: 140 },
                      'Córdoba': { x: 85, y: 105 },
                      'Santa Fe': { x: 100, y: 95 },
                      'Mendoza': { x: 60, y: 130 },
                      'Otros': { x: 70, y: 40 }
                    };
                    const pos = positions[region.name] || { x: 100, y: 150 };
                    // Heat colors based on intensity
                    const color = region.intensity > 0.8 ? '#ef4444' : region.intensity > 0.5 ? '#f97316' : '#3b82f6';
                    return (
                      <g key={region.name}>
                        <circle 
                          cx={pos.x} 
                          cy={pos.y} 
                          r={region.value * 25} 
                          fill={color} 
                          className="opacity-20 animate-pulse" 
                        />
                        <circle 
                          cx={pos.x} 
                          cy={pos.y} 
                          r={region.value * 12} 
                          fill={color} 
                          className="opacity-40" 
                        />
                        <circle 
                          cx={pos.x} 
                          cy={pos.y} 
                          r="2" 
                          fill={color} 
                        />
                      </g>
                    );
                 })}
               </svg>
               <div className="absolute inset-x-0 bottom-6 flex justify-center">
                  <div className="flex items-center gap-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="text-[7px] font-black uppercase text-slate-500 tracking-tighter">Fuerte</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <span className="text-[7px] font-black uppercase text-slate-500 tracking-tighter">Medio</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="text-[7px] font-black uppercase text-slate-500 tracking-tighter">Estable</span>
                    </div>
                  </div>
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
