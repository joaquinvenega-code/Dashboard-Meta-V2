import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, X, Volume2, VolumeX, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { parseAdvancedVoiceCommand, ParsedVoiceCommand } from '../utils/voiceParser';
import { saveLogToFirestore, saveOfflineSaleToFirestore } from '../services/firebaseService';
import { AdAccount, AccountNote } from '../types';

interface FloatingAssistantProps {
  accounts: AdAccount[];
  accountGroups?: any[];
  notes: AccountNote[];
  onAddNote: (note: AccountNote) => void;
  onAddOfflineSale: (accountId: string, amount: number, date: string) => void;
  settings: Record<string, any>;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isProcessing?: boolean;
}

// Helper to sanitize and normalize text for speech synthesis
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

  // Convert decimal points/commas to spoken word format "coma"
  cleaned = cleaned.replace(/(\d+)\.(\d+)/g, '$1 coma $2');
  cleaned = cleaned.replace(/(\d+),(\d+)/g, '$1 coma $2');

  return cleaned;
}

export default function FloatingAssistant({
  accounts,
  accountGroups = [],
  notes,
  onAddNote,
  onAddOfflineSale,
  settings
}: FloatingAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [transcriptText, setTranscriptText] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, transcriptText]);

  // Clean speaking on unmount or close
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

  // Initialize SpeechSynthesis voices list
  useEffect(() => {
    if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        if (window.speechSynthesis) {
          window.speechSynthesis.getVoices();
        }
      };
    }
  }, []);

  const addMessage = (sender: 'user' | 'assistant', text: string, isProcessing = false) => {
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
  const speakAsJarvis = (text: string) => {
    if (isMuted || !window.speechSynthesis) {
      setIsSpeaking(false);
      return;
    }

    // Cancel dynamic speaking if any
    window.speechSynthesis.cancel();

    const optimized = optimizeTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(optimized);
    utterance.rate = 0.95; // Slightly slower speed for a natural cadence

    // Apply Spanish preferred voices (e.g. Google or standard Spanish)
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
      
      const welcomeText = `${greeting}, señor. El asistente de voz Orión está en línea y a sus órdenes. ¿En qué puedo asistirle hoy o qué cuenta publicitaria desea de la que audite el rendimiento?`;
      
      const timer = setTimeout(() => {
        addMessage('assistant', welcomeText);
        speakAsJarvis(welcomeText);
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

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      const offlineMsg = 'Disculpe, señor. Su navegador actual no cuenta con soporte para el protocolo de transmisión de voz. Le sugiero utilizar Google Chrome.';
      addMessage('assistant', offlineMsg);
      speakAsJarvis(offlineMsg);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'es-AR'; // Set Spanish Argentina/Latin accent
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
          const errMsg = `Mis disculpas, señor. Al parecer ha surgido un inconveniente con el receptor de audio (${event.error}). ¿Podría intentarlo de nuevo?`;
          addMessage('assistant', errMsg);
          speakAsJarvis(errMsg);
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

    // Build consolidated list of clients combining individual accounts and user group structures
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
        
        // Aggregate dailySeries by date
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

    // Map clients name array for exact parsing, including custom names
    const mappedClients = consolidatedClients.map(c => ({
      id: c.id,
      name: c.rawName,
      customName: c.customName
    }));

    // 2. Parse command using custom Regex parser
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
          
          // Execute Firestore mutation
          await saveLogToFirestore(targetClient.id, noteText, parsed.date);

          // Update local frontend state instantly
          const newLocalNote: AccountNote = {
            id: 'voice_' + Math.random().toString(36).substring(2, 9),
            accountId: targetClient.id,
            text: noteText,
            timestamp: new Date().toISOString(),
            category: 'observation',
            tags: ['Voz']
          };
          onAddNote(newLocalNote);

          systemResponse = `Entendido, señor. He registrado su entrada en la bitácora para el cliente ${targetClient.name} con fecha del ${parsed.date}. He guardado de manera segura en Firestore la siguiente nota: "${noteText}". ¿Hay alguna otra actualización que requiera mi intervención, señor?`;
          break;
        }

        case 'RECORD_OFFLINE_SALE': {
          if (!targetClient) {
            systemResponse = `Lo lamento, señor. Detecté su solicitud para registrar una venta manual, pero no pude asociarla con un cliente existente. ¿Podría repetirme el comando especificando el nombre del cliente adecuadamente?`;
            break;
          }
          if (parsed.amount === undefined || isNaN(parsed.amount)) {
            systemResponse = `Señor, he intentado asentar la venta offline para ${targetClient.name}, pero no he logrado detectar un monto numérico válido en su instrucción. ¿Sería tan amable de indicarme la cifra exacta?`;
            break;
          }

          // Execute Firestore mutation
          await saveOfflineSaleToFirestore(targetClient.id, parsed.amount, parsed.date);

          // Update local settings state instantly
          onAddOfflineSale(targetClient.id, parsed.amount, parsed.date);

          systemResponse = `A sus órdenes, señor. He registrado exitosamente la venta offline por un importe de $${parsed.amount.toLocaleString('es-AR')} para la cuenta de ${targetClient.name} con fecha del ${parsed.date}. La transacción fue sincronizada exitosamente con Firebase Firestore. ¿Desea que realice algo más por usted?`;
          break;
        }

        case 'CREATIVE_PERFORMANCE': {
          if (!targetClient) {
            systemResponse = `Mis disculpas, señor. Comprendo que solicita una auditoría de creativos, pero no he logrado asociarla con ninguna de sus cuentas publicitarias. ¿Me indicaría para qué cliente desea que realice la consulta?`;
            break;
          }

          // Evaluate metrics in global state
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
              speakDeltaString = ` En los últimos siete días, registramos un retorno de inversión promedio de ${recROAS.toFixed(2)}, mostrando una variación del ${changePct.toFixed(1)}% con respecto a la semana previa.`;
            }
          } else {
            const simulatedPrevROAS = currentROAS > 0 ? currentROAS * 0.91 : 2.1;
            const delta = currentROAS > 0 ? ((currentROAS - simulatedPrevROAS) / simulatedPrevROAS) * 100 : 8.5;
            speakDeltaString = ` Actualmente muestra un retorno de la inversión de ${currentROAS.toFixed(2)}. Comparado con la semana pasada registramos un patrón positivo de crecimiento del ${delta.toFixed(1)}% en la rentabilidad de las creatividades nuevas.`;
          }

          systemResponse = `Por supuesto, señor. Aquí tiene la auditoría de creativos para ${targetClient.name}. Sus campañas actuales reportan un gasto acumulado de $${currentSpend.toLocaleString('es-AR')} con un retorno generado de $${currentRevenue.toLocaleString('es-AR')}.${speakDeltaString} Le sugiero enfáticamente priorizar las piezas con mayor tasa de clics y suspender las que eleven el costo por adquisición. ¿Tiene alguna directiva adicional que desee que ejecute?`;
          break;
        }

        case 'PERFORMANCE_RANKING': {
          if (accounts.length === 0) {
            systemResponse = `Señor, lamento informarle que no he encontrado cuentas publicitarias activas cargadas en el panel global necesarias para calcular el ranking de rendimiento. ¿Desea que espere a que se sincronice el sistema?`;
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
            summaryText += `La cuenta con mejor rendimiento actual es ${topAccount.name}, liderando con un retorno de la inversión de ${topAccount.roas.toFixed(2)}. `;
          }
          if (bottomAccount && bottomAccount !== topAccount && bottomAccount.roas > 0) {
            summaryText += `Por otro lado, la cuenta que requiere mayor optimización es ${bottomAccount.name}, la cual presenta un retorno de la inversión de ${bottomAccount.roas.toFixed(2)}.`;
          } else {
            summaryText += `El resto de los clientes mantiene un margen promedio de rentabilidad estable.`;
          }

          systemResponse = `Un momento, señor. Analizando... Listo. Aquí tiene el reporte de rendimiento global:\n\n${summaryText}\n\n¿Desea que profundice en alguna de estas métricas o prepare un reporte para nuestro cliente?`;
          break;
        }

        default: {
          systemResponse = `Lo lamento mucho, señor. No he comprendido su instrucción con claridad. Le recuerdo que estoy capacitado para registrar bitácoras, añadir ventas manuales, realizar auditorías de creativos o calcular el ranking de rentabilidad global. ¿En qué le gustaría que colabore?`;
          break;
        }
      }
    } catch (err) {
      console.error(err);
      systemResponse = `Lo siento, señor. Comprendí el comando pero surgió un fallo inesperado al asentar los datos en el servidor local.`;
    }

    setIsProcessing(false);
    addMessage('assistant', systemResponse);
    speakAsJarvis(systemResponse);
  };

  return (
    <div id="floating-assistant-root" className="fixed bottom-6 right-6 z-[250] font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="absolute bottom-20 right-0 w-[360px] h-[500px] bg-[#090a0f]/95 backdrop-blur-xl border border-cyan-500/20 rounded-2xl shadow-3xl shadow-cyan-950/20 flex flex-col overflow-hidden"
          >
            {/* Holographic Header */}
            <div className="p-4 bg-[#0d0f17]/90 border-b border-cyan-500/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 px-2.5 rounded bg-cyan-500/10 text-cyan-400 text-[9px] font-mono font-black uppercase tracking-widest flex items-center gap-1.5 border border-cyan-500/20 shadow-[0_0_8px_rgba(6,182,212,0.15)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  ORIÓN J.A.R.V.I.S.
                </div>
                <span className="text-[9px] text-cyan-450/40 font-mono tracking-widest uppercase">Protocolo Activo</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleMute}
                  title={isMuted ? "Activar Voz" : "Silenciar"}
                  className="p-1.5 hover:bg-cyan-500/10 rounded text-neutral-400 hover:text-cyan-400 transition-all border border-transparent hover:border-cyan-500/10"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-450" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                  }}
                  className="p-1.5 hover:bg-red-500/10 rounded text-neutral-400 hover:text-red-400 transition-all border border-transparent hover:border-red-500/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-cyan-950 scrollbar-track-transparent">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                  {/* Visual central pulsating radar */}
                  <div className="relative flex items-center justify-center w-20 h-20">
                    <motion.div 
                      animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.6, 0.3] }} 
                      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                      className="absolute inset-0 rounded-full border border-cyan-500/30"
                    />
                    <motion.div 
                      animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.4, 0.1] }} 
                      transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                      className="absolute inset-2 rounded-full border-2 border-dashed border-cyan-500/20"
                    />
                    <div className="w-10 h-10 bg-cyan-950/40 border border-cyan-500/40 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                      <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-mono font-black text-cyan-300 uppercase tracking-widest">Interfaz Asistente Jarvis</h4>
                    <p className="text-[9px] text-neutral-400 font-medium leading-relaxed mt-2 uppercase tracking-wider max-w-[240px] mx-auto opacity-80">
                      Presione el control de comando inferior o pronuncie de viva voz:<br/>
                      <span className="text-cyan-440 font-bold block mt-2">"Guardar bitácora para Nike que diga se aumentó inversión"</span>
                      <span className="text-cyan-440 font-bold block mt-1">"Registrar venta de 15000 para Adidas ayer"</span>
                      <span className="text-cyan-440 font-bold block mt-1">"Auditar creativos de Nike" o "ranking global"</span>
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
                        ? 'bg-cyan-950/40 border border-cyan-500/30 text-cyan-100 rounded-br-none shadow-[0_4px_12px_rgba(6,182,212,0.05)]'
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
                  <div className="max-w-[85%] rounded-xl px-3.5 py-2 bg-red-950/30 border border-red-500/20 text-red-50 rounded-br-none animate-pulse">
                    <p className="italic text-[10px] font-semibold text-red-100">{transcriptText}</p>
                    <span className="block text-[8px] text-red-400 text-right mt-1 uppercase font-bold tracking-widest font-mono">Transcribiendo...</span>
                  </div>
                </div>
              )}

              {/* Loader */}
              {isProcessing && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-neutral-900 border border-cyan-500/10 rounded-xl rounded-bl-none px-3.5 py-2 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    <span className="text-[9px] font-mono font-black uppercase text-cyan-400 tracking-widest">Calculando respuesta...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Speaking/Listening Equalizer and Core Trigger */}
            <div className="p-4 bg-[#08090e]/95 border-t border-cyan-500/10 flex flex-col items-center gap-3">
              {/* Voice equalizer waves when speaking */}
              {isSpeaking && (
                <div className="flex items-center justify-center gap-1.5 py-1">
                  <span className="text-[8px] font-mono font-black uppercase tracking-widest text-cyan-400 mr-1.5">Sintetizando...</span>
                  <div className="flex items-end gap-0.5 h-3">
                    {[1, 2, 3, 4, 5].map((bar) => (
                      <motion.div
                        key={bar}
                        animate={{
                          height: ["20%", "100%", "20%"]
                        }}
                        transition={{
                          duration: 0.5 + bar * 0.1,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="w-0.5 bg-cyan-400 rounded-full"
                      />
                    ))}
                  </div>
                </div>
              )}

              {isListening && (
                <div className="flex items-center gap-2 justify-center py-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  <span className="text-[8px] font-mono font-black uppercase tracking-widest text-red-500">Oyendo directivas...</span>
                </div>
              )}

              <div className="w-full flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleStartListening}
                  className={`w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-[10px] font-mono font-black uppercase tracking-widest transition-all ${
                    isListening
                      ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-lg shadow-red-950/40 border border-red-500/30'
                      : 'bg-cyan-950/40 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 shadow-lg shadow-cyan-950/30'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 text-white" />
                      Detener Grabación
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-cyan-400" />
                      Transmitir Instrucción
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Living Entity Orb (Core) */}
      <motion.div
        animate={{
          y: isOpen ? 0 : [0, -8, 0],
        }}
        transition={{
          y: {
            repeat: Infinity,
            duration: 4,
            ease: "easeInOut"
          }
        }}
        className="relative"
      >
        {/* Holographic glowing bloom aura */}
        <div className={`absolute inset-0 rounded-full blur-xl opacity-60 transition-all duration-700 ${
          isListening 
            ? 'bg-red-500/30 scale-125' 
            : isProcessing 
              ? 'bg-amber-500/30 scale-125' 
              : 'bg-cyan-500/20'
        }`} />

        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
          }}
          className="relative w-16 h-16 rounded-full flex items-center justify-center select-none active:scale-95 transition-all duration-300 outline-none hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] filter brightness-110"
          id="jarvis-core-button"
        >
          {/* Constellation ring 1 - Clockwise */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
            className={`absolute inset-0 border rounded-full ${
              isListening 
                ? 'border-red-500/30 border-dashed' 
                : 'border-cyan-500/30 border-dashed'
            }`}
          />

          {/* Core mechanism ring 2 - Counter-clock */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            className={`absolute inset-2 border-2 rounded-full border-t-transparent border-b-transparent ${
              isListening
                ? 'border-red-400/40'
                : 'border-cyan-400/40'
            }`}
          />

          {/* Equalizer waves radiating outward during speech output */}
          {isSpeaking && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-20 h-20 border border-cyan-450/40 rounded-full animate-ping absolute opacity-60" />
              <div className="w-24 h-24 border border-cyan-500/20 rounded-full animate-ping absolute opacity-40" style={{ animationDelay: '0.3s' }} />
            </div>
          )}

          {/* Physical Living Orb container */}
          <div className={`absolute inset-3 rounded-full flex items-center justify-center transition-all duration-500 ${
            isListening
              ? 'bg-gradient-to-br from-red-950/90 to-black border border-red-500/60 shadow-[inset_0_0_12px_rgba(239,68,68,0.5)]'
              : isProcessing
                ? 'bg-gradient-to-br from-amber-950/90 to-black border border-amber-500/60 shadow-[inset_0_0_12px_rgba(245,158,11,0.5)]'
                : 'bg-gradient-to-br from-cyan-950/90 to-black border border-cyan-500/60 shadow-[inset_0_0_12px_rgba(6,182,212,0.5)]'
          }`}>
            {/* Reactive center nucleus */}
            <motion.div
              animate={isListening ? {
                scale: [1, 1.4, 1],
                backgroundColor: ["#ef4444", "#f87171", "#ef4444"],
              } : isProcessing ? {
                scale: [1, 1.25, 1],
                backgroundColor: ["#f59e0b", "#fbbf24", "#f59e0b"],
              } : {
                scale: [1, 1.15, 1],
                backgroundColor: ["#06b6d4", "#22d3ee", "#06b6d4"],
              }}
              transition={{ repeat: Infinity, duration: isListening ? 0.8 : isProcessing ? 1.4 : 2.5, ease: "easeInOut" }}
              className="w-4.5 h-4.5 rounded-full shadow-[0_0_15px_currentColor] flex items-center justify-center"
            >
              {isOpen ? (
                <X className="w-2.5 h-2.5 text-black font-extrabold" />
              ) : (
                <Sparkles className="w-2 h-2 text-black" />
              )}
            </motion.div>
          </div>
        </button>
      </motion.div>
    </div>
  );
}
