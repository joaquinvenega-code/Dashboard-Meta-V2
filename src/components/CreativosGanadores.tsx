import React, { useState } from 'react';
import { Trophy, Star, MessageSquareCode, Save, Check, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface AdMock {
  id: string;
  name: string;
  performance: string;
  thumbnail: string;
}

const MOCK_ADS: AdMock[] = [
  { id: 'ad_1', name: 'Video Reel - Gancho Curiosidad', performance: 'ROAS 6.2x', thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&h=100&fit=crop' },
  { id: 'ad_2', name: 'Imagen Estática - Beneficios Core', performance: 'ROAS 4.8x', thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=100&h=100&fit=crop' },
  { id: 'ad_3', name: 'Carrusel - Testimonio Prueba Social', performance: 'ROAS 5.5x', thumbnail: 'https://images.unsplash.com/photo-1557838923-2985c318be48?w=100&h=100&fit=crop' },
];

interface CreativosGanadoresProps {
  onSaveObservation: (adId: string, observation: string) => Promise<void>;
}

export const CreativosGanadores: React.FC<CreativosGanadoresProps> = ({ onSaveObservation }) => {
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const handleSave = async (adId: string) => {
    if (!observations[adId]) return;
    setSaving(prev => ({ ...prev, [adId]: true }));
    try {
      await onSaveObservation(adId, observations[adId]);
      setSaved(prev => ({ ...prev, [adId]: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, [adId]: false })), 3000);
    } finally {
      setSaving(prev => ({ ...prev, [adId]: false }));
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-emerald-400" />
          Creativos Ganadores del Mes
        </h3>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-950 px-2 py-1 rounded">Basado en ROAS / CPA</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_ADS.map((ad) => (
          <div key={ad.id} className="bg-slate-950/50 border border-slate-800/50 rounded-lg p-3 group hover:border-blue-500/30 transition-all">
            <div className="flex gap-3 mb-3">
              <div className="relative w-16 h-16 shrink-0 rounded overflow-hidden border border-slate-800">
                <img src={ad.thumbnail} alt={ad.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                <div className="absolute top-0 right-0 p-1 bg-emerald-500">
                  <Star className="w-2 h-2 text-white fill-white" />
                </div>
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <h4 className="text-[11px] font-bold text-slate-200 truncate">{ad.name}</h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-black text-emerald-400">{ad.performance}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageSquareCode className="w-3 h-3 text-blue-400" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Nota Técnica del Consultor</span>
              </div>
              <textarea
                value={observations[ad.id] || ''}
                onChange={(e) => setObservations(prev => ({ ...prev, [ad.id]: e.target.value }))}
                placeholder="Ej: El ángulo emocional superó al racional por 20%..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-[10px] text-slate-300 focus:outline-none focus:border-blue-500 min-h-[60px] transition-colors resize-none"
              />
              <button
                onClick={() => handleSave(ad.id)}
                disabled={saving[ad.id] || !observations[ad.id]}
                className={cn(
                  "w-full py-1.5 rounded text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                  saved[ad.id] ? "bg-emerald-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300 pointer-events-auto cursor-pointer"
                )}
              >
                {saving[ad.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : saved[ad.id] ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                {saved[ad.id] ? "Guardado" : "Asentar Observación"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
