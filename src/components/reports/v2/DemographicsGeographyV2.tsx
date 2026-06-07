import React from 'react';
import { Users, Sparkles } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { formatCurrency } from '../../../lib/utils';
import { BarLabel } from './BarLabel';

interface DemographicsGeographyV2Props {
  demoData?: {
    age: string;
    male: number;
    female: number;
    rawValue?: number;
  }[];
  currency?: string;
}

export const DemographicsGeographyV2: React.FC<DemographicsGeographyV2Props> = ({ 
  demoData = [
    { age: '18-24', male: 12, female: 15, rawValue: 1200 },
    { age: '25-34', male: 25, female: 35, rawValue: 5000 },
    { age: '35-44', male: 18, female: 22, rawValue: 4000 },
    { age: '45-54', male: 8, female: 12, rawValue: 2000 },
    { age: '55-64', male: 4, female: 6, rawValue: 800 },
    { age: '65+', male: 2, female: 3, rawValue: 400 },
  ],
  currency = 'ARS'
}) => {

  const totalMale = demoData.reduce((acc, curr) => acc + (curr.male || 0), 0);
  const totalFemale = demoData.reduce((acc, curr) => acc + (curr.female || 0), 0);

  const pieData = [
    { name: 'Mujeres', value: totalFemale, color: '#f472b6' },
    { name: 'Hombres', value: totalMale, color: '#3b82f6' }
  ].filter(d => d.value > 0);

  const barData = demoData.map(d => ({
    age: d.age,
    rawValue: d.rawValue || 0
  }));

  const colors = pieData.map(p => p.color);

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
            Perfil Demográfico y Facturación
          </h4>
          <p className="text-xs text-slate-500 font-medium">
            Proporción de conversiones y facturación general por segmentación.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 print:grid-cols-2 gap-8 items-start">
        {/* Gráfico de Barras (Facturación por Edad) */}
        <div className="h-[360px] print:h-[280px] flex flex-col pt-6">
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
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
                  tickFormatter={(val) => {
                     if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                     if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                     return val;
                  }}
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
                  formatter={(val: number) => [formatCurrency(val, currency), 'Facturación']}
                />
                <Bar dataKey="rawValue" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} label={<BarLabel isCurrency currency={currency} />} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Torta (Género) */}
        <div className="h-[360px] print:h-[280px] bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col">
           <div className="mb-4 text-center">
             <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Género de Compradores</h5>
             <p className="text-[10px] text-slate-500 font-medium mt-1">Distribución estimada por género</p>
           </div>
           <div className="flex-1 w-full">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index, percent }) => {
                    if (percent < 0.03) return null;
                    
                    const RADIAN = Math.PI / 180;
                    const radius = outerRadius * 1.35;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    const textAnchor = x > cx ? 'start' : 'end';
                    
                    return (
                      <g>
                        <path 
                           d={`M${cx + outerRadius * Math.cos(-midAngle * RADIAN)},${cy + outerRadius * Math.sin(-midAngle * RADIAN)} L${x},${y}`} 
                           stroke={colors[index % colors.length]} 
                           strokeWidth={1}
                           fill="none"
                        />
                        <text 
                          x={x + (x > cx ? 6 : -6)} 
                          y={y} 
                          textAnchor={textAnchor} 
                          dominantBaseline="central"
                          fill="#334155"
                          fontSize={10}
                          fontWeight={800}
                        >
                          {`${(percent * 100).toFixed(1)}%`}
                        </text>
                      </g>
                    );
                  }}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Proporción']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                />
              </PieChart>
             </ResponsiveContainer>
           </div>
           
           {/* Leyenda del gráfico de torta */}
           <div className="mt-4 pt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
             {pieData.map((entry, index) => (
               <div key={`legend-${index}`} className="flex items-center gap-1.5">
                 <div className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: colors[index % colors.length] }} />
                 <span className="text-[10px] font-bold text-slate-600">{entry.name}</span>
               </div>
             ))}
           </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400 text-[10px] font-mono">
        <div className="flex items-center gap-1.5 font-sans font-medium">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>Datos analizados y actualizados según el período de campaña seleccionado.</span>
        </div>
      </div>
    </div>
  );
};

