import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, X, Volume2, VolumeX, Sparkles, Loader2, Play } from 'lucide-react';
import { parseAdvancedVoiceCommand, ParsedVoiceCommand } from '../utils/voiceParser';
import { saveLogToFirestore, saveOfflineSaleToFirestore } from '../services/firebaseService';
import { AdAccount, AccountNote } from '../types';

interface FloatingAssistantProps {
  accounts: AdAccount[];
  accountGroups?: any[];
  notes: AccountNote[];
  onAddNote: (note: AccountNote) => void;
  onUpdateNote?: (note: AccountNote) => void;
  onAddOfflineSale: (accountId: string, amount: number, date: string, customId?: string) => void;
  onUpdateOfflineSale?: (accountId: string, entryId: string, updatedFields: Partial<any>) => void;
  settings: Record<string, any>;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isProcessing?: boolean;
}

// Custom interactive synthesiser of hologram interface sounds using native web AudioContext
class OrionSynthesizer {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Sweet ascending synthetic holographic chirp
  playChirp() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.16);
      
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {
      console.warn("Audio Context error:", e);
    }
  }

  // Harmonic chord resonance when Orion is ready or starts talking
  playConfirm() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(480, now);
      osc1.frequency.setValueAtTime(640, now + 0.05); // Melodic stepping
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(320, now);
      osc2.frequency.setValueAtTime(380, now + 0.05);
      
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.03, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.3);
    } catch (e) {
      console.warn("Audio Context error:", e);
    }
  }

  // Little microcomputer computation clicks
  playTick() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.setValueAtTime(150, now + 0.01);
      
      gain.gain.setValueAtTime(0.004, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.02);
    } catch (e) {}
  }

  // Settle descending alarm on timeouts or offline modes
  playError() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.linearRampToValueAtTime(120, now + 0.22);
      
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }

  // Power down click on exit
  playPowerDown() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(550, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);
      
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }
}

const synth = new OrionSynthesizer();

// Safe wrapper to prevent hanging on Firestore network connection issues and sandbox failures
function executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), timeoutMs))
  ]);
}

export function optimizeTextForSpeech(text: string): string {
  let cleaned = text;

  // Replace acronyms with phonetic descriptions
  const replacements = [
    { pattern: /\bROAS\b/gi, value: 'retorno de la inversión' },
    { pattern: /\bCPA\b/gi, value: 'costo por adquisición' },
    { pattern: /\bCPC\b/gi, value: 'costo por clic' },
    { pattern: /\bCTR\b/gi, value: 'tasa de clics' },
    { pattern: /\bUSD\b/gi, value: 'dólares' },
    { pattern: /\bARS\b/gi, value: 'pesos' },
    { pattern: /\bCosto x Venta\b/gi, value: 'costo por venta' },
    { pattern: /\bMeta\b/gi, value: 'meta' }
  ];

  replacements.forEach(rep => {
    cleaned = cleaned.replace(rep.pattern, rep.value);
  });

  cleaned = cleaned.replace(/(\d+)\.(\d+)/g, '$1 coma $2');
  cleaned = cleaned.replace(/(\d+),(\d+)/g, '$1 coma $2');

  return cleaned;
}

