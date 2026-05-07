import React, { useState } from 'react';
import { OfflineSaleEntry } from '../types';
import { formatCurrency } from '../lib/utils';
import { Plus, Trash2, Calendar, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface OfflineSalesManagerProps {
  entries: OfflineSaleEntry[];
  currency: string;
  onAdd: (amount: number, note: string, date: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function OfflineSalesManager({ entries, currency, onAdd, onDelete, onClose }: OfflineSalesManagerProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const total = entries.reduce((acc, entry) => acc + entry.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    onAdd(Number(amount), note, date);
    setAmount('');
    setNote('');
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Bitácora de Ventas Offline</h3>
            <p className="text-[10px] font-bold text-neutral-600 mt-1 uppercase tracking-widest">Registra y sigue las ventas informadas manualmente</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-neutral-600 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 border-b border-white/5 bg-black/40">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-neutral-600 uppercase tracking-widest ml-1">Monto ({currency})</label>
                <div className="relative">
                  <input 
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-neutral-800"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-neutral-600 uppercase tracking-widest ml-1">Fecha</label>
                <div className="relative">
                  <input 
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-neutral-600 uppercase tracking-widest ml-1">Nota / Referencia</label>
              <div className="relative group">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-700 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: Informe cliente WhatsApp..."
                  className="w-full bg-black border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-neutral-800"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={!amount}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              Agregar Entrada
            </button>
          </form>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/20">
          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className="py-12 text-center text-neutral-700 space-y-2">
                <FileText className="w-8 h-8 mx-auto opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">No hay entradas registradas</p>
              </div>
            ) : (
              [...entries].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((entry) => (
                <div key={entry.id} className="bg-[#161616] border border-white/5 rounded-xl p-4 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/5 rounded-lg flex flex-col items-center justify-center text-[8px] font-black leading-none">
                      <span className="text-neutral-500 uppercase">{format(new Date(entry.date), 'MMM')}</span>
                      <span className="text-lg text-white mt-0.5">{format(new Date(entry.date), 'dd')}</span>
                    </div>
                    <div>
                      <div className="text-sm font-black text-white">{formatCurrency(entry.amount, currency)}</div>
                      <div className="text-[9px] font-bold text-neutral-600 uppercase tracking-wider">{entry.note || 'Sin nota'}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => onDelete(entry.id)}
                    className="p-2 hover:bg-red-500/10 text-neutral-800 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Sum */}
        <div className="p-6 border-t border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em]">Total Acumulado del Mes</span>
            <span className="text-xl font-black text-blue-500">{formatCurrency(total, currency)}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
