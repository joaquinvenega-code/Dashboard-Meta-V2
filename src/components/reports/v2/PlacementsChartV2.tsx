import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Share2, MousePointer2 } from 'lucide-react';

interface PlacementsChartV2Props {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
}

export const PlacementsChartV2: React.FC<PlacementsChartV2Props> = ({ data }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-full flex flex-col">
      <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Share2 className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Distribución</h3>
            <p className="text-xs font-bold text-slate-900">Ubicaciones de Compra</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 min-h-[300px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
              label={({ cx, cy, midAngle, innerRadius, outerRadius, value, name }) => {
                const RADIAN = Math.PI / 180;
                const radius = 25 + outerRadius;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                return (
                  <text 
                    x={x} 
                    y={y} 
                    fill="#64748b" 
                    textAnchor={x > cx ? 'start' : 'end'} 
                    dominantBaseline="central"
                    className="text-[10px] font-black"
                  >
                    {`${value}%`}
                  </text>
                );
              }}
              labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #f1f5f9', 
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                fontSize: '10px',
                fontWeight: 700
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={70}
              content={({ payload }) => (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 pb-6 px-4">
                  {payload?.map((entry: any, index: number) => (
                    <div key={`legend-${index}`} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight truncate">
                        {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-50 px-6 py-3 border-t border-slate-100">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">
          Basado en conversiones atribuidas en los últimos 30 días
        </p>
      </div>
    </div>
  );
};
