import React, { useState } from 'react';
import { Users, Map, Plus, Minus, Maximize2 } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer
} from 'recharts';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup
} from 'react-simple-maps';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface DemographicsGeographyV2Props {
  demoData: {
    age: string;
    male: number;
    female: number;
  }[];
  regions: {
    name: string;
    value: number;
    intensity: number;
    coords: [number, number]; // [longitude, latitude]
  }[];
}

export const DemographicsGeographyV2: React.FC<DemographicsGeographyV2Props> = ({ demoData, regions }) => {
  const [position, setPosition] = useState({ coordinates: [0, 0], zoom: 1 });

  function handleZoomIn() {
    if (position.zoom >= 4) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.5 }));
  }

  function handleZoomOut() {
    if (position.zoom <= 1) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom / 1.5 }));
  }

  function handleMoveEnd(newPosition: any) {
    setPosition(newPosition);
  }

  return (
    <div className="flex flex-col gap-12 mt-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-250">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Demographics Column */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">05</div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Demografía de Audiencia</h3>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm h-full flex flex-col">
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
            
            <div className="h-[300px] flex-1">
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
                  <RechartsTooltip 
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

        {/* Global Distribution Overview (Small info box) */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">06</div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Concentración Geográfica</h3>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col h-full">
            <div className="flex items-center gap-2 mb-6">
              <Map className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumen Regional</span>
            </div>
            
            <div className="flex-1 space-y-4">
              {regions.map((region) => (
                <div key={region.name} className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-tighter text-slate-500">
                    <span>{region.name}</span>
                    <span className="text-blue-600 font-black">{(region.value * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${region.value * 100}%`,
                        opacity: region.intensity
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-50">
              <p className="text-[10px] font-bold text-slate-400 italic leading-relaxed">
                "La presencia de marca se expande globalmente con un núcleo sólido en el Cono Sur."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Interactive Map */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <Map className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">Visualización Global</h4>
            <p className="text-sm font-black text-slate-900 capitalize">Distribución de Impacto Geográfico</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl relative overflow-hidden h-[600px]">
          {/* Zoom Controls */}
          <div className="absolute top-8 right-8 z-20 flex flex-col gap-2">
            <button 
              onClick={handleZoomIn}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur text-white flex items-center justify-center transition-all border border-white/10"
              title="Aumentar Zoom"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button 
              onClick={handleZoomOut}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur text-white flex items-center justify-center transition-all border border-white/10"
              title="Disminuir Zoom"
            >
              <Minus className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setPosition({ coordinates: [0, 0], zoom: 1 })}
              className="w-10 h-10 rounded-xl bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-all shadow-lg"
              title="Restablecer Vista"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          <div className="w-full h-full cursor-grab active:cursor-grabbing">
            <ComposableMap projection="geoMercator" width={800} height={400} style={{ width: "100%", height: "100%" }}>
              <ZoomableGroup
                zoom={position.zoom}
                center={position.coordinates as [number, number]}
                onMoveEnd={handleMoveEnd}
              >
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="#1e293b"
                        stroke="#334155"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: "none" },
                          hover: { fill: "#334155", outline: "none" },
                          pressed: { outline: "none" },
                        }}
                      />
                    ))
                  }
                </Geographies>
                {regions.map((region) => {
                  const color = region.intensity > 0.8 ? '#3b82f6' : region.intensity > 0.5 ? '#60a5fa' : '#93c5fd';
                  return (
                    <Marker key={region.name} coordinates={region.coords}>
                      <g>
                        <circle 
                          r={4 + region.value * 20} 
                          fill={color} 
                          className="opacity-20 animate-pulse" 
                        />
                        <circle 
                          r={2 + region.value * 8} 
                          fill={color} 
                          className="opacity-60" 
                        />
                        <circle 
                          r={1.5} 
                          fill="#fff" 
                        />
                      </g>
                    </Marker>
                  );
                })}
              </ZoomableGroup>
            </ComposableMap>
          </div>
        </div>

        {/* Legend below the container as requested */}
        <div className="flex flex-wrap items-center justify-between gap-6 px-8 py-6 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Concentración Alta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-300" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Concentración Media</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-300" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Presencia Orgánica</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 italic">
            <Maximize2 className="w-3 h-3" />
            Mapa interactivo: usa clic y arrastra para explorar, scroll para zoom.
          </div>
        </div>
      </div>
    </div>
  );
};