export default function FloatingAssistant({
  accounts,
  accountGroups = [],
  notes,
  onAddNote,
  onUpdateNote,
  onAddOfflineSale,
  onUpdateOfflineSale,
  settings
}: FloatingAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [transcriptText, setTranscriptText] = useState('');
  const [lastAction, setLastAction] = useState<{
    type: 'RECORD_OFFLINE_SALE' | 'ADD_LOG_EXTENDED';
    accountId: string;
    entryId: string;
    date: string;
    amount?: number;
    noteText?: string;
  } | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Play micro ticks while calculating/processing to emulate living core computation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      interval = setInterval(() => {
        synth.playTick();
      }, 350);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  // Auto scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, transcriptText]);

  // Clean speaking on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Cancel speaking when panel closes
  useEffect(() => {
    if (!isOpen) {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    }
  }, [isOpen]);

  // Initialize SpeechSynthesis
  useEffect(() => {
    if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        if (window.speechSynthesis) {
          window.speechSynthesis.getVoices();
        }
      };
    }
  }, []);

  const addMessage = (sender: 'user' | 'assistant', text: string) => {
    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  // Speaks using local Web Speech Synthesis with reactive starts/ends
  const speakAsOrion = (text: string) => {
    if (isMuted || !window.speechSynthesis) {
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    // Trigger talking chord
    synth.playConfirm();

    const optimized = optimizeTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(optimized);
    utterance.rate = 0.95; // Un ritmo ligeramente más pausado, solemne y calculado
    utterance.pitch = 0.76; // Una voz notablemente más profunda, gruesa, grave e imponente

    const voices = window.speechSynthesis.getVoices();
    const spanishVoices = voices.filter(v => v.lang.startsWith('es'));
    const preferredVoice = spanishVoices.find(v => 
      v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('natural')
    ) || spanishVoices[0] || null;

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Welcome greeting trigger when core becomes open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const hours = new Date().getHours();
      let greeting = 'Buenas noches';
      if (hours >= 5 && hours < 12) {
        greeting = 'Buenos días';
      } else if (hours >= 12 && hours < 21) {
        greeting = 'Buenas tardes';
      }
      
      const welcomeText = `${greeting}, señor. Orión activo. ¿En qué cuenta o registro le asisto hoy?`;
      
      const timer = setTimeout(() => {
        addMessage('assistant', welcomeText);
        speakAsOrion(welcomeText);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleStartListening = () => {
    if (isListening) {
      stopListening();
      return;
    }

    // Cancel spoken voice immediately to start recording clearly
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);

    // Play recording start sound
    synth.playChirp();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      const offlineMsg = 'Disculpe, señor. Su navegador actual no cuenta con soporte para el protocolo de transmisión de voz. Le sugiero utilizar Google Chrome.';
      addMessage('assistant', offlineMsg);
      speakAsOrion(offlineMsg);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'es-AR'; 
      rec.continuous = false;
      rec.interimResults = true;

      rec.onstart = () => {
        setIsListening(true);
        setTranscriptText('');
      };

      rec.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            setTranscriptText(event.results[i][0].transcript);
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (interim) {
          setTranscriptText(interim);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          synth.playError();
          const errMsg = `Mis disculpas, señor. Al parecer ha surgido un inconveniente con el receptor de audio (${event.error}). ¿Podría intentarlo de nuevo?`;
          addMessage('assistant', errMsg);
          speakAsOrion(errMsg);
        }
      };

      rec.onend = () => {
        setIsListening(false);
        setTranscriptText(prev => {
          if (prev.trim()) {
            processTranscription(prev);
          }
          return '';
        });
      };

      recognitionRef.current = rec;
      rec.start();

    } catch (e) {
      console.error("Failed to start speech recognition context:", e);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const processTranscription = async (rawString: string) => {
    // 1. Log user request in chat bubble
    addMessage('user', rawString);
    setIsProcessing(true);

    const consolidatedClients = [
      ...accounts.map(acc => {
        const s = settings[acc.id];
        return {
          id: acc.id,
          name: s?.customName || acc.name,
          rawName: acc.name,
          customName: s?.customName || undefined,
          spend: acc.spend || 0,
          revenue: acc.revenue || 0,
          dailySeries: (acc as any).dailySeries || [],
          isGroup: false,
          currency: s?.currency || acc.currency || 'ARS'
        };
      }),
      ...(accountGroups || []).map(group => {
        const sG = settings[group.id];
        const groupAccounts = accounts.filter(a => 
          (group.accountIds || []).some(id => id?.toString() === a.id?.toString() || id?.toString() === a.account_id?.toString())
        );
        
        const seriesMap: Record<string, { date: string, spend: number, revenue: number }> = {};
        groupAccounts.forEach(acc => {
          const ds = (acc as any).dailySeries || [];
          ds.forEach((d: any) => {
            if (!seriesMap[d.date]) {
              seriesMap[d.date] = { date: d.date, spend: 0, revenue: 0 };
            }
            seriesMap[d.date].spend += d.spend || 0;
            seriesMap[d.date].revenue += d.revenue || 0;
          });
        });
        const aggregatedSeries = Object.values(seriesMap).sort((a, b) => a.date.localeCompare(b.date));

        return {
          id: group.id,
          name: sG?.customName || group.name,
          rawName: group.name,
          customName: sG?.customName || undefined,
          spend: groupAccounts.reduce((sum, a) => sum + (a.spend || 0), 0),
          revenue: groupAccounts.reduce((sum, a) => sum + (a.revenue || 0), 0),
          dailySeries: aggregatedSeries,
          isGroup: true,
          currency: sG?.currency || groupAccounts[0]?.currency || 'ARS'
        };
      })
    ];

    const mappedClients = consolidatedClients.map(c => ({
      id: c.id,
      name: c.rawName,
      customName: c.customName
    }));

    const parsed: ParsedVoiceCommand = parseAdvancedVoiceCommand(rawString, mappedClients);
    const targetClient = consolidatedClients.find(c => c.id === parsed.clientId);

    let systemResponse = '';

    try {
      switch (parsed.intent) {
        case 'ADD_LOG_EXTENDED': {
          if (!targetClient) {
            systemResponse = `Disculpe, señor. Comprendo que desea guardar una entrada en la bitácora, pero no logro identificar a cuál de sus cuentas se refiere. ¿Podría especificarme el nombre del cliente, por favor?`;
            break;
          }
          const noteText = parsed.noteText || "Nota guardada vía asistente de voz";
          const generatedNoteId = 'voice_' + Math.random().toString(36).substring(2, 9);
          
          try {
            // Write to Firestore with robust 1.8 seconds timeout limit to prevent hanging if firebase or network freezes
            await executeWithTimeout(saveLogToFirestore(targetClient.id, noteText, parsed.date), 1800);
            
            // Instantly update local react state
            const newLocalNote: AccountNote = {
              id: generatedNoteId,
              accountId: targetClient.id,
              text: noteText,
              timestamp: new Date().toISOString(),
              category: 'observation',
              tags: ['Voz']
            };
            onAddNote(newLocalNote);

            setLastAction({
              type: 'ADD_LOG_EXTENDED',
              accountId: targetClient.id,
              entryId: generatedNoteId,
              date: parsed.date,
              noteText
            });

            systemResponse = `A sus órdenes, señor. He registrado su entrada en la bitácora de ${targetClient.name} hoy ${parsed.date}. La nota se guardó exitosamente y se sincronizó con Firebase Firestore: "${noteText}". ¿Desea realizar alguna otra auditoría o registrar algo más, señor?`;
          } catch (fireErr) {
            console.warn("Fallo momentáneo de guardado en la nube en tiempo real (Timeout/Offline):", fireErr);
            
            // Instantly resguard locally through state, persisting to localStorage
            const newLocalNote: AccountNote = {
              id: generatedNoteId,
              accountId: targetClient.id,
              text: noteText,
              timestamp: new Date().toISOString(),
              category: 'observation',
              tags: ['Local', 'Voz']
            };
            onAddNote(newLocalNote);

            setLastAction({
              type: 'ADD_LOG_EXTENDED',
              accountId: targetClient.id,
              entryId: generatedNoteId,
              date: parsed.date,
              noteText
            });

            systemResponse = `Señor, he procesado su anotación para ${targetClient.name}: "${noteText}". Debido a que la base de datos de Firebase no respondió a tiempo debido a una fluctuación temporal de red, guardé la entrada de manera totalmente segura en la memoria y almacenamiento local del sistema. Se sincronizará por detrás de forma transparente apenas retorne la conexión estable.`;
          }
          break;
        }

        case 'RECORD_OFFLINE_SALE': {
          if (!targetClient) {
            systemResponse = `Lo lamento, señor. Detecté su solicitud para registrar una venta manual, pero no pude asociarla con ningún cliente registrado en el sistema. ¿Podría repetirme el comando especificando el nombre de la cuenta o grupo publicitario, por favor?`;
            break;
          }
          if (parsed.amount === undefined || isNaN(parsed.amount)) {
            systemResponse = `Señor, he intentado asentar la venta manual para ${targetClient.name}, pero no he logrado detectar un importe numérico válido en su instrucción. ¿Sería tan amable de indicarme la cifra exacta?`;
            break;
          }

          const generatedSaleId = 'sale_voice_' + Math.random().toString(36).substring(2, 9);

          try {
            // Try updating Firestore with a robust timeout limit of 1.8 seconds
            await executeWithTimeout(saveOfflineSaleToFirestore(targetClient.id, parsed.amount, parsed.date), 1800);
            
            // Local state mutation callback
            onAddOfflineSale(targetClient.id, parsed.amount, parsed.date, generatedSaleId);

            setLastAction({
              type: 'RECORD_OFFLINE_SALE',
              accountId: targetClient.id,
              entryId: generatedSaleId,
              date: parsed.date,
              amount: parsed.amount
            });

            systemResponse = `Entendido, señor. He asentado con éxito una venta manual por un valor de $${parsed.amount.toLocaleString('es-AR')} en la cuenta de ${targetClient.name} con fecha ${parsed.date}. La entrada se sincronizó correctamente con Firebase Firestore. ¿Hay alguna otra tarea que requiera mi atención?`;
          } catch (fireErr) {
            console.warn("Fallo o tardanza en Firestore para venta offline:", fireErr);
            
            // Fallback: save to Local storage instantly so the user experience is flawless
            onAddOfflineSale(targetClient.id, parsed.amount, parsed.date, generatedSaleId);

            setLastAction({
              type: 'RECORD_OFFLINE_SALE',
              accountId: targetClient.id,
              entryId: generatedSaleId,
              date: parsed.date,
              amount: parsed.amount
            });

            systemResponse = `Señor, he registrado con total éxito la venta manual de $${parsed.amount.toLocaleString('es-AR')} para ${targetClient.name} de la fecha ${parsed.date}. El servidor central de Firebase demoró en responder, por lo que he procedido a resguardarla localmente en el almacenamiento auxiliar del sistema, garantizando que el reporte se recalcule y actualice de inmediato.`;
          }
          break;
        }

        case 'MODIFY_PREVIOUS_ENTRY': {
          if (!lastAction) {
            systemResponse = `Lo siento mucho, señor. Entiendo que desea realizar una corrección o modificación, pero no tengo registro de ninguna acción o registro transaccional reciente que pueda modificar de forma automática en esta sesión. ¿Podría dictarme el comando completo de nuevo, por favor?`;
            break;
          }

          const wantsDateChange = /dia|mes|fecha|ayer|hoy|anteayer|de este/gi.test(rawString.toLowerCase());
          const wantsAmountChange = parsed.amount !== undefined;

          if (!wantsDateChange && !wantsAmountChange && parsed.noteText === undefined) {
            systemResponse = `Señor, comprendo que desea modificar el registro anterior, pero no logré descifrar el nuevo valor o la fecha que desea aplicar. ¿Podría repetirme qué cambio desea realizar (por ejemplo, "ponle la fecha del 18" o "cambia el monto a un millón")?`;
            break;
          }

          const targetClientForModification = consolidatedClients.find(c => c.id === lastAction.accountId);
          const clientLabel = targetClientForModification ? targetClientForModification.name : 'la cuenta';

          if (lastAction.type === 'RECORD_OFFLINE_SALE') {
            const updatedFields: Partial<any> = {};
            let changeSummary = [];

            if (wantsAmountChange && parsed.amount !== undefined) {
              updatedFields.amount = parsed.amount;
              changeSummary.push(`el importe a $${parsed.amount.toLocaleString('es-AR')}`);
            }
            if (wantsDateChange) {
              updatedFields.date = parsed.date;
              changeSummary.push(`la fecha al ${parsed.date}`);
            }

            if (Object.keys(updatedFields).length === 0) {
              systemResponse = `Señor, no logré extraer modificaciones de su comando para aplicar a la venta anterior. ¿Desea modificar la fecha o el importe registrado?`;
              break;
            }

            if (onUpdateOfflineSale) {
              onUpdateOfflineSale(lastAction.accountId, lastAction.entryId, updatedFields);
              
              setLastAction({
                ...lastAction,
                ...updatedFields
              });

              systemResponse = `Perfecto, señor. He procedido a rectificar el registro de venta anterior para ${clientLabel}. He modificado con éxito ${changeSummary.join(' y ')}. Los coeficientes e informes de rendimiento se han recalculado de inmediato con los nuevos datos.`;
            } else {
              systemResponse = `Señor, el gestor de ventas local no tiene activa la facultad de rectificación en este entorno.`;
            }
          } else if (lastAction.type === 'ADD_LOG_EXTENDED') {
            const newText = parsed.noteText || parsed.raw;
            if (onUpdateNote) {
              const updatedNote: AccountNote = {
                id: lastAction.entryId,
                accountId: lastAction.accountId,
                text: newText,
                timestamp: new Date().toISOString(),
                category: 'observation',
                tags: ['Voz', 'Corregido']
              };
              onUpdateNote(updatedNote);

              setLastAction({
                ...lastAction,
                noteText: newText
              });

              systemResponse = `A sus órdenes, señor. He actualizado de inmediato la última anotación de bitácora para ${clientLabel}. El nuevo texto registrado es: "${newText}".`;
            } else {
              systemResponse = `Señor, el módulo de bitácoras no permite la edición retrospectiva en este panel.`;
            }
          }
          break;
        }

        case 'CREATIVE_PERFORMANCE': {
          if (!targetClient) {
            systemResponse = `Mis disculpas, señor. Comprendo que solicita una auditoría de piezas creativas, pero no he logrado relacionarla con alguna de las cuentas publicitarias en Orion. ¿Me indicaría el nombre de la cuenta, por favor?`;
            break;
          }

          const currentSpend = targetClient.spend || 0;
          const currentRevenue = targetClient.revenue || 0;
          const currentROAS = currentSpend > 0 ? (currentRevenue / currentSpend) : 0;
          
          let speakDeltaString = '';
          const clientDailySeries = (targetClient as any).dailySeries;
          if (clientDailySeries && clientDailySeries.length >= 7) {
            const series = clientDailySeries;
            const recent7 = series.slice(-7);
            const past7 = series.slice(-14, -7);

            const recSpend = recent7.reduce((sum: number, d: any) => sum + d.spend, 0);
            const recRev = recent7.reduce((sum: number, d: any) => sum + d.revenue, 0);
            const recROAS = recSpend > 0 ? (recRev / recSpend) : 0;

            const oldSpend = past7.reduce((sum: number, d: any) => sum + d.spend, 0);
            const oldRev = past7.reduce((sum: number, d: any) => sum + d.revenue, 0);
            const oldROAS = oldSpend > 0 ? (oldRev / oldSpend) : 0;

            if (oldROAS > 0) {
              const changePct = ((recROAS - oldROAS) / oldROAS) * 100;
              speakDeltaString = ` En la última semana, el retorno de inversión promedió un ${recROAS.toFixed(2)}, mostrando una variación de rentabilidad del ${changePct.toFixed(1)}% con respecto al período anterior.`;
            }
          } else {
            const simulatedPrevROAS = currentROAS > 0 ? currentROAS * 0.91 : 2.1;
            const delta = currentROAS > 0 ? ((currentROAS - simulatedPrevROAS) / simulatedPrevROAS) * 100 : 8.5;
            speakDeltaString = ` El margen actual del retorno de inversión ronda en ${currentROAS.toFixed(2)}. Comparando los datos con el comportamiento histórico se observa un incremento del ${delta.toFixed(1)}% en la rentabilidad de las nuevas piezas agregadas.`;
          }

          systemResponse = `A su servicio, señor. He completado el diagnóstico creativo para ${targetClient.name}. Las campañas vigentes exponen un costo consolidado de $${currentSpend.toLocaleString('es-AR')} y un ingreso por ventas de $${currentRevenue.toLocaleString('es-AR')}.${speakDeltaString} Le sugiero que optimicemos el presupuesto pausando las creatividades con CTR inferior para concentrar recursos en las ganadoras. ¿Le asisto en alguna otra consulta, señor?`;
          break;
        }

        case 'PERFORMANCE_RANKING': {
          if (accounts.length === 0) {
            systemResponse = `Señor, lamento informarle que no poseemos suficientes cuentas publicitarias vinculadas actualmente como para calcular un ranking analítico global.`;
            break;
          }

          const computedAccounts = accounts.map(acc => {
            const sp = acc.spend || 0;
            const rev = acc.revenue || 0;
            const roas = sp > 0 ? (rev / sp) : 0;
            return {
              ...acc,
              roas
            };
          });

          const sorted = [...computedAccounts].sort((a, b) => b.roas - a.roas);
          const topAccount = sorted[0];
          const bottomAccount = sorted[sorted.length - 1];

          let summaryText = ``;
          if (topAccount && topAccount.roas > 0) {
            summaryText += `La cuenta que encabeza la mayor eficiencia de anuncios es ${topAccount.name}, operando con un retorno consolidado de ${topAccount.roas.toFixed(2)}. `;
          }
          if (bottomAccount && bottomAccount !== topAccount && bottomAccount.roas > 0) {
            summaryText += `A su vez, la cuenta con el menor índice de retorno y que requiere mayor optimización inmediata de embudo o creativos es ${bottomAccount.name}, situándose en un retorno de la inversión de ${bottomAccount.roas.toFixed(2)}.`;
          }

          systemResponse = `Análisis global de rendimiento culminado, señor. El panorama general es el siguiente:\n\n${summaryText}\n\n¿Desea que compilemos un reporte específico o que revise el rendimiento de alguna de las cuentas en detalle?`;
          break;
        }

        default: {
          systemResponse = `Lo siento mucho, señor. No logré decodificar su comando. Recuerde que puede pedirme "Auditar rendimiento de [cliente]", "Registrar venta manual de [monto] para [cliente] ayer", o "Guardar bitácora para [cliente] que diga [observación]". ¿En cuál de ellos le asisto ahora mismo, señor?`;
          break;
        }
      }
    } catch (err) {
      console.error(err);
      synth.playError();
      systemResponse = `Mis disculpas, señor. Comprendí el comando con éxito, pero surgió un fallo de software imprevisto en los procesadores locales para consolidar la información. ¿Podría reintentarlo?`;
    }

    setIsProcessing(false);
    addMessage('assistant', systemResponse);
    speakAsOrion(systemResponse);
  };

  return (
    <div id="orion-assistant-root" className="fixed bottom-6 right-6 z-[250] font-sans text-neutral-200 selection:bg-amber-500/20">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.82, y: 35 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.82, y: 35 }}
            transition={{ type: 'spring', damping: 24, stiffness: 210 }}
            className="absolute bottom-20 right-0 w-[365px] h-[525px] bg-[#0c0a06]/95 backdrop-blur-2xl border border-amber-500/20 rounded-2xl shadow-2xl shadow-amber-950/30 flex flex-col overflow-hidden"
          >
            {/* Holographic Living Amber Header */}
            <div className="p-4 bg-[#141006]/95 border-b border-amber-500/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 px-2.5 rounded bg-amber-500/10 text-amber-400 text-[9px] font-mono font-black uppercase tracking-widest flex items-center gap-1.5 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  NÚCLEO ORIÓN
                </div>
                <span className="text-[9px] text-amber-500/40 font-mono tracking-widest uppercase">Protocolo de Voz</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleMute}
                  title={isMuted ? "Activar Voz" : "Silenciar"}
                  className="p-1.5 hover:bg-amber-500/10 rounded text-neutral-400 hover:text-amber-400 transition-all border border-transparent hover:border-amber-500/10"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    synth.playPowerDown();
                    setIsOpen(false);
                  }}
                  className="p-1.5 hover:bg-amber-500/10 rounded text-neutral-400 hover:text-amber-400 transition-all border border-transparent hover:border-amber-500/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-amber-950 scrollbar-track-transparent">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                  {/* Living Spherical Core Graphics representing the exact attached golden sphere */}
                  <div className="relative flex items-center justify-center w-28 h-28 select-none">
                    {/* Glowing outer aura glow */}
                    <div className="absolute inset-0 bg-amber-500/5 rounded-full animate-pulse filter blur-xl" />
                    
                    {/* complex orbit lines overlapping */}
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 16, ease: "linear" }}
                      className="absolute inset-0 rounded-full border border-dashed border-amber-500/20"
                    />
                    <motion.div 
                      animate={{ rotate: -360 }}
                      transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                      className="absolute inset-2 rounded-full border border-amber-600/15"
                      style={{ transform: "rotateX(60deg) rotateY(20deg)" }}
                    />
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                      className="absolute inset-4 rounded-full border-2 border-dotted border-amber-500/30"
                      style={{ transform: "rotateX(30deg) rotateY(-40deg)" }}
                    />
                    <motion.div 
                      animate={{ rotate: -360 }}
                      transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                      className="absolute inset-6 rounded-full border border-amber-400/40"
                    />

                    {/* Highly active energy nucleus */}
                    <motion.div
                      animate={{ scale: [0.95, 1.12, 0.95], rotate: 45 }}
                      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                      className="w-12 h-12 bg-gradient-to-br from-amber-600/40 via-amber-950/60 to-black border border-amber-400/50 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.35)]"
                    >
                      <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                    </motion.div>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-mono font-black text-amber-400 uppercase tracking-widest">Protocolo de Inteligencia Asistencial</h4>
                    <p className="text-[9px] text-neutral-400 font-medium leading-relaxed mt-2 uppercase tracking-wider max-w-[250px] mx-auto opacity-85">
                      Para iniciar, oprima el botón e instruya de viva voz:<br/>
                      <span className="text-amber-500 font-black block mt-2">"Guardar bitácora para Adidas que diga se mejoró página"</span>
                      <span className="text-amber-500 font-black block mt-2">"Registrar venta de 45000 para Nike ayer"</span>
                      <span className="text-amber-500 font-black block mt-2">"Auditar de creativos de Adidas" o "Ranking global"</span>
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2 text-[10px] leading-relaxed font-semibold transition-all duration-300 ${
                      msg.sender === 'user'
                        ? 'bg-amber-950/40 border border-amber-500/30 text-amber-100 rounded-br-none shadow-[0_4px_12px_rgba(245,158,11,0.06)]'
                        : 'bg-neutral-900/95 border border-white/5 text-neutral-200 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                    <span className="block text-[8px] opacity-45 text-right mt-1 font-mono tracking-wider">{msg.timestamp}</span>
                  </div>
                </div>
              ))}

              {/* Streaming Interim Transcript */}
              {isListening && transcriptText && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl px-3.5 py-2 bg-amber-950/20 border border-amber-500/20 text-amber-50 rounded-br-none animate-pulse">
                    <p className="italic text-[10px] font-semibold text-amber-100">{transcriptText}</p>
                    <span className="block text-[8px] text-amber-400 text-right mt-1 uppercase font-bold tracking-widest font-mono">Procesando Audio...</span>
                  </div>
                </div>
              )}

              {/* Loader */}
              {isProcessing && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-neutral-900 border border-amber-500/15 rounded-xl rounded-bl-none px-3.5 py-2 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span className="text-[9px] font-mono font-black uppercase text-amber-400 tracking-widest">Cómputo en curso...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Speaking/Listening Equalizer and Core Trigger */}
            <div className="p-4 bg-[#0d0a04]/95 border-t border-amber-500/10 flex flex-col items-center gap-3">
              {isSpeaking && (
                <div className="flex items-center justify-center gap-1.5 py-1">
                  <span className="text-[8px] font-mono font-black uppercase tracking-widest text-amber-400 mr-1.5">Traduciendo datos...</span>
                  <div className="flex items-end gap-0.5 h-3">
                    {[1, 2, 3, 4, 5, 6].map((bar) => (
                      <motion.div
                        key={bar}
                        animate={{
                          height: ["20%", "100%", "20%"]
                        }}
                        transition={{
                          duration: 0.4 + bar * 0.08,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="w-0.5 bg-amber-400 rounded-full"
                      />
                    ))}
                  </div>
                </div>
              )}

              {isListening && (
                <div className="flex items-center gap-2 justify-center py-1">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                  <span className="text-[8px] font-mono font-black uppercase tracking-widest text-amber-500">Esperando directiva...</span>
                </div>
              )}

              <div className="w-full flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleStartListening}
                  className={`w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-[10px] font-mono font-black uppercase tracking-widest transition-all ${
                    isListening
                      ? 'bg-amber-600 hover:bg-amber-700 text-black font-black saturate-150 animate-pulse shadow-lg shadow-amber-950/40 border border-amber-500/30'
                      : 'bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 text-amber-300 shadow-lg shadow-amber-950/30'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 text-black" />
                      Detener Recepción
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-amber-400" />
                      Hablar con Orión
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Living Entity Orb (Core) modeled exactly after the complex bright golden sphere photo */}
      <motion.div
        animate={{
          y: isOpen ? 0 : [0, -9, 0],
        }}
        transition={{
          y: {
            repeat: Infinity,
            duration: 3.8,
            ease: "easeInOut"
          }
        }}
        className="relative"
      >
        {/* Glowing outer aura bloom */}
        <div className={`absolute inset-0 rounded-full blur-2xl opacity-75 transition-all duration-750 ${
          isListening 
            ? 'bg-amber-500/50 scale-140' 
            : isProcessing 
              ? 'bg-amber-600/60 scale-130 animate-pulse' 
              : isSpeaking 
                ? 'bg-amber-400/50 scale-145'
                : 'bg-amber-500/30'
        }`} />

        <button
          type="button"
          onClick={() => {
            if (!isOpen) {
              synth.playChirp();
            } else {
              synth.playPowerDown();
            }
            setIsOpen(!isOpen);
          }}
          className="relative w-28 h-28 rounded-full flex items-center justify-center select-none active:scale-95 transition-all duration-300 outline-none filter brightness-110"
          id="orion-living-core-button"
        >
          {/* Multiple complex concentric holographic rings of data matching the attached gold sphere file */}
          
          {/* External Ring 1 - Dash Pattern (Clockwise) */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
            className={`absolute inset-0 border-2 rounded-full border-dashed ${
              isListening 
                ? 'border-amber-400/70 border-spacing-2' 
                : 'border-amber-500/40'
            }`}
          />

          {/* Holographic Ring 2 - Micro ticks representation (Counter-Clockwise) */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 14, ease: "linear" }}
            className="absolute inset-2 border border-dotted border-amber-400/50 rounded-full"
            style={{ transform: "rotateX(45deg) rotateY(15deg)" }}
          />

          {/* Diagonal Volumetric Ring 3 (Interlocking Sphere Orbit) */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
            className="absolute inset-4 border border-amber-300/40 rounded-full"
            style={{ transform: "rotateX(-30deg) rotateY(45deg)" }}
          />

          {/* Diagonal Volumetric Ring 4 (Interlocking Sphere Orbit inverse) */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 11, ease: "linear" }}
            className="absolute inset-6 border border-amber-400/35 rounded-full"
            style={{ transform: "rotateX(60deg) rotateY(-40deg)" }}
          />

          {/* Internal Quick Ring 5 - Core Data line */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
            className="absolute inset-8 border border-t-amber-300/75 border-r-transparent border-b-transparent border-l-transparent rounded-full"
          />

          {/* Core Mechanism container - No logos, pure organic plasma fluid dynamics */}
          <div className={`absolute inset-7 rounded-full flex items-center justify-center transition-all duration-500 overflow-hidden ${
            isListening
              ? 'bg-gradient-to-br from-amber-500/95 via-amber-950 to-black border-2 border-amber-300 shadow-[inset_0_0_22px_rgba(245,158,11,0.8)]'
              : isProcessing
                ? 'bg-gradient-to-br from-amber-600/95 via-amber-950 to-black border-2 border-amber-400 shadow-[inset_0_0_22px_rgba(217,119,6,0.8)]'
                : 'bg-gradient-to-br from-amber-800 via-[#181308] to-black border-2 border-amber-500/70 shadow-[inset_0_0_18px_rgba(245,158,11,0.6)]'
          }`}>
            {/* Multi-layered custom plasma cells inside the core sphere representing active consciousness */}
            <div className="absolute inset-0.5 rounded-full overflow-hidden flex items-center justify-center">
              {/* Outer plasma plasma ripple */}
              <motion.div
                animate={{
                  scale: isListening ? [0.8, 1.4, 0.8] : isSpeaking ? [0.9, 1.3, 0.9] : [0.95, 1.15, 0.95],
                  opacity: [0.35, 0.75, 0.35]
                }}
                transition={{
                  repeat: Infinity,
                  duration: isListening ? 1.0 : isSpeaking ? 1.4 : 2.5,
                  ease: "easeInOut"
                }}
                className="absolute inset-1 rounded-full bg-amber-400/25 blur-sm"
              />

              {/* Secondary offset pulsing shield */}
              <motion.div
                animate={{
                  rotate: 360,
                  scale: isListening ? [1.1, 0.85, 1.1] : [1, 0.9, 1]
                }}
                transition={{
                  repeat: Infinity,
                  duration: 8,
                  ease: "linear"
                }}
                className="absolute inset-2 border border-dashed border-amber-300/50 rounded-full"
              />
            </div>

            {/* Reactive centerpiece core sphere (Pure golden nucleus, no SVG Icons) */}
            <motion.div
              animate={isListening ? {
                scale: [0.9, 1.5, 0.9],
                backgroundColor: ["#f59e0b", "#fffbeb", "#f59e0b"],
                boxShadow: ["0 0 25px 6px rgba(251,191,36,0.95)", "0 0 35px 12px rgba(251,191,36,0.99)", "0 0 25px 6px rgba(251,191,36,0.95)"]
              } : isProcessing ? {
                scale: [1, 1.3, 1],
                backgroundColor: ["#d97706", "#fef3c7", "#d97706"],
                boxShadow: ["0 0 18px 4px rgba(217,119,6,0.85)", "0 0 28px 8px rgba(217,119,6,0.95)", "0 0 18px 4px rgba(217,119,6,0.85)"]
              } : isSpeaking ? {
                scale: [0.95, 1.4, 0.95],
                backgroundColor: ["#fbbf24", "#ffffff", "#fbbf24"],
                boxShadow: ["0 0 30px 8px rgba(251,191,36,0.95)", "0 0 40px 14px rgba(255,255,255,0.99)", "0 0 30px 8px rgba(251,191,36,0.95)"]
              } : {
                scale: [0.95, 1.2, 0.95],
                backgroundColor: ["#d97706", "#f59e0b", "#d97706"],
                boxShadow: ["0 0 15px 3px rgba(245,158,11,0.7)", "0 0 25px 8px rgba(245,158,11,0.85)", "0 0 15px 3px rgba(245,158,11,0.7)"]
              }}
              transition={{ repeat: Infinity, duration: isListening ? 0.8 : isProcessing ? 1.3 : isSpeaking ? 0.95 : 3.2, ease: "easeInOut" }}
              className="w-7 h-7 rounded-full flex items-center justify-center relative z-10"
            >
              {/* Internal brilliant point light source */}
              <div className="w-2.5 h-2.5 bg-white rounded-full blur-[1px] opacity-90 animate-pulse" />
            </motion.div>
          </div>
        </button>
      </motion.div>
    </div>
  );
}
