import React from 'react';
import { Lightbulb, Rocket, ClipboardList } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface RoadmapSectionV2Props {
  learnings: string;
  actionPlan: string;
  clientRequests: string;
  onUpdate: (field: string, value: string) => void;
  isEditing: boolean;
}

const RoadmapCard = ({ 
  icon: Icon, 
  title, 
  value, 
  placeholder, 
  onChange, 
  isEditing,
  colorClass 
}: { 
  icon: any, 
  title: string, 
  value: string, 
  placeholder: string, 
  onChange: (val: string) => void, 
  isEditing: boolean,
  colorClass: string
}) => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
    <div className={cn("px-4 py-2 border-b border-slate-100 flex items-center gap-2", colorClass)}>
      <Icon className="w-4 h-4" />
      <h4 className="text-[10px] font-black uppercase tracking-widest">{title}</h4>
    </div>
    <div className="p-4">
      {isEditing ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-[100px] text-xs text-slate-700 bg-transparent focus:outline-none resize-none"
        />
      ) : (
        <div className="text-xs text-slate-600 leading-relaxed min-h-[100px] whitespace-pre-wrap italic">
          {value || "Sin definir para este período."}
        </div>
      )}
    </div>
  </div>
);

export const RoadmapSectionV2: React.FC<RoadmapSectionV2Props> = ({
  learnings,
  actionPlan,
  clientRequests,
  onUpdate,
  isEditing
}) => {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">05</div>
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Roadmap & Next Steps</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RoadmapCard
          icon={Lightbulb}
          title="Aprendizajes del Mes"
          value={learnings}
          placeholder="Ej: El público de 35-44 respondió mejor a..."
          onChange={(val) => onUpdate('learnings', val)}
          isEditing={isEditing}
          colorClass="bg-amber-50 text-amber-700"
        />
        <RoadmapCard
          icon={Rocket}
          title="Plan de Acción"
          value={actionPlan}
          placeholder="Ej: Escalar presupuesto en el Conjunto C..."
          onChange={(val) => onUpdate('actionPlan', val)}
          isEditing={isEditing}
          colorClass="bg-blue-50 text-blue-700"
        />
        <RoadmapCard
          icon={ClipboardList}
          title="Requerimientos Cliente"
          value={clientRequests}
          placeholder="Ej: Necesitamos fotos del nuevo stock..."
          onChange={(val) => onUpdate('clientRequests', val)}
          isEditing={isEditing}
          colorClass="bg-emerald-50 text-emerald-700"
        />
      </div>
    </section>
  );
};
