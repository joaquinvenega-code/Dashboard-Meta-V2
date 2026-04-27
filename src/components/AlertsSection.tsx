import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Mail, 
  MessageSquare, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  DollarSign, 
  Save, 
  X,
  CheckCircle2,
  Settings2,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertRule, AlertType, AlertMetric, AlertCondition, AdAccount } from '../types';

interface AlertsSectionProps {
  accounts: AdAccount[];
}

export const AlertsSection: React.FC<AlertsSectionProps> = ({ accounts }) => {
  const [rules, setRules] = useState<AlertRule[]>(() => {
    const saved = localStorage.getItem('cr_alert_rules');
    return saved ? JSON.parse(saved) : [];
  });

  const [isAdding, setIsAdding] = useState(false);
  const [newRule, setNewRule] = useState<Partial<AlertRule>>({
    type: 'performance',
    metric: 'roas',
    condition: 'less_than',
    value: 2,
    timeframe: 'today',
    channels: { inApp: true, email: false, whatsapp: false },
    isActive: true,
    accountId: 'all'
  });

  useEffect(() => {
    localStorage.setItem('cr_alert_rules', JSON.stringify(rules));
  }, [rules]);

  const addRule = () => {
    if (!newRule.name) return;
    const rule: AlertRule = {
      ...(newRule as AlertRule),
      id: Math.random().toString(36).substr(2, 9),
    };
    setRules([...rules, rule]);
    setIsAdding(false);
    setNewRule({
      type: 'performance',
      metric: 'roas',
      condition: 'less_than',
      value: 2,
      timeframe: 'today',
      channels: { inApp: true, email: false, whatsapp: false },
      isActive: true,
      accountId: 'all'
    });
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-widest text-white uppercase opacity-80 flex items-center gap-3">
            Gestión de Alertas
            <div className="px-1.5 py-0.5 bg-purple-600/10 border border-purple-600/20 rounded-full text-[8px] text-purple-500 uppercase tracking-widest font-bold">Configuración</div>
          </h2>
          <p className="text-neutral-500 text-[9px] font-bold uppercase tracking-widest mt-1 max-w-xl">
            Configura reglas inteligentes para recibir notificaciones cuando se detecten anomalías o se alcancen metas específicas.
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Nueva Regla
        </button>
      </div>

      {/* Adding Modal/Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-blue-500" />
                  Configurar Nueva Alerta
                </h3>
                <button onClick={() => setIsAdding(false)} className="text-neutral-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 block">Nombre de la Regla</label>
                    <input 
                      type="text" 
                      placeholder="Ej: ROAS bajo en todas las cuentas"
                      value={newRule.name || ''}
                      onChange={e => setNewRule({...newRule, name: e.target.value})}
                      className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-blue-500 outline-none transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 block">Aplicar a</label>
                    <select 
                      value={newRule.accountId}
                      onChange={e => setNewRule({...newRule, accountId: e.target.value})}
                      className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-blue-500 outline-none transition-all font-medium"
                    >
                      <option value="all">Todas las cuentas visibles</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 block">Tipo de Alerta</label>
                      <select 
                        value={newRule.type}
                        onChange={e => setNewRule({...newRule, type: e.target.value as AlertType})}
                        className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-blue-500 outline-none transition-all font-medium"
                      >
                        <option value="performance">Rendimiento</option>
                        <option value="budget">Presupuesto / Saldo</option>
                        <option value="anomaly">Anomalía</option>
                        <option value="health">Estado de Cuenta</option>
                      </select>
                    </div>
                    {newRule.type === 'performance' && (
                      <div>
                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 block">Métrica</label>
                        <select 
                          value={newRule.metric}
                          onChange={e => setNewRule({...newRule, metric: e.target.value as AlertMetric})}
                          className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-blue-500 outline-none transition-all font-medium"
                        >
                          <option value="roas">ROAS</option>
                          <option value="cpa">CPA</option>
                          <option value="spend">Gasto</option>
                          <option value="ctr">CTR</option>
                          <option value="cpc">CPC</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 block">Condición</label>
                      <select 
                        value={newRule.condition}
                        onChange={e => setNewRule({...newRule, condition: e.target.value as AlertCondition})}
                        className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-blue-500 outline-none transition-all font-medium"
                      >
                        <option value="less_than">Es Menor que</option>
                        <option value="greater_than">Es Mayor que</option>
                        <option value="change_percent">Cambió más de (%)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 block">Valor</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={newRule.value}
                        onChange={e => setNewRule({...newRule, value: parseFloat(e.target.value)})}
                        className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-blue-500 outline-none transition-all font-medium placeholder:text-neutral-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-3 block">Canales de Notificación</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button 
                        onClick={() => setNewRule({...newRule, channels: {...newRule.channels!, inApp: !newRule.channels?.inApp}})}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${newRule.channels?.inApp ? 'bg-blue-600/10 border-blue-500 text-blue-500' : 'bg-black border-white/5 text-neutral-500'}`}
                      >
                        <Bell className="w-4 h-4" />
                        <span className="text-[9px] font-black uppercase tracking-widest">In-App</span>
                      </button>
                      <button 
                        onClick={() => setNewRule({...newRule, channels: {...newRule.channels!, email: !newRule.channels?.email}})}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${newRule.channels?.email ? 'bg-blue-600/10 border-blue-500 text-blue-500' : 'bg-black border-white/5 text-neutral-500'}`}
                      >
                        <Mail className="w-4 h-4" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Email</span>
                      </button>
                      <button 
                        onClick={() => setNewRule({...newRule, channels: {...newRule.channels!, whatsapp: !newRule.channels?.whatsapp}})}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${newRule.channels?.whatsapp ? 'bg-blue-600/10 border-blue-500 text-blue-500' : 'bg-black border-white/5 text-neutral-500'}`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-[9px] font-black uppercase tracking-widest">WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={addRule}
                  disabled={!newRule.name}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <Save className="w-4 h-4" />
                  Guardar Regla
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules List */}
      <div className="grid grid-cols-1 gap-4">
        {rules.length === 0 ? (
          <div className="bg-[#111] border border-white/5 rounded-xl p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-neutral-600" />
            </div>
            <h3 className="text-white font-black text-sm uppercase tracking-widest mb-2">Sin reglas configuradas</h3>
            <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest max-w-xs leading-relaxed">
              Comienza configurando tu primera alerta para mantener tus cuentas bajo control.
            </p>
          </div>
        ) : (
          rules.map((rule) => {
            const account = accounts.find(a => a.id === rule.accountId);
            return (
              <motion.div 
                key={rule.id}
                layout
                className={`bg-[#111] border rounded-xl p-5 flex items-center justify-between group transition-colors ${rule.isActive ? 'border-white/5' : 'border-white/2 opacity-60 grayscale'}`}
              >
                <div className="flex items-center gap-5">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-lg ${
                    rule.type === 'performance' ? 'bg-blue-600/10 text-blue-500 shadow-blue-500/10' :
                    rule.type === 'budget' ? 'bg-amber-600/10 text-amber-500 shadow-amber-500/10' :
                    'bg-purple-600/10 text-purple-500 shadow-purple-500/10'
                  }`}>
                    {rule.type === 'performance' ? <TrendingUp className="w-5 h-5" /> : 
                     rule.type === 'budget' ? <DollarSign className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-black text-[12px] uppercase tracking-wider">{rule.name}</h4>
                      {!rule.isActive && (
                        <span className="text-[8px] font-black text-neutral-600 bg-black px-1.5 py-0.5 rounded uppercase">Inactiva</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <ChevronRight className="w-3 h-3 text-neutral-700" />
                        {rule.accountId === 'all' ? 'Todas las cuentas' : account?.name}
                      </p>
                      <div className="w-1 h-1 bg-neutral-800 rounded-full" />
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                        {rule.metric?.toUpperCase()} {rule.condition === 'less_than' ? '<' : rule.condition === 'greater_than' ? '>' : '∆%'} {rule.value}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    {rule.channels.inApp && <Bell className="w-3.5 h-3.5 text-blue-500 opacity-60" />}
                    {rule.channels.email && <Mail className="w-3.5 h-3.5 text-blue-500 opacity-60" />}
                    {rule.channels.whatsapp && <MessageSquare className="w-3.5 h-3.5 text-blue-500 opacity-60" />}
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleRule(rule.id)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${rule.isActive ? 'bg-blue-600' : 'bg-neutral-800'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${rule.isActive ? 'right-1' : 'left-1'}`} />
                    </button>
                    <button 
                      onClick={() => deleteRule(rule.id)}
                      className="text-neutral-600 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Suggested Alerts / Info */}
      <div className="bg-blue-600/5 border border-blue-500/10 rounded-xl p-6 mt-12">
        <h4 className="text-blue-500 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
          <Info className="w-4 h-4" />
          Sugerencias de Alertas Útiles
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h5 className="text-white font-bold text-[10px] uppercase tracking-widest">Pérdida de ROAS</h5>
            <p className="text-neutral-500 text-[10px] font-medium leading-relaxed">
              Detecta cuando el retorno cae por debajo de tu punto de equilibrio para pausar campañas a tiempo.
            </p>
          </div>
          <div className="space-y-2">
            <h5 className="text-white font-bold text-[10px] uppercase tracking-widest">Agotamiento de Saldo</h5>
            <p className="text-neutral-500 text-[10px] font-medium leading-relaxed">
              Recibe un aviso 24h antes de que el presupuesto estimado se agote según el ritmo de gasto actual.
            </p>
          </div>
          <div className="space-y-2">
            <h5 className="text-white font-bold text-[10px] uppercase tracking-widest">Spike en CPA</h5>
            <p className="text-neutral-500 text-[10px] font-medium leading-relaxed">
              Ideal para cuentas de captación de leads donde un aumento del 20% en CPA indica fatiga creativa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
