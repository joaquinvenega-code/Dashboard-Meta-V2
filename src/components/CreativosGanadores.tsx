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
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      {MOCK_ADS.slice(0, 2).map((ad) => (
        <div key={ad.id} className="bg-slate-950 rounded-xl p-4 border border-slate-800/50">
          <div className="flex gap-4 items-center mb-4">
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-800 shrink-0">
              <img src={ad.thumbnail} alt="" className="w-full h-full object-cover grayscale opacity-50" referrerPolicy="no-referrer" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{ad.name}</h4>
              <span className="text-[11px] font-bold text-emerald-400">{ad.performance}</span>
            </div>
          </div>
          <textarea
            value={observations[ad.id] || ''}
            onChange={(e) => setObservations(prev => ({ ...prev, [ad.id]: e.target.value }))}
            placeholder="Insight estratégico (Ej: por qué funcionó)..."
            className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50 min-h-[60px] resize-none mb-2"
          />
          <button
            onClick={() => handleSave(ad.id)}
            disabled={saving[ad.id] || !observations[ad.id]}
            className={cn(
              "w-full py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] flex items-center justify-center gap-2 transition-all",
              saved[ad.id] ? "bg-emerald-600/20 text-emerald-400" : "bg-slate-800 hover:bg-slate-700 text-slate-400"
            )}
          >
            {saving[ad.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : saved[ad.id] ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
            {saved[ad.id] ? "Análisis Guardado" : "Guardar Insight"}
          </button>
        </div>
      ))}
    </div>
  );
};
