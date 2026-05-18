import React, { useState, useRef } from 'react';
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
    <div className="flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Demographics Column */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Edad y Género</span>
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
        </div>

        {/* Global Distribution Summary */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
               <Map className="w-4 h-4" />
             </div>
             <div>
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">Visualización Global</h4>
               <p className="text-sm font-black text-slate-900">Impacto Geográfico</p>
             </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col h-full">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-4 h-4 rounded-full bg-emerald-50 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumen de Ventas</span>
            </div>
            
            <div className="flex-1 space-y-6">
              {regions.map((region) => (
                <div key={region.name} className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-tighter text-slate-600">
                    <span>{region.name}</span>
                    <span className="text-blue-600 font-black">{(region.value * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                      style={{ width: `${region.value * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* High-Resolution Interactive Map Section */}
      <div className="space-y-3">
        <div 
          className="bg-slate-950 border border-slate-800 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden h-[600px] select-none group"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Zoom Overlay UI */}
          <div className="absolute top-8 right-8 z-20 flex flex-col gap-3">
            <button onClick={handleZoomIn} className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 backdrop-blur-xl text-white flex items-center justify-center transition-all border border-white/10 shadow-xl group/btn">
              <Plus className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
            </button>
            <button onClick={handleZoomOut} className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 backdrop-blur-xl text-white flex items-center justify-center transition-all border border-white/10 shadow-xl group/btn">
              <Minus className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
            </button>
            <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="w-12 h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)] border border-blue-400/30 group/btn">
              <Maximize2 className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
            </button>
          </div>

          {/* Interactive Layer */}
          <div 
            className="w-full h-full transition-transform duration-300 ease-out flex items-center justify-center relative touch-none"
            style={{ 
              transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
          >
            {/* Professional Grid Background */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '40px 40px' }} />

            {/* High-Fidelity World Map SVG */}
            <svg viewBox="0 0 1000 500" className="w-[110%] h-[110%] drop-shadow-[0_0_40px_rgba(30,41,59,0.5)]">
              {/* Detailed Stylized World Outlines */}
              <g fill="#161a22" stroke="#2a3341" strokeWidth="0.5">
                {/* North America */}
                <path d="M150,120 L180,100 L240,110 L280,140 L260,180 L220,200 L180,190 L160,150 Z" />
                {/* South America */}
                <path d="M280,250 L320,230 L350,250 L360,290 L340,350 L320,380 L300,350 L280,300 Z" />
                {/* Europe */}
                <path d="M480,120 L520,110 L550,120 L560,150 L530,170 L500,160 L480,140 Z" />
                {/* Africa */}
                <path d="M480,180 L530,170 L580,190 L600,240 L580,300 L540,330 L500,310 L480,250 Z" />
                {/* Asia */}
                <path d="M580,120 L680,100 L800,110 L850,150 L830,220 L780,250 L700,240 L620,200 Z" />
                {/* Oceania */}
                <path d="M780,280 L850,270 L880,300 L870,340 L820,350 L790,320 Z" />
              </g>
              
              {/* Visual Grid Accents */}
              <g opacity="0.1" stroke="#334155" strokeWidth="0.2">
                <line x1="0" y1="250" x2="1000" y2="250" />
                <line x1="500" y1="0" x2="500" y2="500" />
              </g>

              {/* Hotspot Markers with Heat Glow */}
              {regions.map((region, idx) => {
                const x = (region.coords[0] / 100) * 1000;
                const y = (region.coords[1] / 100) * 500;
                return (
                  <g key={region.name} className="group/hotspot">
                    {/* Outer Glow */}
                    <circle cx={x} cy={y} r={15 + region.value * 60} fill="#3b82f6" className="opacity-0 group-hover/hotspot:opacity-10 transition-opacity duration-500" />
                    {/* Primary Pulse */}
                    <circle cx={x} cy={y} r={8 + region.value * 35} fill="#3b82f6" className="opacity-10 animate-pulse" />
                    {/* Secondary Pulse */}
                    <circle cx={x} cy={y} r={4 + region.value * 15} fill="#3b82f6" className="opacity-25" />
                    {/* Core Point */}
                    <circle cx={x} cy={y} r={2} fill="#60a5fa" className="shadow-lg shadow-blue-500/50" />
                    
                    {/* Floating Tooltip Label */}
                    <g className="opacity-0 group-hover/hotspot:opacity-100 transition-opacity duration-300 pointer-events-none">
                       <rect x={x - 45} y={y - 45} width="90" height="28" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                       <text x={x} y={y - 27} textAnchor="middle" fill="#f8fafc" className="text-[10px] font-black uppercase tracking-widest">{region.name}</text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Elegant Sidebar Labels over Map */}
          <div className="absolute left-8 bottom-8 z-20 space-y-4">
             <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/5">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                   <span className="text-[9px] font-black text-white/70 uppercase tracking-[0.2em]">Alta Conversión</span>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-blue-500/30" />
                   <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Mercado Emergente</span>
                </div>
             </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between px-6">
           <p className="text-[9px] font-bold text-slate-400 italic">
             * Coordenadas ajustadas según el volumen de transacciones locales reportadas.
           </p>
           <div className="flex items-center gap-2 text-slate-400">
             <Maximize2 className="w-3 h-3" />
             <span className="text-[9px] font-black uppercase tracking-widest">Soporte Gesto Multitouch y Zoom Dinámico</span>
           </div>
        </div>
      </div>
    </div>
  );
};
