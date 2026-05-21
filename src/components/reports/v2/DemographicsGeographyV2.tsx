import React from 'react';
import { Users, Sparkles } from 'lucide-react';
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
  demoData?: {
    age: string;
    male: number;
    female: number;
  }[];
}

export const DemographicsGeographyV2: React.FC<DemographicsGeographyV2Props> = ({ 
  demoData = [
    { age: '18-24', male: 12, female: 15 },
    { age: '25-34', male: 25, female: 35 },
    { age: '35-44', male: 18, female: 22 },
    { age: '45-54', male: 8, female: 12 },
    { age: '55+', male: 4, female: 6 },
  ]
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-705">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-900" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">
              Distribución de Audiencia
            </span>
          </div>
          <h4 className="text-lg font-black uppercase text-slate-900 leading-tight">
            Perfil Demográfico (Edad y Género)
          </h4>
          <p className="text-xs text-slate-500 font-medium">
            Proporción de conversiones en Meta Ads según rangos de edad segmentados por género masculino y femenino.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 self-start sm:self-center">
          <div className="flex items-center gap-1.5 font-mono">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />
            <span className="text-[9px] font-black text-slate-650 uppercase tracking-wider">Hombres</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <div className="w-2.5 h-2.5 rounded-full bg-pink-400 shadow-sm" />
            <span className="text-[9px] font-black text-slate-650 uppercase tracking-wider">Mujeres</span>
          </div>
        </div>
      </div>
      
      <div className="h-[360px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={demoData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="age" 
              axisLine={false} 
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 750, fill: '#64748b' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 750, fill: '#cbd5e1' }}
              tickFormatter={(val) => `${val}%`}
            />
            <RechartsTooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ 
                borderRadius: '16px', 
                border: '1px solid #e2e8f0', 
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)',
                fontSize: '11px',
                fontWeight: 800,
                padding: '16px',
                backgroundColor: '#ffffff'
              }}
              formatter={(val: number) => [`${val}%`, '']}
            />
            <Bar dataKey="male" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} barSize={40} label={{ position: 'top', formatter: (val: any) => val ? `${val}%` : '', fontSize: 8, fontWeight: 800, fill: '#1e3a8a' }} />
            <Bar dataKey="female" fill="#f472b6" stackId="a" radius={[8, 8, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400 text-[10px] font-mono">
        <div className="flex items-center gap-1.5 font-sans font-medium">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>Datos analizados y actualizados según el período de campaña seleccionado.</span>
        </div>
        <span className="uppercase text-slate-350 tracking-widest font-bold">META AUDIENCE DATA INSIGHTS</span>
      </div>
    </div>
  );
};
