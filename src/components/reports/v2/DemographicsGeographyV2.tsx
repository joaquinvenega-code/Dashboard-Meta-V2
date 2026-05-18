import React from 'react';
import { Users, Globe2, AlertCircle, Key } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';

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
    coords: [number, number]; // [lat, lng]
  }[];
}

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export const DemographicsGeographyV2: React.FC<DemographicsGeographyV2Props> = ({ demoData, regions }) => {
  if (!hasValidKey) {
    return (
      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center animate-in fade-in duration-500">
        <div className="max-w-md mx-auto space-y-6">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-100/50">
            <Key className="w-8 h-8 text-blue-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Acceso a Mapas Profesionales Requerido</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Para visualizar el mapa dinámico de ventas, es necesario configurar una API Key de Google Maps Platform.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200 text-left space-y-4 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">1</div>
              <p className="text-xs text-slate-600 font-bold uppercase tracking-tight">Obtén tu clave en <a href="https://console.cloud.google.com/google/maps-apis/start" target="_blank" rel="noopener" className="text-blue-600 underline">Google Cloud Console</a></p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">2</div>
              <p className="text-xs text-slate-600 font-bold uppercase tracking-tight">Ve a <strong>Settings (⚙️)</strong> → <strong>Secrets</strong></p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">3</div>
              <p className="text-xs text-slate-600 font-bold uppercase tracking-tight">Agrega <code>GOOGLE_MAPS_PLATFORM_KEY</code> con tu clave</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 justify-center py-2 px-4 bg-amber-50 text-amber-700 rounded-full border border-amber-100 mx-auto w-fit">
            <AlertCircle className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase tracking-widest">La aplicación se reiniciará automáticamente al guardar</span>
          </div>
        </div>
      </div>
    );
  }

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
              <div className="flex items-start gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-400 mt-1" />
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

      {/* Professional Google Maps Integration */}
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl relative overflow-hidden h-[600px]">
          <APIProvider apiKey={API_KEY} version="weekly">
            <Map
              defaultCenter={{ lat: 10, lng: -20 }}
              defaultZoom={2}
              mapId="DASHBOARD_GEOGRAPHY_MAP"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
              gestureHandling={'greedy'}
              disableDefaultUI={true}
              styles={[
                {
                  "elementType": "geometry",
                  "stylers": [{ "color": "#0f172a" }]
                },
                {
                  "elementType": "labels.text.fill",
                  "stylers": [{ "color": "#475569" }]
                },
                {
                  "elementType": "labels.text.stroke",
                  "stylers": [{ "color": "#0f172a" }]
                },
                {
                  "featureType": "administrative.country",
                  "elementType": "geometry.stroke",
                  "stylers": [{ "color": "#334155" }]
                },
                {
                  "featureType": "water",
                  "elementType": "geometry",
                  "stylers": [{ "color": "#020617" }]
                }
              ]}
            >
              {regions.map((region) => (
                <AdvancedMarker 
                  key={region.name} 
                  position={{ lat: region.coords[0], lng: region.coords[1] }}
                >
                  <div className="relative group/marker flex items-center justify-center">
                    {/* Heat Glow Pulse */}
                    <div 
                      className="absolute rounded-full bg-blue-500/20 animate-pulse"
                      style={{ 
                        width: `${30 + region.value * 120}px`, 
                        height: `${30 + region.value * 120}px` 
                      }}
                    />
                    {/* Inner Core */}
                    <div className="relative w-4 h-4 bg-blue-500 rounded-full border-4 border-slate-950 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10" />
                    
                    {/* Label Overlay */}
                    <div className="absolute top-full mt-3 opacity-0 group-hover/marker:opacity-100 transition-all bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl z-20 pointer-events-none">
                      <p className="text-[10px] font-black text-white uppercase tracking-widest">{region.name}</p>
                      <p className="text-[9px] font-bold text-blue-400 mt-0.5">{(region.value * 100).toFixed(1)}% de las ventas</p>
                    </div>
                  </div>
                </AdvancedMarker>
              ))}
            </Map>
          </APIProvider>
          
          {/* Floating Indicators */}
          <div className="absolute left-8 bottom-8 z-10 flex flex-col gap-3">
            <div className="bg-slate-950/80 backdrop-blur-xl border border-slate-800 p-4 rounded-3xl space-y-3 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,1)]" />
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Nivel de Conversión: Alto</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full border border-slate-600" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Región en Crecimiento</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6">
           <p className="text-[9px] font-bold text-slate-400 italic">
             * Datos geo-localizados basados en la IP de transacción y dirección de facturación verificada.
           </p>
           <div className="flex items-center gap-3 text-slate-400">
             <Globe2 className="w-3 h-3" />
             <span className="text-[9px] font-black uppercase tracking-[0.2em] italic">Mapa Interactivo de Google Maps Platform • Alta Precisión</span>
           </div>
        </div>
      </div>
    </div>
  );
};
