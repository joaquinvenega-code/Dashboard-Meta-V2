import React, { useState } from 'react';
import { HelpCircle, ChevronDown, BookOpen } from 'lucide-react';
import { cn } from '../../../lib/utils';

export const ReportGlossaryV2: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const terms = [
    { name: 'ROAS', def: 'Return on Ad Spend. Indica cuántos pesos se facturan por cada peso invertido.' },
    { name: 'CPA', def: 'Costo por Adquisición. Cuánto cuesta en promedio conseguir una venta.' },
    { name: 'CTR', def: 'Click Through Rate. El porcentaje de personas que clican tras ver un anuncio.' },
    { name: 'Facturación', def: 'Ingresos directos atribuidos por el píxel de Meta Ads en el período.' },
    { name: 'MoM', def: 'Month-over-Month. Comparación porcentual con el mes inmediato anterior.' }
  ];

  return (
    <section className="border-t border-slate-100 pt-10 mt-10">
      <div className={cn(
        "bg-slate-50 border border-slate-200 rounded-xl overflow-hidden transition-all duration-300",
        isOpen ? "max-h-[1000px]" : "max-h-[50px] print:max-h-none"
      )}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-100 transition-colors cursor-pointer group print:hidden"
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-700">Glosario de Términos Metabólicos</span>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
        </button>

        {/* Header visible solo en impresión */}
        <div className="hidden print:flex items-center gap-3 px-6 py-4 border-b border-slate-200">
          <BookOpen className="w-4 h-4 text-slate-900" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Glosario de Términos</span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
          {terms.map((term) => (
            <div key={term.name} className="flex gap-4">
              <span className="text-[10px] font-black text-blue-600 w-12 shrink-0">{term.name}</span>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{term.def}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
