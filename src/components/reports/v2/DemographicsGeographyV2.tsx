import React, { useState, useRef } from 'react';
import { Users, Map, Plus, Minus, Maximize2, Globe2 } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
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
    intensity: number;
    coords: [number, number]; // [x_pct, y_pct]
  }[];
}

export const DemographicsGeographyV2: React.FC<DemographicsGeographyV2Props> = ({ demoData, regions }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 5));
  const handleZoomOut = () => {
    setZoom(prev => {
      const newZoom = Math.max(prev / 1.5, 1);
      if (newZoom === 1) setOffset({ x: 0, y: 0 });
      return newZoom;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setOffset({ x: newX, y: newY });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Demographics Column */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-900" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Perfil de Audiencia</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-[8px]">Hombres</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-[8px]">Mujeres</span>
              </div>
            </div>
          </div>
          
          <div className="h-[280px] flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demoData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="age" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#cbd5e1' }}
                  tickFormatter={(val) => `${val}%`}
                />
                <RechartsTooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid #f1f5f9', 
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '16px'
                  }}
                  formatter={(val: number) => [`${val}%`, '']}
                />
                <Bar dataKey="male" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} barSize={32} />
                <Bar dataKey="female" fill="#f472b6" stackId="a" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Distribution Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-8">
            <Globe2 className="w-4 h-4 text-slate-900" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Volumen de Ventas por Región</span>
          </div>
          
          <div className="flex-1 space-y-6">
            {regions.map((region) => (
              <div key={region.name} className="space-y-2">
                <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-tight text-slate-600">
                  <span>{region.name}</span>
                  <span className="text-blue-600">{(region.value * 100).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.3)] transition-all duration-1000"
                    style={{ width: `${region.value * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* High-Resolution Interactive Map Section */}
      <div className="space-y-6">
        <div 
          className="bg-[#0f172a] border border-slate-800 rounded-[2.5rem] shadow-[0_45px_100px_-20px_rgba(0,0,0,0.4)] relative overflow-hidden h-[600px] select-none group/map"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Zoom Overlay UI */}
          <div className="absolute top-8 right-8 z-20 flex flex-col gap-2">
            <button onClick={handleZoomIn} className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 backdrop-blur-xl text-white flex items-center justify-center transition-all border border-white/10 shadow-2xl">
              <Plus className="w-5 h-5" />
            </button>
            <button onClick={handleZoomOut} className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 backdrop-blur-xl text-white flex items-center justify-center transition-all border border-white/10 shadow-2xl">
              <Minus className="w-5 h-5" />
            </button>
            <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="w-12 h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)] border border-blue-400/30">
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>

          {/* Interactive Layer */}
          <div 
            className="w-full h-full transition-transform duration-300 ease-out flex items-center justify-center relative"
            style={{ 
              transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
          >
            {/* World Map Background Grid */}
            <svg viewBox="0 0 1000 500" className="absolute inset-0 w-full h-full opacity-5 pointer-events-none">
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
              <rect width="1000" height="500" fill="url(#grid)" />
            </svg>

            {/* High-Fidelity Professional World Map Paths */}
            <svg viewBox="0 0 1000 500" className="w-[115%] h-[115%] drop-shadow-[0_0_60px_rgba(2,6,23,0.8)]">
              <g fill="#1e293b" stroke="#334155" strokeWidth="0.5">
                {/* Americas */}
                <path d="M120,60 L240,40 L340,90 L320,160 L240,240 L300,320 L350,380 L320,480 L250,420 L210,320 L160,260 L100,200 L90,140 Z" />
                {/* Europe/Africa */}
                <path d="M450,110 L550,100 L580,140 L540,160 L480,180 L440,140 Z M460,185 L540,175 L620,200 L640,300 L580,420 L500,450 L460,320 L440,240 Z" />
                {/* Asia/Oceania */}
                <path d="M580,100 L750,80 L880,120 L920,240 L850,320 L720,310 L640,250 L590,180 Z M780,340 L880,330 L920,380 L880,440 L800,420 Z" />
                {/* Greenland/North */}
                <path d="M280,30 L400,20 L440,50 L380,80 L300,70 Z" />
              </g>

              {/* Hotspots with Performance Glow */}
              {regions.map((region) => {
                const x = (region.coords[0] / 100) * 1000;
                const y = (region.coords[1] / 100) * 500;
                const color = "#3b82f6";
                return (
                  <g key={region.name} className="group/hotspot cursor-pointer">
                    <circle cx={x} cy={y} r={12 + region.value * 60} fill={color} className="opacity-[0.03] group-hover/hotspot:opacity-10 transition-opacity duration-700" />
                    <circle cx={x} cy={y} r={6 + region.value * 30} fill={color} className="opacity-10 animate-pulse" />
                    <circle cx={x} cy={y} r={3 + region.value * 12} fill={color} className="opacity-30" />
                    <circle cx={x} cy={y} r={1.5} fill="#fff" />
                    <g className="opacity-0 group-hover/hotspot:opacity-100 transition-all duration-300 pointer-events-none">
                      <rect x={x - 45} y={y - 40} width="90" height="26" rx="8" fill="#1e293b" stroke="#334155" />
                      <text x={x} y={y - 24} textAnchor="middle" fill="#f8fafc" className="text-[10px] font-black uppercase tracking-widest">{region.name}</text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Floating UI Indicator */}
          <div className="absolute left-8 top-8 z-20">
             <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-2xl">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
               <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">Transacciones en Tiempo Real</span>
             </div>
          </div>
        </div>

        {/* Professional Legend & Metadata */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
           <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                 <div className="w-3 h-3 rounded-full bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.6)]" />
                 <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Región con Ventas</span>
              </div>
              <div className="flex items-center gap-3">
                 <div className="w-3 h-3 rounded-full border-2 border-slate-300" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin Actividad Reportada</span>
              </div>
           </div>
           
           <div className="flex items-center gap-3 text-slate-400">
             <Maximize2 className="w-3 h-3" />
             <span className="text-[9px] font-black uppercase tracking-[0.2em] italic">Click + Arrastrar para Navegar • Zoom con Botones • Exportable a PDF</span>
           </div>
        </div>
      </div>
    </div>
  );
};
