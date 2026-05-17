import React, { useState } from 'react';
import { PlusCircle, Loader2 } from 'lucide-react';
import { LogCategory } from '../backend/types/orion';

interface FormBitacoraProps {
  clientId: string;
  onLogAdded: () => void;
}

export const FormBitacora: React.FC<FormBitacoraProps> = ({ clientId, onLogAdded }) => {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<LogCategory>('optimizacion');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/bitacora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          category,
          description,
          date: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
        })
      });
      if (res.ok) {
        setDescription('');
        onLogAdded();
      }
    } catch (err) {
      console.error("Error al guardar en bitácora:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
        <PlusCircle className="w-4 h-4 text-blue-400" />
        Nueva Entrada en Bitácora
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Categoría</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value as LogCategory)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="estructura">Estructura</option>
            <option value="optimizacion">Optimización</option>
            <option value="escalado">Escalado</option>
            <option value="testing">Testing</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Descripción de Acción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Se rotaron creativos en el AdSet de Prospección..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 min-h-[80px] transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !description.trim()}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Asentar en Bitácora"}
        </button>
      </form>
    </div>
  );
};
