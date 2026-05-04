import React from 'react';
import { History } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AccountNote } from '../../types';

interface ReportNotesSectionProps {
  notes: AccountNote[];
}

export function ReportNotesSection({ notes }: ReportNotesSectionProps) {
  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="flex items-center gap-4 border-b-2 border-neutral-100 pb-4">
        <History className="w-8 h-8 text-blue-600" />
        <h2 className="text-xl font-black uppercase tracking-tight text-neutral-900">Bitácora Estratégica</h2>
      </div>

      <div className="flex-1 space-y-6 overflow-hidden">
        <p className="text-neutral-500 font-medium text-[10px] leading-relaxed max-w-2xl italic">
          Cronología de acciones y observaciones estratégicas para los objetivos de rendimiento.
        </p>

        <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-px before:bg-neutral-100">
          {notes.slice(0, 6).map((note) => (
            <div key={note.id} className="relative group">
              <div className="absolute -left-[26px] top-0 w-5 h-5 rounded-full bg-white border border-blue-600 flex items-center justify-center z-10 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="text-[8px] font-black uppercase tracking-widest text-neutral-300">{format(new Date(note.timestamp), 'dd MMM', { locale: es })}</div>
                  <div className="px-1.5 py-0.5 rounded-full text-[6px] font-black uppercase tracking-widest bg-neutral-50 border border-neutral-100 text-neutral-500">{note.category}</div>
                </div>
                <div className="text-[11px] font-bold text-neutral-800 leading-tight bg-neutral-50/50 p-3 rounded-xl border border-neutral-50">
                  {note.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-neutral-50 text-center mt-auto">
        <div className="text-[8px] font-black uppercase tracking-[0.4em] text-neutral-200">Orion Metrics Analytics</div>
      </div>
    </div>
  );
}
