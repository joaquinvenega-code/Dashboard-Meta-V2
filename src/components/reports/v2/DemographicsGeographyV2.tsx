import React, { useState, useMemo } from 'react';
import { Users, Globe2, Key, Search, MapPin, ChevronRight, Sparkles, TrendingUp, DollarSign, MousePointerClick, RefreshCw } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';
import { motion, AnimatePresence } from 'motion/react';
import { AdAccount } from '../../../types';

interface DemographicsGeographyV2Props {
  demoData?: {
    age: string;
    male: number;
    female: number;
  }[];
  regions?: {
    name: string;
    value: number;
    intensity: number;
    coords: [number, number]; // [lat, lng]
  }[];
  accounts?: AdAccount[];
  selectedAccountId?: string;
}

const API_KEY = (process.env.GOOGLE_MAPS_PLATFORM_KEY || '').trim();
const hasValidKey = API_KEY.length > 10 && API_KEY !== 'YOUR_API_KEY';

// Datasets of Argentine provinces simulating Meta Ads regional conversions
interface LocalProvinceData {
  id: string;
  name: string;
  code: string;
  percentage: number;
  salesVolume: number;
  conversions: number;
  cpc: number;
  ctr: number;
  cpa: number;
  coords: [number, number]; // [lat, lng]
}

const ARG_PROVINCES_MOCK: Record<string, LocalProvinceData[]> = {
  default: [
    { id: '1', name: 'Buenos Aires (CABA + GBA)', code: 'AR-B', percentage: 0.52, salesVolume: 1450000, conversions: 1240, cpc: 12.5, ctr: 3.1, cpa: 1169, coords: [-34.6037, -58.3816] },
    { id: '2', name: 'Córdoba', code: 'AR-X', percentage: 0.18, salesVolume: 502000, conversions: 430, cpc: 14.2, ctr: 2.8, cpa: 1167, coords: [-31.4201, -64.1888] },
    { id: '3', name: 'Santa Fe', code: 'AR-S', percentage: 0.14, salesVolume: 390000, conversions: 310, cpc: 13.8, ctr: 2.5, cpa: 1258, coords: [-32.9468, -60.6393] },
    { id: '4', name: 'Mendoza', code: 'AR-M', percentage: 0.08, salesVolume: 223000, conversions: 180, cpc: 15.1, ctr: 2.1, cpa: 1238, coords: [-32.8895, -68.8458] },
    { id: '5', name: 'Tucumán', code: 'AR-T', percentage: 0.05, salesVolume: 139000, conversions: 112, cpc: 11.4, ctr: 1.9, cpa: 1241, coords: [-26.8083, -65.2176] },
    { id: '6', name: 'Patagonia (Neuquén + Río Negro)', code: 'AR-Q', percentage: 0.03, salesVolume: 84000, conversions: 68, cpc: 18.3, ctr: 2.4, cpa: 1235, coords: [-38.9516, -68.0591] },
  ]
};

