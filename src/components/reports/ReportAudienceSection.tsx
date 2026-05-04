import React from 'react';
import { Users } from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  XAxis, 
  Bar 
} from 'recharts';

interface ReportAudienceSectionProps {
  geographicData: any[];
  genderData: any[];
  ageData: any[];
  totalPurchases: number;
}

export function ReportAudienceSection({ geographicData, genderData, ageData, totalPurchases }: ReportAudienceSectionProps) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4 border-b-2 border-neutral-100 pb-6">
         <Users className="w-8 h-8 text-blue-600" />
         <h2 className="text-2xl font-black uppercase tracking-tighter text-neutral-900">Análisis Profundo de Audiencia</h2>
      </div>

      <div className="grid grid-cols-2 gap-8">
         {/* Geography & Heatmap List */}
         <div className="bg-neutral-50 rounded-xl p-8 border border-neutral-100 space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Rendimiento Geográfico</h3>
            <div className="space-y-3">
               {geographicData.slice(0, 6).map((reg) => (
                 <div key={reg.region} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                       <span className="text-neutral-900">{reg.region}</span>
                       <span className="text-blue-600">{(reg.purchases / (totalPurchases || 1) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-200 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-600" style={{ width: `${(reg.purchases / geographicData[0].purchases) * 100}%` }} />
                    </div>
                 </div>
               ))}
            </div>
         </div>

         {/* Demographic Pie & Bars */}
         <div className="bg-neutral-50 rounded-xl p-8 border border-neutral-100 flex flex-col gap-6">
            <div className="flex-1 flex flex-col items-center justify-center">
               <PieChart width={250} height={160}>
                  <Pie 
                    data={genderData} 
                    innerRadius={50} 
                    outerRadius={75} 
                    paddingAngle={8} 
                    dataKey="value"
                    stroke="none"
                  >
                     {genderData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
               </PieChart>
               <div className="flex gap-6 mt-4">
                  {genderData.map(g => (
                    <div key={g.name} className="flex items-center gap-2">
                       <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: g.color}} />
                       <span className="text-[8px] font-black uppercase text-neutral-400">{g.name}</span>
                    </div>
                  ))}
               </div>
            </div>
            <div className="flex-1">
               <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={ageData.slice(0, 5)}>
                     <XAxis dataKey="name" tick={{fontSize: 8, fontWeight: 'black', fill: '#999'}} axisLine={false} tickLine={false} />
                     <Bar dataKey="value" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>
    </div>
  );
}
