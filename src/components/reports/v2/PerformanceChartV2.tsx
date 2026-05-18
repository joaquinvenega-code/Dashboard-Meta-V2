import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';
import { formatCurrency } from '../../../lib/utils';
import { BarChart3, TrendingUp, ShoppingCart } from 'lucide-react';

interface PerformanceChartV2Props {
  data: {
    date: string;
    revenue: number;
    purchases: number;
  }[];
  currency: string;
}

export const PerformanceChartV2: React.FC<PerformanceChartV2Props> = ({ data, currency }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-full flex flex-col">
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-4 h-4 text-white" />
          <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Rendimiento & Proyección</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[8px] font-black text-white/70 uppercase tracking-widest">Facturación</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[8px] font-black text-white/70 uppercase tracking-widest">Compras</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
              dy={10}
            />
            <YAxis 
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fontWeight: 700, fill: '#3b82f6' }}
              tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fontWeight: 700, fill: '#10b981' }}
              dx={10}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #f1f5f9', 
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                fontSize: '10px',
                fontWeight: 700,
                padding: '12px'
              }}
              formatter={(value: any, name: string) => [
                name === 'revenue' ? formatCurrency(value, currency) : value, 
                name === 'revenue' ? 'Facturación' : 'Compras'
              ]}
              labelStyle={{ color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            />
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="revenue" 
              name="revenue"
              stroke="#3b82f6" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="purchases" 
              name="purchases"
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
          Eje Izq: Facturación (ARS) • Eje Der: Unidades Vendidas
        </p>
        <div className="flex items-center gap-1">
          <BarChart3 className="w-3 h-3 text-slate-300" />
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tendencia Mensual</span>
        </div>
      </div>
    </div>
  );
};