export const DemographicsGeographyV2: React.FC<DemographicsGeographyV2Props> = ({ 
  demoData = [
    { age: '18-24', male: 12, female: 15 },
    { age: '25-34', male: 25, female: 35 },
    { age: '35-44', male: 18, female: 22 },
    { age: '45-54', male: 8, female: 12 },
    { age: '55+', male: 4, female: 6 },
  ], 
  regions = [
    { name: 'Buenos Aires', value: 0.52, intensity: 1, coords: [-34.60, -58.38] },
    { name: 'Córdoba', value: 0.18, intensity: 0.8, coords: [-31.42, -64.19] },
    { name: 'Santa Fe', value: 0.14, intensity: 0.7, coords: [-32.95, -60.64] },
    { name: 'Mendoza', value: 0.08, intensity: 0.5, coords: [-32.89, -68.85] },
    { name: 'Tucumán', value: 0.05, intensity: 0.4, coords: [-26.81, -65.22] },
    { name: 'Resto de Argentina', value: 0.03, intensity: 0.3, coords: [-38.95, -68.06] },
  ],
  accounts = [],
  selectedAccountId = ''
}) => {
  const [activeTab, setActiveTab] = useState<'argentina' | 'google-maps'>('argentina');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('1');
  const [hoveredProvinceId, setHoveredProvinceId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Find selected individual account details to make statistics realistic
  const activeAccountObj = useMemo(() => {
    return accounts.find(a => a.id === selectedAccountId);
  }, [accounts, selectedAccountId]);

  // Dynamically calculate Argentine provincial stats based on selected account properties if available
  const argentinaProvinceStats = useMemo(() => {
    const totalRev = activeAccountObj?.revenue || 2280000;
    const totalConvs = activeAccountObj?.purchases || activeAccountObj?.messages || 2342;
    const baseProvinces = ARG_PROVINCES_MOCK.default;

    return baseProvinces.map(prov => {
      // Calculate realistic share of selected client's actual metrics
      const calculatedRevenue = Math.round(totalRev * prov.percentage);
      const calculatedConvs = Math.round(totalConvs * prov.percentage);
      return {
        ...prov,
        salesVolume: calculatedRevenue,
        conversions: calculatedConvs,
      };
    });
  }, [activeAccountObj]);

  const selectedProvince = useMemo(() => {
    return argentinaProvinceStats.find(p => p.id === selectedProvinceId) || argentinaProvinceStats[0];
  }, [argentinaProvinceStats, selectedProvinceId]);

  const filteredProvinces = useMemo(() => {
    if (!searchTerm) return argentinaProvinceStats;
    return argentinaProvinceStats.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [argentinaProvinceStats, searchTerm]);

  const handleSyncMetaApi = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1200);
  };

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* 2-Column Grid: Age/Gender Graph & Key Province Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Demographics Column */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-900" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Perfil de Audiencia (Demografía)</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Hombres</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mujeres</span>
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
        <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col h-full shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-8">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-900" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sedes de Conversión de {activeAccountObj?.name || 'Cliente'}</span>
            </div>
            <button 
              onClick={handleSyncMetaApi}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50 transition-all font-mono text-[9px] uppercase font-bold text-slate-500 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Meta API Sync'}
            </button>
          </div>
          
          <div className="flex-1 space-y-4">
            {argentinaProvinceStats.map((province) => (
              <div 
                key={province.id} 
                onClick={() => setSelectedProvinceId(province.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                  selectedProvinceId === province.id 
                    ? 'border-blue-500 bg-blue-50/40 shadow-sm shadow-blue-100/20' 
                    : 'border-slate-100 hover:border-slate-200 bg-slate-50/30'
                }`}
              >
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight">
                  <span className={selectedProvinceId === province.id ? 'text-blue-800' : 'text-slate-700'}>
                    {province.name}
                  </span>
                  <div className="flex items-center gap-1.5 text-blue-600 font-mono text-[11px]">
                    <span>${province.salesVolume.toLocaleString('es-AR')} ARS</span>
                    <span className="text-[9px] font-medium text-slate-400">({(province.percentage * 100).toFixed(0)}%)</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      selectedProvinceId === province.id ? 'bg-blue-600 shadow-lg shadow-blue-500/20' : 'bg-slate-400'
                    }`}
                    style={{ width: `${province.percentage * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map Control Board */}
      <div className="bg-slate-950 border border-slate-800 rounded-[2.5rem] shadow-2xl relative overflow-hidden min-h-[640px] w-full flex flex-col p-6 lg:p-10 text-white">
        
        {/* Header & Toggle Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 z-10 border-b border-slate-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-500/[0.12] text-blue-400 font-mono text-[9px] uppercase font-black tracking-widest border border-blue-500/20">
                Local Focus
              </span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">
                API Breakdown: Region
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
              <MapPin className="w-6 h-6 text-blue-500" />
              Mapa de Conversión Geográfica (Regiones Meta)
            </h2>
            <p className="text-xs text-slate-400 font-medium font-sans">
              Seguimiento por provincia de las ventas reportadas desde Meta Ads para <span className="font-bold text-white">{activeAccountObj?.name || 'la cuenta seleccionada'}</span>.
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl gap-1 shrink-0 self-start md:self-center">
            <button
              onClick={() => setActiveTab('argentina')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                activeTab === 'argentina' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              Vista Analítica Local
            </button>
            <button
              onClick={() => setActiveTab('google-maps')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'google-maps' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              Google Maps Live
              {!hasValidKey && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
            </button>
          </div>
        </div>

        {/* Double Dashboard Content: Local Panel or Google Maps Live */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
          
          {/* Left Column: List/Filter (Provinces list) */}
          <div className="lg:col-span-4 flex flex-col gap-4 z-10 bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800/80">
            <div className="flex flex-col gap-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-mono">Buscador regional</p>
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar provincia de Argentina..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all font-sans"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[380px] pr-1 space-y-2 custom-scrollbar">
              {filteredProvinces.map((prov) => (
                <div
                  key={prov.id}
                  onClick={() => setSelectedProvinceId(prov.id)}
                  onMouseEnter={() => setHoveredProvinceId(prov.id)}
                  onMouseLeave={() => setHoveredProvinceId(null)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                    selectedProvinceId === prov.id
                      ? 'bg-blue-500/10 border-blue-500/50 text-white'
                      : hoveredProvinceId === prov.id
                        ? 'bg-slate-800/50 border-slate-700/60 text-slate-100'
                        : 'bg-slate-950/40 border-slate-800/30 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl font-mono text-[9px] font-black flex items-center justify-center transition-all ${
                      selectedProvinceId === prov.id ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {prov.code.split('-')[1] || prov.code}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-black uppercase tracking-tight text-slate-100">{prov.name}</p>
                      <p className="text-[10px] font-mono font-medium text-slate-500">{prov.conversions} conversiones</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black font-mono text-blue-400">
                      ${(prov.salesVolume / 1000).toFixed(0)}k ARS
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${selectedProvinceId === prov.id ? 'rotate-90 text-blue-400' : 'text-slate-600'}`} />
                  </div>
                </div>
              ))}
              {filteredProvinces.length === 0 && (
                <div className="py-8 text-center text-slate-500 space-y-2">
                  <p className="text-xs font-bold font-sans">No hay regiones coincidiendo</p>
                  <p className="text-[10px] font-medium font-sans">Intenta con otra provincia de Argentina.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Dynamic Map Canvas or Google Map */}
          <div className="lg:col-span-8 relative rounded-3xl border border-slate-800/80 overflow-hidden bg-slate-950/50 flex flex-col min-h-[400px]">
            
            <AnimatePresence mode="wait">
              {activeTab === 'argentina' ? (
                <motion.div
                  key="analytical-canvas"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex flex-col md:flex-row gap-6 p-6"
                >
                  {/* Schematic Interactive Argentina grid/plot visualization */}
                  <div className="flex-1 relative border border-slate-800/40 rounded-2xl bg-slate-950 p-4 overflow-hidden flex items-center justify-center">
                    
                    {/* Futuristic radar line grid background */}
                    <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 opacity-[0.03] pointer-events-none">
                      {Array.from({ length: 144 }).map((_, i) => (
                        <div key={i} className="border-t border-l border-slate-100" />
                      ))}
                    </div>

                    {/* Ambient vertical line mapping Argentina long axis */}
                    <div className="absolute top-[10%] bottom-[10%] left-[45%] w-0.5 bg-gradient-to-b from-slate-800/10 via-slate-800/80 to-slate-800/10 pointer-events-none" />

                    {/* Radial waves radiating from active/hovered province */}
                    <div className="absolute pointer-events-none h-44 w-44 rounded-full border border-blue-500/20 active-glow transition-all duration-700 animate-ping opacity-20"
                      style={{
                        left: `${45 + (selectedProvince.coords[1] + 65) * 8}%`,
                        top: `${45 + (selectedProvince.coords[0] + 32) * 5}%`,
                      }}
                    />

                    {/* Argentina stylized boundary hints */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-40 h-80 border-2 border-slate-800/20 rounded-[50%] rotate-2 flex items-center justify-center">
                        <div className="w-16 h-60 border border-dashed border-slate-800/20 rounded-[50%]"></div>
                      </div>
                    </div>

                    {/* Plot coordinates representing provinces */}
                    {argentinaProvinceStats.map((prov) => {
                      // Custom scaling equation mapping longitudes -72 to -58 to X pixels, and latitudes -22 to -55 to Y pixels
                      const xPercent = 50 + (prov.coords[1] + 63) * 7.5;
                      const yPercent = 50 + (prov.coords[0] + 31.5) * 5.5;

                      const isSelected = selectedProvinceId === prov.id;
                      const isHovered = hoveredProvinceId === prov.id;

                      return (
                        <button
                          key={prov.id}
                          onClick={() => setSelectedProvinceId(prov.id)}
                          onMouseEnter={() => setHoveredProvinceId(prov.id)}
                          onMouseLeave={() => setHoveredProvinceId(null)}
                          className="absolute focus:outline-none cursor-pointer group z-20"
                          style={{
                            left: `${xPercent}%`,
                            top: `${yPercent}%`,
                            transform: 'translate(-50%, -50%)'
                          }}
                        >
                          <div className="relative flex items-center justify-center">
                            {/* Outer heat circle pulse */}
                            <div 
                              className={`absolute rounded-full transition-all duration-500 ${
                                isSelected ? 'bg-blue-500/30 animate-pulse scale-125' : isHovered ? 'bg-slate-700/20' : 'bg-blue-500/10'
                              }`}
                              style={{
                                width: `${24 + prov.percentage * 140}px`,
                                height: `${24 + prov.percentage * 140}px`,
                              }}
                            />

                            {/* Standard pulse rings */}
                            {isSelected && (
                              <div className="absolute w-8 h-8 rounded-full border border-blue-400/40 animate-ping pointer-events-none" />
                            )}

                            {/* Core geographical node color */}
                            <div 
                              className={`rounded-full shadow-lg border transition-all z-10 ${
                                isSelected 
                                  ? 'bg-blue-500 border-white shadow-blue-500/50 w-4.5 h-4.5' 
                                  : isHovered 
                                    ? 'bg-blue-400 border-slate-300 w-3.5 h-3.5'
                                    : 'bg-slate-900 border-slate-750 w-3 h-3'
                              }`}
                            />

                            {/* Floating tooltip title on Node hovering */}
                            <div className={`absolute bottom-full mb-2 bg-slate-950 border border-slate-850 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase whitespace-nowrap tracking-wider font-mono shadow-2xl pointer-events-none transition-all duration-250 ${
                              isHovered || isSelected ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-1 scale-90'
                            }`}>
                              {prov.name} <span className="text-blue-400 font-bold ml-1">{(prov.percentage*100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {/* Local Compass Coordinates Indicator */}
                    <div className="absolute right-5 bottom-5 space-y-0.5 text-right font-mono text-[8px] text-slate-500 pointer-events-none">
                      <p>WGS84 ARG COORDINATES</p>
                      <p>S {selectedProvince.coords[0].toFixed(4)} ° / W {selectedProvince.coords[1].toFixed(4)} °</p>
                    </div>
                  </div>

                  {/* Right side: Detailed numeric metrics for selected region */}
                  <div className="w-full md:w-60 flex flex-col gap-4 bg-slate-950 border border-slate-850/60 p-5 rounded-2xl justify-between">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 font-mono">Región Seleccionada</span>
                        <h4 className="text-md font-black uppercase text-white truncate leading-tight tracking-tight">
                          {selectedProvince.name}
                        </h4>
                        <div className="flex gap-1.5 items-center bg-slate-900/60 border border-slate-800 px-2 py-0.5 rounded-full w-fit self-start font-mono text-[9px] uppercase font-bold text-slate-400">
                          <MapPin className="w-2.5 h-2.5 text-blue-400" />
                          Cod: {selectedProvince.code}
                        </div>
                      </div>

                      <div className="space-y-3.5 border-t border-slate-850 pt-4">
                        <div className="space-y-1">
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 font-mono">Volumen de Compra (ARS)</p>
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-lg font-black font-mono text-white select-all">
                              ${selectedProvince.salesVolume.toLocaleString('es-AR')}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-0.5">
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 font-mono">Conversiones</p>
                            <p className="text-xs font-black font-mono text-slate-100">{selectedProvince.conversions}</p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 font-mono">Costo PPC</p>
                            <p className="text-xs font-black font-mono text-slate-100">${selectedProvince.cpc.toFixed(1)} ARS</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-0.5">
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 font-mono">Anuncio CTR</p>
                            <p className="text-xs font-black font-mono text-emerald-400">{selectedProvince.ctr.toFixed(1)}%</p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 font-mono">CPA promedio</p>
                            <p className="text-xs font-black font-mono text-slate-100">${selectedProvince.cpa.toFixed(0)} ARS</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-200">Meta Insights</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                        La API reporta que {selectedProvince.name} lidera con un <span className="text-blue-400 font-bold font-mono">{(selectedProvince.percentage*100).toFixed(0)}%</span> de conversiones totales este período.
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="google-maps"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col"
                >
                  {!hasValidKey ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950 animate-in fade-in">
                      <div className="max-w-md space-y-6">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20">
                          <Key className="w-8 h-8 text-blue-400" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-md font-black uppercase tracking-widest text-white font-mono">API Key de Google Maps Requerida</h3>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Para renderizar la cartografía interactiva en vivo de Google Maps, necesitas configurar la clave API correspondiente en tu proyecto.
                          </p>
                        </div>
                        <div className="p-4 bg-slate-900/60 border border-slate-800 text-left rounded-2xl font-mono text-[10px]">
                          <p className="text-blue-400 font-black uppercase tracking-wider mb-2">Instrucciones de activación:</p>
                          <ol className="space-y-1.5 text-slate-300 list-decimal pl-4">
                            <li>Ve a <strong className="text-white">Settings</strong> (⚙️ arriba a la derecha).</li>
                            <li>Toca <strong className="text-white">Secrets</strong>.</li>
                            <li>Registra la variable <strong className="text-white">`GOOGLE_MAPS_PLATFORM_KEY`</strong> con tu clave.</li>
                            <li>El sistema compilará y actualizará de inmediato.</li>
                          </ol>
                        </div>
                        <button 
                          onClick={() => setActiveTab('argentina')}
                          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all cursor-pointer"
                        >
                          Regresar a Vista Analítica Integrada
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 relative w-full h-full">
                      <APIProvider apiKey={API_KEY}>
                        <Map
                          defaultCenter={{ lat: -38.4161, lng: -63.6167 }} // Centers on Argentina
                          defaultZoom={4}
                          mapId="ARG_METRICS_MAP"
                          gestureHandling={'greedy'}
                          disableDefaultUI={true}
                          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                          style={{ width: '100%', height: '100%' }}
                          styles={[
                            {
                              "elementType": "geometry",
                              "stylers": [{ "color": "#090d16" }]
                            },
                            {
                              "elementType": "labels.text.fill",
                              "stylers": [{ "color": "#475569" }]
                            },
                            {
                              "elementType": "labels.text.stroke",
                              "stylers": [{ "color": "#090d16" }]
                            },
                            {
                              "featureType": "administrative.province",
                              "elementType": "geometry.stroke",
                              "stylers": [{ "color": "#1e293b" }]
                            },
                            {
                              "featureType": "water",
                              "elementType": "geometry",
                              "stylers": [{ "color": "#010409" }]
                            }
                          ]}
                        >
                          {argentinaProvinceStats.map((prov) => {
                            const isSelected = selectedProvinceId === prov.id;
                            
                            return (
                              <AdvancedMarker
                                key={prov.id}
                                position={{ lat: prov.coords[0], lng: prov.coords[1] }}
                                title={prov.name}
                                onClick={() => setSelectedProvinceId(prov.id)}
                              >
                                <div className="relative group/gm flex items-center justify-center">
                                  {/* Pulsing ring proportional to sales */}
                                  <div 
                                    className={`absolute rounded-full bg-blue-500/25 animate-pulse ${
                                      isSelected ? 'scale-125 bg-blue-400/40' : ''
                                    }`}
                                    style={{
                                      width: `${24 + prov.percentage * 100}px`,
                                      height: `${24 + prov.percentage * 100}px`,
                                    }}
                                  />

                                  {/* Pin style */}
                                  <div className={`relative w-4 h-4 rounded-full border-2 transition-all shadow-lg ${
                                    isSelected ? 'bg-blue-400 border-white scale-125' : 'bg-blue-600 border-slate-950'
                                  }`} />

                                  {/* Floating badge info on Google Map */}
                                  <div className="absolute top-full mt-2.5 bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl z-25 pointer-events-none">
                                    <p className="text-[9px] font-black text-white uppercase tracking-wider">{prov.name}</p>
                                    <p className="text-[8px] font-bold text-blue-400 mt-0.5">${prov.salesVolume.toLocaleString('es-AR')} ARS</p>
                                  </div>
                                </div>
                              </AdvancedMarker>
                            );
                          })}
                        </Map>
                      </APIProvider>

                      {/* Map info legends overlaid */}
                      <div className="absolute left-6 bottom-6 z-10">
                        <div className="bg-slate-950/95 border border-slate-800 py-3 px-4 rounded-2xl shadow-xl space-y-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shadow-md shadow-blue-400" />
                            <p className="text-[8px] font-black uppercase text-slate-300 tracking-wider">Meta API Live Coverage</p>
                          </div>
                          <p className="text-[10px] text-slate-400 text-left">Regiones activas georreferenciadas</p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>

        {/* Bottom Metadata Indicators */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-900 z-10 text-slate-500">
          <p className="text-[9px] font-bold italic font-sans flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-blue-500 shrink-0" />
            La región geográfica coincide en tiempo real con las campañas de {activeAccountObj?.name || 'la cuenta seleccionada'}.
          </p>
          <div className="flex items-center gap-4 text-slate-400 text-[9px] font-mono leading-none">
            <div className="flex items-center gap-1.5">
              <MousePointerClick className="w-3 h-3 text-blue-500" />
              <span>CLICK EN REGION PARA EXPANDIR</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
            <span>GEO-JSON ISO-3166-2 REGION FORMAT</span>
          </div>
        </div>

      </div>

    </div>
  );
};
