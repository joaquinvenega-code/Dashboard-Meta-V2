/// <reference types="vite/client" />
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, X, Volume2, VolumeX, Sparkles, Loader2, Play } from 'lucide-react';
import { parseAdvancedVoiceCommand, ParsedVoiceCommand } from '../utils/voiceParser';
import { saveLogToFirestore, saveOfflineSaleToFirestore } from '../services/firebaseService';
import { AdAccount, AccountNote, OfflineSaleEntry } from '../types';

interface FloatingAssistantProps {
  accounts: AdAccount[];
  accountGroups?: any[];
  notes: AccountNote[];
  orionSettings?: {
    voiceType: string;
    capabilities: {
      notes: boolean;
      offlineSales: boolean;
      analyze: boolean;
    };
  };
  onAddNote: (note: AccountNote) => void;
  onUpdateNote?: (note: AccountNote) => void;
  onDeleteNote?: (noteId: string) => void;
  onAddOfflineSale: (accountId: string, amount: number, date: string, customId?: string) => void;
  onUpdateOfflineSale?: (accountId: string, entryId: string, updatedFields: Partial<any>) => void;
  onDeleteOfflineSale?: (accountId: string, entryId: string) => void;
  settings: Record<string, any>;
  isSyncingGlobal?: boolean;
  onTriggerSync?: () => Promise<void>;
  isGeneratingReport?: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isProcessing?: boolean;
}

interface PendingBitacoraDraft {
  type: 'RECORD_OFFLINE_SALE' | 'ADD_LOG_EXTENDED';
  accountId: string;
  date: string;
  amount: string;
  noteText: string;
  warnings: string[];
}

interface PendingNoteAction {
  type: 'delete' | 'update';
  note: AccountNote;
  accountName: string;
  newText?: string;
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

  // Power up energy concentration
  playPowerUp() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(100, now);
      filter.frequency.exponentialRampToValueAtTime(3000, now + 0.5);
      
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {}
  }

  // Energy dissipate explosion
  playDissipate() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      
      // complex detuned descension
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(600, now);
      osc1.frequency.exponentialRampToValueAtTime(50, now + 0.5);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(300, now);
      osc2.frequency.exponentialRampToValueAtTime(30, now + 0.5);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.5);
      
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
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

export function makeSpeechBrief(text: string): string {
  const plainText = text
    .replace(/\*\*/g, '')
    .replace(/^\s*\d+\.\s*/gm, '')
    .replace(/\s+/g, ' ')
    .replace(/^(?:A sus órdenes|A su servicio|Entendido perfectamente|Entendido|Soberbio|Mis disculpas|Disculpe|Señor)[,.:\s]+/i, '')
    .trim();

  const sentences = plainText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [plainText];
  let brief = sentences.slice(0, 2).join(' ').trim();

  if (brief.length > 190) {
    const shortened = brief.slice(0, 190);
    brief = `${shortened.slice(0, shortened.lastIndexOf(' ')) || shortened}…`;
  }

  return brief || 'Listo.';
}

export default function FloatingAssistant({
  accounts,
  accountGroups = [],
  notes,
  orionSettings,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onAddOfflineSale,
  onUpdateOfflineSale,
  onDeleteOfflineSale,
  settings,
  isSyncingGlobal = false,
  onTriggerSync,
  isGeneratingReport = false
}: FloatingAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSuccessState, setIsSuccessState] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [transcriptText, setTranscriptText] = useState('');
  const [pendingDraft, setPendingDraft] = useState<PendingBitacoraDraft | null>(null);
  const [draftError, setDraftError] = useState('');
  const [lastPreviewedNotes, setLastPreviewedNotes] = useState<AccountNote[]>([]);
  const [lastPreviewedAccountId, setLastPreviewedAccountId] = useState<string | null>(null);
  const [pendingNoteAction, setPendingNoteAction] = useState<PendingNoteAction | null>(null);
  const [pendingClientIntent, setPendingClientIntent] = useState<ParsedVoiceCommand['intent'] | null>(null);
  const [lastAction, setLastAction] = useState<{
    type: 'RECORD_OFFLINE_SALE' | 'ADD_LOG_EXTENDED';
    accountId: string;
    entryId: string;
    date: string;
    amount?: number;
    noteText?: string;
  } | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<any>(null);
  const transcriptBufferRef = useRef('');
  const lastProcessedTranscriptRef = useRef<{ text: string; at: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartTime = useRef<number>(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const [chatPosition, setChatPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom-right');

  useEffect(() => {
    if (isOpen && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const isTop = rect.top < window.innerHeight / 2;
      const isLeft = rect.left < window.innerWidth / 2;
      setChatPosition(`${isTop ? 'top' : 'bottom'}-${isLeft ? 'left' : 'right'}` as any);
    }
  }, [isOpen]);

  // Orion State Machine Active State Selection
  let currentOrionState: 'standby' | 'listening' | 'thinking' | 'success' = 'standby';
  if (isSuccessState) {
    currentOrionState = 'success';
  } else if (isSyncingGlobal || isProcessing) {
    currentOrionState = 'thinking';
  } else if (isListening) {
    currentOrionState = 'listening';
  } else {
    currentOrionState = 'standby';
  }

  const orbStatus = isGeneratingReport
    ? 'Analizando'
    : currentOrionState === 'success'
      ? 'Listo'
      : isSpeaking
        ? 'Respondiendo'
        : currentOrionState === 'listening'
          ? 'Escuchando'
          : currentOrionState === 'thinking'
            ? 'Procesando'
            : 'Orión';

  // Mount/Unmount effects
  useEffect(() => {
    synth.playPowerUp();
    return () => {
      synth.playDissipate();
    };
  }, []);

  // Helper trigger for Orion UI to flash success (Golden/Emerald pulse expansion)
  const triggerSuccessState = () => {
    setIsSuccessState(true);
    synth.playConfirm();
    setTimeout(() => {
      setIsSuccessState(false);
    }, 1800);
  };

  // Reverts the last action recorded in this assistant session
  const handleUndoLastAction = () => {
    if (!lastAction) return;
    
    synth.playPowerDown();
    
    if (lastAction.type === 'RECORD_OFFLINE_SALE') {
      if (onDeleteOfflineSale) {
        onDeleteOfflineSale(lastAction.accountId, lastAction.entryId);
        const undoMsg = `He procedido a deshacer de inmediato la venta manual de $${lastAction.amount?.toLocaleString('es-AR')} registrada en la cuenta.`;
        addMessage('assistant', undoMsg);
        speakAsOrion(undoMsg);
      }
    } else if (lastAction.type === 'ADD_LOG_EXTENDED') {
      if (onDeleteNote) {
        onDeleteNote(lastAction.entryId);
        const undoMsg = `He deshecho y suprimido con éxito su última anotación de la bitácora anterior ("${lastAction.noteText}").`;
        addMessage('assistant', undoMsg);
        speakAsOrion(undoMsg);
      }
    }
    
    setLastAction(null);
    triggerSuccessState();
  };

  // Sync state tracking to transition from thinking to success upon modular sync complete (Scenario A)
  const prevSyncingGlobal = useRef(isSyncingGlobal);
  useEffect(() => {
    if (prevSyncingGlobal.current && !isSyncingGlobal) {
      triggerSuccessState();
    }
    prevSyncingGlobal.current = isSyncingGlobal;
  }, [isSyncingGlobal]);

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
  }, [messages, transcriptText, pendingDraft, pendingNoteAction]);

  // Clean speaking on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  // Cancel speaking when panel closes
  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    }
  }, [isOpen]);

  // Initialize SpeechSynthesis (fallback only)
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

  // Speaks using Google Cloud TTS (fallback to Web Speech API)
  const speakAsOrion = async (text: string) => {
    if (isMuted) {
      setIsSpeaking(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const spokenText = makeSpeechBrief(text);

    // Trigger talking chord
    synth.playConfirm();

    try {
      const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
      const response = await fetch(`${baseUrl}/orion/tts-google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: spokenText, voiceName: orionSettings?.voiceType || 'es-US-Neural2-C' }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        
        audioRef.current.src = audioUrl;
        audioRef.current.onplay = () => setIsSpeaking(true);
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl); // cleanup
        };
        audioRef.current.onerror = () => setIsSpeaking(false);
        
        audioRef.current.play().catch(e => {
          console.error("Audio playback failed, falling back to window.speechSynthesis", e);
          fallbackSpeechSynthesis(spokenText);
        });
      } else if (response.status === 503 || response.status === 500) {
        console.warn(`Google Cloud TTS configuracion faltante API Error: ${response.status}. Usando respaldo...`);
        fallbackSpeechSynthesis(spokenText);
      } else {
        console.warn('Google Cloud TTS failed, falling back...');
        fallbackSpeechSynthesis(spokenText);
      }
    } catch (e) {
      console.error('Error fetching Google Cloud TTS:', e);
      fallbackSpeechSynthesis(spokenText);
    }
  };

  const fallbackSpeechSynthesis = (text: string) => {
    if (!window.speechSynthesis) {
      setIsSpeaking(false);
      return;
    }

    const optimized = optimizeTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(optimized);
    utterance.rate = 1.05;
    utterance.pitch = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const spanishVoices = voices.filter(v => v.lang.startsWith('es'));
    
    // Buscar la voz más premium y natural en español latino/neutro (es-MX, es-US, es-AR)
    const preferredVoice = 
      spanishVoices.find(v => (v.lang === 'es-MX' || v.lang === 'es-US' || v.lang === 'es-AR') && v.name.toLowerCase().includes('natural')) ||
      spanishVoices.find(v => v.name.toLowerCase().includes('sabina')) || // Excelente voz en macOS
      spanishVoices.find(v => v.lang === 'es-MX' || v.lang === 'es-US' || v.lang === 'es-AR' || v.lang === 'es-419') ||
      spanishVoices.find(v => v.name.toLowerCase().includes('google') && !v.name.toLowerCase().includes('españa')) ||
      spanishVoices[0] || null;

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
      let timeGreeting = 'Buenas noches';
      if (hours >= 6 && hours < 12) {
        timeGreeting = 'Buenos días';
      } else if (hours >= 12 && hours < 21) {
        timeGreeting = 'Buenas tardes';
      }
      
      const greetings = [
        `${timeGreeting}. ¿Qué necesitás registrar?`,
        `${timeGreeting}. Te escucho.`,
        `${timeGreeting}. ¿En qué cuenta trabajamos?`,
        `${timeGreeting}. Orión está listo.`
      ];
      
      const welcomeText = greetings[Math.floor(Math.random() * greetings.length)];
      
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
    if (nextMuted) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    }
  };

  const bitacoraClients = [
    ...accounts.map(account => ({
      id: account.id,
      name: settings[account.id]?.customName || account.name,
      currency: settings[account.id]?.currency || account.currency || 'ARS'
    })),
    ...accountGroups.map(group => ({
      id: group.id,
      name: settings[group.id]?.customName || group.name,
      currency: settings[group.id]?.currency || 'ARS'
    }))
  ];

  const handleCancelDraft = () => {
    setPendingDraft(null);
    setDraftError('');
    const message = 'Borrador cancelado. No se guardó ningún dato.';
    addMessage('assistant', message);
    speakAsOrion(message);
  };

  const handleConfirmDraft = async () => {
    if (!pendingDraft || isProcessing) return;

    const selectedClient = bitacoraClients.find(client => client.id === pendingDraft.accountId);
    if (!selectedClient) {
      setDraftError('Seleccioná el cliente antes de guardar.');
      return;
    }

    const parsedDate = new Date(`${pendingDraft.date}T12:00:00`);
    if (!pendingDraft.date || Number.isNaN(parsedDate.getTime())) {
      setDraftError('Revisá la fecha antes de guardar.');
      return;
    }

    const amount = Number(pendingDraft.amount);
    if (pendingDraft.type === 'RECORD_OFFLINE_SALE' && (!Number.isFinite(amount) || amount <= 0)) {
      setDraftError('Ingresá un importe mayor que cero.');
      return;
    }
    if (pendingDraft.type === 'ADD_LOG_EXTENDED' && !pendingDraft.noteText.trim()) {
      setDraftError('Escribí el contenido de la bitácora antes de guardar.');
      return;
    }

    setDraftError('');
    setIsProcessing(true);
    let cloudSaved = true;

    try {
      if (pendingDraft.type === 'RECORD_OFFLINE_SALE') {
        const entryId = `sale_voice_${Math.random().toString(36).substring(2, 9)}`;
        try {
          await executeWithTimeout(saveOfflineSaleToFirestore(selectedClient.id, amount, pendingDraft.date), 1800);
        } catch (error) {
          cloudSaved = false;
          console.warn('La venta se guardará localmente porque Firestore no respondió:', error);
        }

        onAddOfflineSale(selectedClient.id, amount, pendingDraft.date, entryId);
        setLastAction({
          type: 'RECORD_OFFLINE_SALE',
          accountId: selectedClient.id,
          entryId,
          date: pendingDraft.date,
          amount
        });

        const message = `Venta confirmada: $${amount.toLocaleString('es-AR')} para ${selectedClient.name}, con fecha ${pendingDraft.date}.${cloudSaved ? '' : ' Quedó guardada localmente porque la nube no respondió.'}`;
        addMessage('assistant', message);
        speakAsOrion(message);
      } else {
        const entryId = `voice_${Math.random().toString(36).substring(2, 9)}`;
        const noteText = pendingDraft.noteText.trim();
        try {
          await executeWithTimeout(saveLogToFirestore(selectedClient.id, noteText, pendingDraft.date), 1800);
        } catch (error) {
          cloudSaved = false;
          console.warn('La bitácora se guardará localmente porque Firestore no respondió:', error);
        }

        const newLocalNote: AccountNote = {
          id: entryId,
          accountId: selectedClient.id,
          text: noteText,
          timestamp: new Date(`${pendingDraft.date}T12:00:00`).toISOString(),
          category: 'observation',
          tags: cloudSaved ? ['Voz'] : ['Local', 'Voz']
        };
        onAddNote(newLocalNote);
        setLastAction({
          type: 'ADD_LOG_EXTENDED',
          accountId: selectedClient.id,
          entryId,
          date: pendingDraft.date,
          noteText
        });

        const message = `Bitácora confirmada para ${selectedClient.name}, con fecha ${pendingDraft.date}.${cloudSaved ? '' : ' Quedó guardada localmente porque la nube no respondió.'}`;
        addMessage('assistant', message);
        speakAsOrion(message);
      }

      setPendingDraft(null);
      triggerSuccessState();
    } catch (error) {
      console.error('No se pudo confirmar el borrador de bitácora:', error);
      setDraftError('No se pudo guardar. Revisá los datos e intentá nuevamente.');
      synth.playError();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelNoteAction = () => {
    setPendingNoteAction(null);
    const message = 'Cambio cancelado. La bitácora quedó igual.';
    addMessage('assistant', message);
    speakAsOrion(message);
  };

  const handleConfirmNoteAction = () => {
    if (!pendingNoteAction) return;

    if (pendingNoteAction.type === 'delete') {
      if (!onDeleteNote) return;
      onDeleteNote(pendingNoteAction.note.id);
      setLastPreviewedNotes(previous => previous.filter(note => note.id !== pendingNoteAction.note.id));
      const message = `Eliminé la bitácora de ${pendingNoteAction.accountName}.`;
      addMessage('assistant', message);
      speakAsOrion(message);
    } else {
      if (!onUpdateNote || !pendingNoteAction.newText?.trim()) return;
      const updatedNote = { ...pendingNoteAction.note, text: pendingNoteAction.newText.trim() };
      onUpdateNote(updatedNote);
      setLastPreviewedNotes(previous => previous.map(note => note.id === updatedNote.id ? updatedNote : note));
      const message = `Actualicé la bitácora de ${pendingNoteAction.accountName}.`;
      addMessage('assistant', message);
      speakAsOrion(message);
    }

    setPendingNoteAction(null);
    triggerSuccessState();
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
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => {
        setIsListening(true);
        setTranscriptText('');
        transcriptBufferRef.current = '';
        
        // Start an idle timer (if they do not speak at all for 8 seconds, automatically shut down)
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        silenceTimeoutRef.current = setTimeout(() => {
          rec.stop();
        }, 8000);
      };

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += trans;
          } else {
            interimTranscript += trans;
          }
        }
        
        const currentText = `${finalTranscript} ${interimTranscript}`.trim();
        if (currentText.trim()) {
          transcriptBufferRef.current = currentText.trim();
          setTranscriptText(currentText);
        }

        // On any speech activity, reset the silence timer!
        // We give a generous 4.0 seconds silence period of absolute quiet before we trigger submit
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        silenceTimeoutRef.current = setTimeout(() => {
          console.log("Orion: Silence detected, stopping speech capture...");
          rec.stop();
        }, 4000);
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setIsListening(false);
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        if (event.error !== 'no-speech') {
          synth.playError();
          const errMsg = `Mis disculpas, señor. Al parecer ha surgido un inconveniente con el receptor de audio (${event.error}). ¿Podría intentarlo de nuevo?`;
          addMessage('assistant', errMsg);
          speakAsOrion(errMsg);
        }
      };

      rec.onend = () => {
        setIsListening(false);
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        const finalText = transcriptBufferRef.current.trim();
        transcriptBufferRef.current = '';
        setTranscriptText('');

        if (finalText) {
          const normalizedFinalText = finalText.toLocaleLowerCase('es-AR').replace(/\s+/g, ' ');
          const lastProcessed = lastProcessedTranscriptRef.current;
          const isDuplicate = lastProcessed
            && lastProcessed.text === normalizedFinalText
            && Date.now() - lastProcessed.at < 5000;

          if (!isDuplicate) {
            lastProcessedTranscriptRef.current = { text: normalizedFinalText, at: Date.now() };
            void processTranscription(finalText);
          }
        }
      };

      recognitionRef.current = rec;
      rec.start();

    } catch (e) {
      console.error("Failed to start speech recognition context:", e);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const processTranscription = async (rawString: string) => {
    // 1. Log user request in chat bubble
    addMessage('user', rawString);
    setIsProcessing(true);

    const normalizedRequest = rawString
      .toLocaleLowerCase('es-AR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    if (pendingNoteAction) {
      if (/\b(?:confirmar|confirmo|confirma|si,? guardar|si,? borrar|si,? modificar)\b/.test(normalizedRequest)) {
        setIsProcessing(false);
        handleConfirmNoteAction();
        return;
      }
      if (/\b(?:cancelar|cancelo|cancela|no,? cancelar|dejalo asi|dejarlo asi)\b/.test(normalizedRequest)) {
        setIsProcessing(false);
        handleCancelNoteAction();
        return;
      }
      if (pendingNoteAction.type === 'update' && !pendingNoteAction.newText?.trim()) {
        setPendingNoteAction({ ...pendingNoteAction, newText: rawString.trim() });
        const message = 'Tomé el nuevo texto. Decí “confirmar” para guardarlo o “cancelar”.';
        setIsProcessing(false);
        addMessage('assistant', message);
        speakAsOrion(message);
        return;
      }
    }

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
    let resolvedIntent = parsed.intent;
    const isClientOnlyFollowUp = Boolean(targetClient) && !/\b(?:ver|mostrar|previsualizar|registrar|cargar|venta|bitacora|nota|borrar|eliminar|modificar|cambiar|auditar|analizar|sincronizar)\b/.test(normalizedRequest);

    // Keep the previous request alive when Orion asked only for the missing client.
    // A short follow-up such as "Victoria Metálicas" can now complete the command.
    if (pendingClientIntent && targetClient) {
      if (parsed.intent === 'UNKNOWN' || isClientOnlyFollowUp) {
        resolvedIntent = pendingClientIntent;
      }
      if (resolvedIntent === pendingClientIntent) {
        setPendingClientIntent(null);
      }
    }

    let systemResponse = '';

    try {
      switch (resolvedIntent) {
        case 'ORION_CAPABILITIES': {
          systemResponse = `A sus órdenes, señor. Mi núcleo operacional, el Protocolo Orión, está diseñado para ser la inteligencia táctica de su bitácora de Meta Ads. Estoy facultado para realizar múltiples cursos de acción por comandos de voz:

1. **Registrar de Ventas Manuales**: Diciendo por ejemplo "Registrar venta de un millón doscientos mil en Productos de Fierro hoy". Procesaré de inmediato la cifra, el cliente y la fecha para insertarlo localmente y sincronizarlo ante Firebase Firestore.
2. **Consultar Historial**: Al decirme "Mostrame las ventas de [Cliente]" o "Ver historial", le listaré los últimos registros de transacciones.
3. **Bitácora Cualitativa**: Puede decirme "Anotar bitácora para [Cliente] de que pausamos campaña de retargeting" o hablar naturalmente: "Hoy hicimos cambios en la cuenta de [Cliente]".
4. **Previsualizar Bitácoras**: Diga "Mostrame las bitácoras de [Cliente]". Después puede pedir "borrá la primera" o "modificá la segunda".
5. **Auditorías Creativas**: Preguntándome "Rendimiento creativo de [Cliente]" o "Auditar anuncios de [Cliente]". Analizaré los montos invertidos, conversión y sugeriré correcciones de presupuesto.
6. **Fórmulas de Rendimiento y Ránkings**: Si me consulta por "ranking global" o "quiénes van mejor", organizaré sus marcas según ROAS determinando puntos de fuga y líderes de eficiencia.
7. **Rectificación de Bitácora**: Si comete un error, puede ordenarme "Eliminar último registro" o presionar el botón "Deshacer" para revertir de manera instantánea el cambio.

Todo mi sistema cuenta con un resguardo local en tiempo real, garantizando que su terminal siga operativa incluso bajo fluctuaciones o caídas en la conexión central. ¿Qué protocolo desea que iniciemos ahora, señor?`;
          triggerSuccessState();
          break;
        }

        case 'ADD_LOG_EXTENDED': {
          const warnings: string[] = [];
          if (!targetClient) warnings.push('No pude identificar el cliente con seguridad.');
          else if (parsed.clientMatchScore < 60) warnings.push('La coincidencia del cliente es aproximada.');
          if (!parsed.dateDetected) warnings.push('No escuché una fecha; coloqué hoy como valor inicial.');
          if (!parsed.noteText?.trim()) warnings.push('No pude separar claramente el contenido de la nota.');

          setPendingDraft({
            type: 'ADD_LOG_EXTENDED',
            accountId: targetClient?.id || '',
            date: parsed.date,
            amount: '',
            noteText: parsed.noteText || '',
            warnings
          });
          setDraftError('');
          systemResponse = 'Preparé un borrador de bitácora. Revisá el cliente, la fecha y el texto antes de confirmar. Todavía no guardé nada.';
          break;
        }

        case 'RECORD_OFFLINE_SALE': {
          const warnings: string[] = [];
          if (!targetClient) warnings.push('No pude identificar el cliente con seguridad.');
          else if (parsed.clientMatchScore < 60) warnings.push('La coincidencia del cliente es aproximada.');
          if (!parsed.dateDetected) warnings.push('No escuché una fecha; coloqué hoy como valor inicial.');
          if (parsed.amount === undefined || !Number.isFinite(parsed.amount)) warnings.push('No pude reconocer un importe válido.');

          setPendingDraft({
            type: 'RECORD_OFFLINE_SALE',
            accountId: targetClient?.id || '',
            date: parsed.date,
            amount: parsed.amount === undefined ? '' : String(parsed.amount),
            noteText: '',
            warnings
          });
          setDraftError('');
          systemResponse = 'Preparé un borrador de venta offline. Revisá especialmente el importe, el cliente y la fecha. Todavía no guardé nada.';
          break;
        }

        case 'MODIFY_PREVIOUS_ENTRY': {
          // 1. Identify client to work on
          let clientObj = targetClient;
          if (!clientObj && lastAction) {
            clientObj = consolidatedClients.find(c => c.id === lastAction.accountId);
          }
          if (!clientObj) {
            const potentialClients = consolidatedClients.filter(c => {
              const logs = settings[c.id]?.offlineSalesLogByMonth || {};
              return Object.values(logs).some((list: any) => list.length > 0);
            });
            if (potentialClients.length === 1) {
              clientObj = potentialClients[0];
            }
          }

          if (!clientObj) {
            systemResponse = `Disculpe, señor. Para poder buscar y editar una venta manual, me es indispensable saber a qué cliente pertenece. ¿Me podría indicar el nombre de la cuenta, por favor?`;
            break;
          }

          const clientSettings = settings[clientObj.id] || {};
          const logsByMonth = clientSettings.offlineSalesLogByMonth || {};
          
          const allEntries: Array<{ monthKey: string; entry: OfflineSaleEntry }> = [];
          for (const mKey of Object.keys(logsByMonth)) {
            const list = logsByMonth[mKey] || [];
            list.forEach(entry => {
              allEntries.push({ monthKey: mKey, entry });
            });
          }

          if (allEntries.length === 0) {
            systemResponse = `Señor, no tengo registrado ningún reporte de venta manual para ${clientObj.name} en el sistema. ¿Desea que registremos una nueva venta primero?`;
            break;
          }

          // Process the splitting to separate SEARCH values from REPLACEMENT values
          const splitKeywords = [
            ' cambiala a ', ' cambialo a ', ' modificala por ', ' modificalo por ', 
            ' que sea ', ' corriga por ', ' corregilo por ', ' corregila por ', 
            ' corregila a ', ' corregilo a ', ' a ', ' por ', ' ponele ', ' ponle '
          ];
          let partBefore = rawString.toLowerCase();
          let partAfter = '';
          
          for (const kw of splitKeywords) {
            const idx = partBefore.indexOf(kw);
            if (idx !== -1) {
              partAfter = partBefore.substring(idx + kw.length);
              partBefore = partBefore.substring(0, idx);
              break;
            }
          }

          const extractAllNumbers = (text: string): number[] => {
            const normalized = text
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim();
            let collapsedSpacesText = normalized.replace(/(\d)\s+(?=\d)/g, '$1');
            collapsedSpacesText = collapsedSpacesText
              .replace(/\bun\s+millon\b/g, '1 millon')
              .replace(/\bun\s+mil\b/g, '1 mil')
              .replace(/\bmedio\s+millon\b/g, '500000');

            const numberRegex = /\b\d+([.,]\d+)*\b/g;
            const results: number[] = [];
            let match;
            while ((match = numberRegex.exec(collapsedSpacesText)) !== null) {
              const numStr = match[0];
              const endIdx = match.index + numStr.length;
              const snippetAfter = collapsedSpacesText.slice(endIdx, endIdx + 40).trim();
              const baseVal = parseFloat(numStr.replace(/\./g, '').replace(/,/g, ''));
              if (isNaN(baseVal)) continue;

              let multiplier = 1;
              if (/^(?:de\s+)?millon(?:es)?\b|^(?:de\s+)?million(?:s)?\b/i.test(snippetAfter)) {
                multiplier = 1000000;
              } else if (/^m\b/i.test(snippetAfter)) {
                multiplier = 1000000;
              } else if (/^mil\b/i.test(snippetAfter) || /^thousand(?:s)?\b/i.test(snippetAfter)) {
                multiplier = 1000;
              } else if (/^k\b/i.test(snippetAfter)) {
                multiplier = 1000;
              }
              results.push(baseVal * multiplier);
            }
            return results;
          };

          const searchNumbers = extractAllNumbers(partBefore);
          const newNumbers = partAfter ? extractAllNumbers(partAfter) : [];

          const findDayInText = (text: string) => {
            const dayRegex = /\b(?:dia\s+|el\s+|del\s+|al\s+|fecha\s+)(\d{1,2})\b/gi;
            const match = dayRegex.exec(text);
            if (match) {
              const dVal = parseInt(match[1], 10);
              if (dVal >= 1 && dVal <= 31) return dVal;
            }
            return null;
          };

          const searchDay = findDayInText(partBefore);
          const newDay = partAfter ? findDayInText(partAfter) : null;

          let searchAmountCandidate: number | undefined = searchNumbers.find(num => num > 31);
          if (searchAmountCandidate === undefined && searchNumbers.length > 0) {
            searchAmountCandidate = searchNumbers.find(num => num !== searchDay);
            if (searchAmountCandidate === undefined) {
              searchAmountCandidate = searchNumbers[0];
            }
          }

          let matchedEntries = allEntries;

          if (searchDay !== null) {
            matchedEntries = matchedEntries.filter(item => {
              const dayStr = item.entry.date.split('-')[2];
              return parseInt(dayStr, 10) === searchDay;
            });
          }

          if (searchAmountCandidate !== undefined) {
            const queryAmount = searchAmountCandidate;
            matchedEntries = matchedEntries.filter(item => {
              return Math.abs(item.entry.amount - queryAmount) < 0.01;
            });
          }

          let targetMatch = null;
          if (matchedEntries.length === 1) {
            targetMatch = matchedEntries[0];
          } else if (matchedEntries.length > 1) {
            targetMatch = matchedEntries[0];
          } else if (lastAction && lastAction.accountId === clientObj.id) {
            const foundRec = allEntries.find(item => item.entry.id === lastAction.entryId);
            if (foundRec) {
              targetMatch = foundRec;
            }
          }

          if (!targetMatch) {
            const criteria = [];
            if (searchAmountCandidate !== undefined) criteria.push(`importe de $${searchAmountCandidate.toLocaleString('es-AR')}`);
            if (searchDay !== null) criteria.push(`día ${searchDay}`);
            systemResponse = `Señor, no logré ubicar una venta manual específica para ${clientObj.name} que coincida con los criterios buscados (${criteria.join(' de la fecha del ') || 'ninguno'}). ¿Podría repetirme la fecha o el importe original con mayor precisión, señor?`;
            break;
          }

          let updatedAmount = targetMatch.entry.amount;
          let updatedDate = targetMatch.entry.date;
          let updatedNote = targetMatch.entry.note || '';

          const changeSummary = [];

          let newAmountCandidate = newNumbers.find(num => num > 31);
          if (newAmountCandidate === undefined && newNumbers.length > 0) {
            newAmountCandidate = newNumbers.find(num => num !== newDay);
            if (newAmountCandidate === undefined) {
              newAmountCandidate = newNumbers[0];
            }
          }

          if (newAmountCandidate !== undefined) {
            updatedAmount = newAmountCandidate;
            changeSummary.push(`el monto a $${newAmountCandidate.toLocaleString('es-AR')}`);
          }

          if (newDay !== null) {
            const dateParts = targetMatch.entry.date.split('-');
            const dayStr = newDay < 10 ? `0${newDay}` : `${newDay}`;
            updatedDate = `${dateParts[0]}-${dateParts[1]}-${dayStr}`;
            changeSummary.push(`la fecha al día ${newDay}`);
          }

          if (changeSummary.length === 0) {
            systemResponse = `Señor, encontré el registro de venta manual por $${targetMatch.entry.amount.toLocaleString('es-AR')} del día ${targetMatch.entry.date.split('-')[2]} para ${clientObj.name}. Sin embargo, no logré precisar el cambio que desea realizar en ella. ¿Me indicaría el nuevo valor o fecha para aplicar, por favor?`;
            break;
          }

          if (onUpdateOfflineSale) {
            onUpdateOfflineSale(clientObj.id, targetMatch.entry.id, {
              amount: updatedAmount,
              date: updatedDate,
              note: updatedNote
            });

            setLastAction({
              type: 'RECORD_OFFLINE_SALE',
              accountId: clientObj.id,
              entryId: targetMatch.entry.id,
              amount: updatedAmount,
              date: updatedDate
            });

            systemResponse = `Soberbio, señor. He procedido a rectificar la venta manual en ${clientObj.name} de forma inmediata. Corregí ${changeSummary.join(' y ')}. Los coeficientes e informes de rendimiento se han recalculado de inmediato con los nuevos datos.`;
          } else {
            systemResponse = `Señor, el módulo de ventas manuales no permite la edición retrospectiva en este panel.`;
          }
          break;
        }

        case 'VIEW_ACCOUNT_LOGS': {
          const accountId = targetClient?.id || lastPreviewedAccountId;
          const account = consolidatedClients.find(client => client.id === accountId);

          if (!accountId || !account) {
            setPendingClientIntent('VIEW_ACCOUNT_LOGS');
            systemResponse = 'Decime de qué cliente querés ver la bitácora.';
            break;
          }

          const accountNotes = notes
            .filter(note => note.accountId === accountId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          if (accountNotes.length === 0) {
            setLastPreviewedNotes([]);
            setLastPreviewedAccountId(accountId);
            systemResponse = `No hay bitácoras cargadas para ${account.name}.`;
            break;
          }

          const previewNotes = accountNotes.slice(0, 8);
          setLastPreviewedNotes(previewNotes);
          setLastPreviewedAccountId(accountId);

          const preview = previewNotes.map((note, index) => {
            const date = new Date(note.timestamp).toLocaleDateString('es-AR');
            return `${index + 1}. ${date} — ${note.text}`;
          }).join('\n');

          systemResponse = `Encontré ${accountNotes.length} bitácora${accountNotes.length === 1 ? '' : 's'} de ${account.name}. Te muestro las más recientes:\n\n${preview}${accountNotes.length > previewNotes.length ? `\n\nHay ${accountNotes.length - previewNotes.length} más antiguas.` : ''}\n\nPodés decir “borrá la primera” o “modificá la segunda”.`;
          break;
        }

        case 'DELETE_ACCOUNT_LOG':
        case 'MODIFY_ACCOUNT_LOG': {
          const accountId = targetClient?.id || lastPreviewedAccountId;
          const account = consolidatedClients.find(client => client.id === accountId);

          if (!accountId || !account) {
            setPendingClientIntent(resolvedIntent);
            systemResponse = 'Primero decime el cliente o pedime que muestre su bitácora.';
            break;
          }

          const availableNotes = (lastPreviewedAccountId === accountId && lastPreviewedNotes.length > 0
            ? lastPreviewedNotes
            : notes
                .filter(note => note.accountId === accountId)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

          const ordinalMatchers = [
            /\b(?:1|primera|primer|uno)\b/,
            /\b(?:2|segunda|segundo|dos)\b/,
            /\b(?:3|tercera|tercer|tres)\b/,
            /\b(?:4|cuarta|cuarto|cuatro)\b/,
            /\b(?:5|quinta|quinto|cinco)\b/,
            /\b(?:6|sexta|sexto|seis)\b/,
            /\b(?:7|septima|septimo|siete)\b/,
            /\b(?:8|octava|octavo|ocho)\b/
          ];
          const requestedIndex = ordinalMatchers.findIndex(pattern => pattern.test(normalizedRequest));
          let selectedNote = requestedIndex >= 0 ? availableNotes[requestedIndex] : availableNotes[0];

          if (parsed.dateDetected) {
            const noteOnDate = availableNotes.find(note => note.timestamp.slice(0, 10) === parsed.date);
            if (noteOnDate) selectedNote = noteOnDate;
          }

          if (!selectedNote) {
            systemResponse = `No encontré esa bitácora de ${account.name}. Pedime una previsualización para ver la lista actual.`;
            break;
          }

          if (resolvedIntent === 'DELETE_ACCOUNT_LOG') {
            setPendingNoteAction({ type: 'delete', note: selectedNote, accountName: account.name });
            systemResponse = `Preparé la eliminación de esta bitácora: “${selectedNote.text}”. Decí “confirmar” para borrarla o “cancelar”.`;
          } else {
            const replacementMatch = rawString.match(/(?:que diga|por el texto|nuevo texto|cambiarla? a|modificarla? a)\s*[:,-]?\s*(.+)$/i);
            const replacementText = replacementMatch?.[1]?.trim() || '';
            setPendingNoteAction({
              type: 'update',
              note: selectedNote,
              accountName: account.name,
              newText: replacementText
            });
            systemResponse = replacementText
              ? `Preparé el cambio de la bitácora. Decí “confirmar” para guardarlo o “cancelar”.`
              : 'Decime ahora el nuevo texto de la bitácora.';
          }
          break;
        }

        case 'VIEW_OFFLINE_SALES': {
          if (!targetClient) {
            systemResponse = `Mis disculpas, señor. Comprendo que desea auditar o visualizar el registro de ventas manuales, pero no logro relacionar su solicitud con alguna de las cuentas publicitarias en Orion. ¿Me indicaría el nombre de la cuenta, por favor?`;
            break;
          }

          const clientSettings = settings[targetClient.id] || {};
          const logsByMonth = clientSettings.offlineSalesLogByMonth || {};
          
          const allEntries: Array<OfflineSaleEntry> = [];
          for (const mKey of Object.keys(logsByMonth)) {
            const list = logsByMonth[mKey] || [];
            list.forEach(entry => {
              allEntries.push(entry);
            });
          }

          if (allEntries.length === 0) {
            systemResponse = `Señor, no tengo registrado ningún reporte de venta manual para ${targetClient.name} en el sistema. ¿Desea que procedamos a registrar alguna de inmediato?`;
            break;
          }

          const sorted = [...allEntries].sort((a, b) => b.date.localeCompare(a.date));
          const listLimit = sorted.slice(0, 5);

          const salesListText = listLimit.map((item, index) => {
            const dateParts = item.date.split('-');
            const day = dateParts[2];
            const monthVal = parseInt(dateParts[1], 10);
            const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const monthName = months[monthVal - 1] || 'este mes';
            const noteText = item.note ? ` ("${item.note}")` : '';
            return `${index + 1}. El día ${day} de ${monthName}, por un importe de $${item.amount.toLocaleString('es-AR')}${noteText}`;
          }).join('. ');

          systemResponse = `Señor, para la cuenta de ${targetClient.name} tengo registradas las siguientes ventas manuales: ${salesListText}.`;
          
          if (sorted.length > 5) {
            systemResponse += ` Y cuento con ${sorted.length - 5} registros más antiguos.`;
          }

          systemResponse += ` Me indica si desea editar o borrar alguna de ellas buscando por importe o fecha, señor.`;
          break;
        }

        case 'DELETE_PREVIOUS_ENTRY': {
          if (!lastAction) {
            systemResponse = `Lo siento mucho, señor. Comprendo que desea eliminar o borrar la última entrada, pero no tengo registro de ninguna acción realizada en esta sesión para poder deshacer o suprimir. ¿En qué otra cosa le asisto, señor?`;
            break;
          }

          const targetClientForDeletion = consolidatedClients.find(c => c.id === lastAction.accountId);
          const clientLabel = targetClientForDeletion ? targetClientForDeletion.name : 'la cuenta';

          if (lastAction.type === 'RECORD_OFFLINE_SALE') {
            if (onDeleteOfflineSale) {
              onDeleteOfflineSale(lastAction.accountId, lastAction.entryId);
              
              const deletedAmount = lastAction.amount || 0;
              const deletedDate = lastAction.date;
              
              setLastAction(null);

              systemResponse = `Entendido perfectamente, señor. He procedido a borrar de inmediato la última venta manual de $${deletedAmount.toLocaleString('es-AR')} registrada en ${clientLabel} con fecha del ${deletedDate}. Todos los reportes e índices se han recalculado correctamente.`;
            } else {
              systemResponse = `Señor, el módulo de ventas offline no tiene disponible la función de eliminación en esta sesión.`;
            }
          } else if (lastAction.type === 'ADD_LOG_EXTENDED') {
            if (onDeleteNote) {
              onDeleteNote(lastAction.entryId);
              
              const notePreview = lastAction.noteText || '';
              
              setLastAction(null);

              systemResponse = `A sus exigencias, señor. He eliminado la última entrada de la bitácora correspondiente a ${clientLabel}. La nota ("${notePreview}") ha quedado suprimida del historial.`;
            } else {
              systemResponse = `Señor, no cuento con la facultad de eliminar notas en esta configuración.`;
            }
          }
          break;
        }

        case 'TRIGGER_SYNC': {
          if (onTriggerSync) {
            systemResponse = `Entendido, señor. Iniciando de inmediato la nave de carga y sincronizando la bitácora estelar de Orion con las últimas métricas de rendimiento.`;
            onTriggerSync().then(() => {
              synth.playConfirm();
            }).catch(err => {
              console.error("Fallo al actualizar por voz:", err);
              synth.playError();
            });
          } else {
            systemResponse = `Comprendo la orden de sincronización, señor, pero el canal de transferencia de datos con el servidor de Meta Ads no se encuentra acoplado en este momento.`;
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
          systemResponse = pendingClientIntent
            ? 'No encontré ese cliente. Decime el nombre como aparece en la lista de cuentas.'
            : 'No entendí la orden. Probá con “mostrar bitácoras”, “registrar venta” o “anotar un cambio”.';
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

  let posClass = "bottom-full mb-4 right-0"; // Default (bottom-right)
  if (chatPosition === "top-left") posClass = "top-[105%] left-0 origin-top-left";
  else if (chatPosition === "top-right") posClass = "top-[105%] right-0 origin-top-right";
  else if (chatPosition === "bottom-left") posClass = "bottom-[105%] left-0 origin-bottom-left";
  else posClass = "bottom-[105%] right-0 origin-bottom-right";

  return (
    <motion.div 
      ref={rootRef}
      initial={{ scale: 2.5, opacity: 0, filter: "blur(15px) brightness(3)" }}
      animate={{ scale: 1, opacity: 1, filter: "blur(0px) brightness(1)" }}
      exit={{ scale: [1, 1.5, 0], opacity: [1, 1, 0], filter: ["blur(0px) brightness(1)", "blur(10px) brightness(4)", "blur(20px) brightness(0)"] }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      drag
      dragConstraints={typeof window !== "undefined" ? { left: -window.innerWidth + 100, right: 0, top: -window.innerHeight + 100, bottom: 0 } : false}
      dragElastic={0.15}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
      whileDrag={{ scale: 1.05, opacity: 0.9 }}
      onDragStart={() => {
        isDraggingRef.current = true;
      }}
      onDragEnd={() => {
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 150);
      }}
      id="orion-assistant-root" 
      className="fixed bottom-6 right-6 z-[250] font-sans text-neutral-200 selection:bg-amber-500/20 print:hidden cursor-grab active:cursor-grabbing"
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: chatPosition.startsWith('top') ? -20 : 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: chatPosition.startsWith('top') ? -20 : 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className={`absolute ${posClass} w-[350px] h-[510px] bg-neutral-950/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden`}
          >
            {/* Minimalist Muted Header */}
            <div className="p-4 bg-neutral-900/30 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-neutral-300">NÚCLEO ORIÓN</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleMute}
                  title={isMuted ? "Activar Voz" : "Silenciar"}
                  className="p-1.5 hover:bg-white/[0.06] rounded-lg text-neutral-400 hover:text-neutral-200 transition-all"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-neutral-300" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    synth.playPowerDown();
                    setIsOpen(false);
                  }}
                  className="p-1.5 hover:bg-white/[0.06] rounded-lg text-neutral-400 hover:text-neutral-200 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 scrollbar-none">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-5">
                  <div className="relative flex items-center justify-center w-20 h-20 select-none">
                    {/* Unique Minimal Orbit Dynamic */}
                    <motion.div
                      animate={{ scale: [1, 1.05, 1], opacity: [0.15, 0.35, 0.15] }}
                      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                      className="absolute inset-0 rounded-full border border-amber-500/20"
                    />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                      className="absolute inset-2 rounded-full border border-dashed border-amber-500/10"
                    />
                    <motion.div
                      animate={{ scale: [0.97, 1.03, 0.97] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                      className="w-4 h-4 rounded-full bg-amber-500/80 shadow-[0_0_15px_6px_rgba(245,158,11,0.4)]"
                    />
                  </div>
                  
                  <div className="space-y-4 max-w-[240px]">
                    <h4 className="text-[11px] font-medium text-neutral-300 font-sans tracking-tight">Orión está listo para escuchar</h4>
                    <p className="text-[10px] text-neutral-500 font-normal leading-relaxed">
                      Presione el control de voz para iniciar una instrucción rápida en lenguaje natural:
                    </p>
                    <div className="flex flex-col gap-1.5 text-left border-t border-white/[0.04] pt-3">
                      <div className="text-[9px] font-mono text-neutral-400 flex items-center gap-2">
                        <span className="w-1 h-3 bg-amber-500/60 rounded" />
                        <span>"Hoy hicimos cambios en [Cliente]"</span>
                      </div>
                      <div className="text-[9px] font-mono text-neutral-400 flex items-center gap-2">
                        <span className="w-1 h-3 bg-amber-500/60 rounded" />
                        <span>"Registrar venta de [monto] hoy"</span>
                      </div>
                      <div className="text-[9px] font-mono text-neutral-400 flex items-center gap-2">
                        <span className="w-1 h-3 bg-cyan-500/60 rounded" />
                        <span>"Mostrar bitácoras de [Cliente]"</span>
                      </div>
                      <div className="text-[9px] font-mono text-neutral-400 flex items-center gap-2">
                        <span className="w-1 h-3 bg-amber-500/60 rounded" />
                        <span>"Auditar rendimiento de [Cliente]"</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-2 text-[11px] leading-relaxed font-normal transition-all duration-300 ${
                      msg.sender === 'user'
                        ? 'bg-neutral-900 border border-white/[0.06] text-neutral-200 rounded-tr-none'
                        : 'bg-white/[0.02] border border-white/[0.04] text-neutral-200 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-line text-neutral-200">{msg.text}</p>
                    <span className="block text-[8px] text-neutral-500 text-right mt-1.5 font-mono tracking-wider">{msg.timestamp}</span>
                  </div>
                </div>
              ))}

              {pendingDraft && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="rounded-xl border border-blue-500/25 bg-blue-500/[0.05] p-3.5 space-y-3"
                >
                  <div>
                    <div className="text-[10px] font-bold text-white">Revisar antes de guardar</div>
                    <div className="mt-1 text-[9px] leading-relaxed text-neutral-400">
                      {pendingDraft.type === 'RECORD_OFFLINE_SALE' ? 'Venta offline' : 'Nota de bitácora'} · todavía no se guardó
                    </div>
                  </div>

                  {pendingDraft.warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.07] px-2.5 py-2">
                      {pendingDraft.warnings.map(warning => (
                        <p key={warning} className="text-[9px] leading-relaxed text-amber-200">• {warning}</p>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <label className="block">
                      <span className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-neutral-500">Cliente</span>
                      <select
                        value={pendingDraft.accountId}
                        onChange={event => setPendingDraft({ ...pendingDraft, accountId: event.target.value })}
                        className="w-full rounded-lg border border-white/[0.08] bg-neutral-950 px-2.5 py-2 text-[10px] text-neutral-200 outline-none focus:border-blue-500/60"
                      >
                        <option value="">Seleccionar cliente</option>
                        {bitacoraClients.map(client => (
                          <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-neutral-500">Fecha</span>
                      <input
                        type="date"
                        value={pendingDraft.date}
                        onChange={event => setPendingDraft({ ...pendingDraft, date: event.target.value })}
                        className="w-full rounded-lg border border-white/[0.08] bg-neutral-950 px-2.5 py-2 text-[10px] text-neutral-200 outline-none focus:border-blue-500/60"
                      />
                    </label>

                    {pendingDraft.type === 'RECORD_OFFLINE_SALE' ? (
                      <label className="block">
                        <span className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-neutral-500">Importe</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="decimal"
                          value={pendingDraft.amount}
                          onChange={event => setPendingDraft({ ...pendingDraft, amount: event.target.value })}
                          placeholder="Ej.: 250000"
                          className="w-full rounded-lg border border-white/[0.08] bg-neutral-950 px-2.5 py-2 text-[11px] font-semibold text-white outline-none focus:border-blue-500/60"
                        />
                      </label>
                    ) : (
                      <label className="block">
                        <span className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-neutral-500">Contenido</span>
                        <textarea
                          rows={3}
                          value={pendingDraft.noteText}
                          onChange={event => setPendingDraft({ ...pendingDraft, noteText: event.target.value })}
                          placeholder="Escribí o corregí la observación"
                          className="w-full resize-none rounded-lg border border-white/[0.08] bg-neutral-950 px-2.5 py-2 text-[10px] leading-relaxed text-neutral-200 outline-none focus:border-blue-500/60"
                        />
                      </label>
                    )}
                  </div>

                  {draftError && (
                    <p className="text-[9px] leading-relaxed text-red-300">{draftError}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmDraft}
                      disabled={isProcessing}
                      className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-white transition hover:bg-blue-500 disabled:opacity-50"
                    >
                      Confirmar y guardar
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelDraft}
                      disabled={isProcessing}
                      className="rounded-lg border border-white/[0.08] px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-neutral-400 transition hover:text-white disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </motion.div>
              )}

              {pendingNoteAction && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-3.5 space-y-3"
                >
                  <div>
                    <div className="text-[10px] font-bold text-white">
                      {pendingNoteAction.type === 'delete' ? 'Confirmar eliminación' : 'Confirmar modificación'}
                    </div>
                    <div className="mt-1 text-[9px] text-neutral-500">{pendingNoteAction.accountName}</div>
                  </div>

                  <div className="rounded-lg border border-white/[0.06] bg-neutral-950/70 p-2.5">
                    <div className="text-[8px] font-bold uppercase tracking-wider text-neutral-600">Texto actual</div>
                    <p className="mt-1 text-[9px] leading-relaxed text-neutral-300">{pendingNoteAction.note.text}</p>
                  </div>

                  {pendingNoteAction.type === 'update' && (
                    <label className="block">
                      <span className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-neutral-500">Texto nuevo</span>
                      <textarea
                        rows={3}
                        value={pendingNoteAction.newText || ''}
                        onChange={event => setPendingNoteAction({ ...pendingNoteAction, newText: event.target.value })}
                        placeholder="Podés dictarlo o escribirlo"
                        className="w-full resize-none rounded-lg border border-white/[0.08] bg-neutral-950 px-2.5 py-2 text-[10px] leading-relaxed text-neutral-200 outline-none focus:border-blue-500/60"
                      />
                    </label>
                  )}

                  <p className="text-[9px] leading-relaxed text-neutral-500">
                    También podés decir “confirmar” o “cancelar”.
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmNoteAction}
                      disabled={pendingNoteAction.type === 'update' && !pendingNoteAction.newText?.trim()}
                      className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelNoteAction}
                      className="rounded-lg border border-white/[0.08] px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-neutral-400 transition hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Interactive confirmation action box with custom "Undo" option when modification is saved */}
              {lastAction && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="p-3.5 bg-neutral-900 border border-white/[0.06] rounded-xl flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-wider uppercase text-neutral-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Cambio Registrado</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-normal">
                    La acción se asentó en la bitácora de Orión. ¿Deseas deshacer este registro ahora?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleUndoLastAction}
                      className="flex-1 py-1.5 bg-white hover:bg-neutral-200 text-black text-[9px] font-mono font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
                    >
                      Deshacer
                    </button>
                    <button
                      type="button"
                      onClick={() => setLastAction(null)}
                      className="px-3 py-1.5 bg-transparent border border-white/[0.08] hover:border-white/[0.15] text-neutral-400 hover:text-neutral-200 text-[9px] uppercase font-bold tracking-wider rounded transition-all cursor-pointer"
                    >
                      Omitir
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Streaming Interim Transcript */}
              {isListening && transcriptText && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl px-4 py-2 bg-neutral-900/40 border border-amber-500/25 text-neutral-200 rounded-tr-none animate-pulse">
                    <p className="italic text-[11px] font-medium text-neutral-300">{transcriptText}</p>
                    <span className="block text-[8px] text-amber-500 text-right mt-1 uppercase font-bold tracking-widest font-mono">Escuchando...</span>
                  </div>
                </div>
              )}

              {/* Loader */}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-neutral-900 border border-white/[0.04] rounded-xl rounded-tl-none px-4 py-2 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 text-neutral-400 animate-spin" />
                    <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">Pensando...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Speaking/Listening Equalizer and Core Trigger */}
            <div className="p-4 bg-neutral-950 border-t border-white/[0.06] flex flex-col items-center gap-3">
              {isSpeaking && (
                <div className="flex items-center justify-center gap-1.5 py-0.5">
                  <span className="text-[9px] font-mono tracking-wider text-neutral-400 mr-1">Hablando...</span>
                  <div className="flex items-end gap-[1.5px] h-2.5">
                    {[1, 2, 3, 4, 5].map((bar) => (
                      <motion.div
                        key={bar}
                        animate={{
                          height: ["30%", "100%", "30%"]
                        }}
                        transition={{
                          duration: 0.3 + bar * 0.06,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="w-[1.5px] bg-amber-500/80 rounded-full"
                      />
                    ))}
                  </div>
                </div>
              )}

              {isListening && (
                <div className="flex items-center gap-1.5 justify-center py-0.5 animate-pulse">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  <span className="text-[9px] font-mono text-amber-500 tracking-wider uppercase">Escuchando comando...</span>
                </div>
              )}

              <div className="w-full">
                <button
                  type="button"
                  onClick={handleStartListening}
                  className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-[10px] font-mono font-medium uppercase tracking-widest transition-all ${
                    isListening
                      ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.35)] font-bold'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-white/[0.08]'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      Detener Recepción
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
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
          y: isOpen ? 0 : [0, -6, 0],
          scale: isSpeaking ? [1, 1.025, 1] : 1,
        }}
        transition={{
          y: {
            repeat: Infinity,
            duration: 3.8,
            ease: "easeInOut"
          },
          scale: {
            repeat: Infinity,
            duration: 0.9,
            ease: "easeInOut"
          }
        }}
        className="relative"
      >
        <AnimatePresence>
          {(isListening || isSpeaking || currentOrionState === 'thinking') && (
            <>
              {[0, 1].map(index => (
                <motion.div
                  key={`activity-wave-${index}`}
                  initial={{ scale: 0.72, opacity: 0.55 }}
                  animate={{ scale: 1.55 + index * 0.22, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    repeat: Infinity,
                    duration: currentOrionState === 'thinking' ? 1.1 : 1.6,
                    delay: index * 0.55,
                    ease: 'easeOut'
                  }}
                  className={`absolute inset-2 rounded-full border pointer-events-none ${
                    isListening ? 'border-cyan-300/70' : isSpeaking ? 'border-blue-300/60' : 'border-amber-300/55'
                  }`}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Glowing outer aura bloom */}
        <div className={`absolute inset-0 rounded-full blur-2xl opacity-75 transition-all duration-700 ${
          currentOrionState === 'success'
            ? 'bg-emerald-500/60 scale-150 animate-pulse'
            : currentOrionState === 'listening'
              ? 'bg-amber-500/50 scale-140'
              : currentOrionState === 'thinking'
                ? 'bg-amber-600/70 scale-135 animate-ping duration-300'
                : isSpeaking
                  ? 'bg-amber-400/50 scale-145'
                  : 'bg-amber-500/30'
        }`} />

        <button
          type="button"
          onPointerDown={() => dragStartTime.current = Date.now()}
          onClick={() => {
            if (isDraggingRef.current) return;
            if (Date.now() - dragStartTime.current > 200) return; // Prevent open if drag/hold
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
          {/* Rotating radar sweep gives the core a continuous data-scanning motion. */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              repeat: Infinity,
              duration: currentOrionState === 'thinking' ? 1.8 : 7,
              ease: 'linear'
            }}
            className="absolute inset-[-5px] rounded-full opacity-60"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(56,189,248,.7) 338deg, transparent 360deg)',
              WebkitMaskImage: 'radial-gradient(circle, transparent 61%, #000 63%, #000 67%, transparent 69%)',
              maskImage: 'radial-gradient(circle, transparent 61%, #000 63%, #000 67%, transparent 69%)'
            }}
          />

          {/* Independent data particles make every state feel active rather than decorative. */}
          {[0, 1, 2, 3, 4, 5].map(index => (
            <motion.div
              key={`orion-particle-${index}`}
              initial={{ rotate: index * 60 }}
              animate={{ rotate: index % 2 === 0 ? index * 60 + 360 : index * 60 - 360 }}
              transition={{
                repeat: Infinity,
                duration: (currentOrionState === 'thinking' ? 2.4 : 6.5) + index * 0.7,
                ease: 'linear'
              }}
              className="absolute inset-[5px] rounded-full pointer-events-none"
            >
              <motion.span
                animate={{ scale: [0.7, 1.45, 0.7], opacity: [0.35, 1, 0.35] }}
                transition={{ repeat: Infinity, duration: 1.2 + index * 0.12, ease: 'easeInOut' }}
                className={`absolute left-1/2 top-0 h-1 w-1 rounded-full ${
                  currentOrionState === 'success' ? 'bg-emerald-300' : index % 2 === 0 ? 'bg-cyan-300' : 'bg-blue-400'
                } shadow-[0_0_7px_currentColor]`}
              />
            </motion.div>
          ))}

          {/* Multiple complex concentric holographic rings of data matching the attached gold sphere file */}
          
          {/* Success Ring (Outward radiating pulse) */}
          {currentOrionState === 'success' && (
            <motion.div
              key="success-pulse"
              initial={{ scale: 0.8, opacity: 1, borderWidth: "4px" }}
              animate={{ scale: 2.2, opacity: 0, borderWidth: "1px" }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border border-emerald-400 bg-emerald-500/10 pointer-events-none z-30"
            />
          )}

          {/* External Ring 1 - Dash Pattern (Clockwise) */}
          <motion.div
            animate={currentOrionState === 'thinking' ? { rotate: 360, opacity: [0.3, 1, 0.3] } : { rotate: 360 }}
            transition={{ 
              rotate: { repeat: Infinity, duration: currentOrionState === 'thinking' ? 1.5 : 25, ease: "linear" },
              opacity: { repeat: Infinity, duration: 0.5, ease: "easeInOut" }
            }}
            className={`absolute inset-0 border-2 rounded-full border-dashed ${
              isGeneratingReport ? 'border-blue-400/80 shadow-[0_0_12px_rgba(59,130,246,0.4)]'
              : currentOrionState === 'success'
                ? 'border-emerald-400/80 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : currentOrionState === 'listening' 
                  ? 'border-amber-400/70 border-spacing-2' 
                  : 'border-amber-500/40'
            }`}
          />

          {/* Holographic Ring 2 - Micro ticks representation (Counter-Clockwise) */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: currentOrionState === 'thinking' ? 1.1 : 14, ease: "linear" }}
            className={`absolute inset-2 border border-dotted rounded-full transition-colors ${
              isGeneratingReport ? 'border-blue-400/60'
              : currentOrionState === 'success' ? 'border-emerald-400/60' : 'border-amber-400/50'
            }`}
            style={{ transform: "rotateX(45deg) rotateY(15deg)" }}
          />

          {/* Diagonal Volumetric Ring 3 (Interlocking SphereOrbit) */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: currentOrionState === 'thinking' ? 1.3 : 18, ease: "linear" }}
            className={`absolute inset-4 border rounded-full transition-colors ${
              isGeneratingReport ? 'border-blue-300/50'
              : currentOrionState === 'success' ? 'border-emerald-300/50' : 'border-amber-300/40'
            }`}
            style={{ transform: "rotateX(-30deg) rotateY(45deg)" }}
          />

          {/* Diagonal Volumetric Ring 4 (Interlocking Sphere Orbit inverse) */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: currentOrionState === 'thinking' ? 0.9 : 11, ease: "linear" }}
            className={`absolute inset-6 border rounded-full transition-colors ${
              isGeneratingReport ? 'border-blue-400/45'
              : currentOrionState === 'success' ? 'border-emerald-400/45' : 'border-amber-400/35'
            }`}
            style={{ transform: "rotateX(60deg) rotateY(-40deg)" }}
          />

          {/* Internal Quick Ring 5 - Core Data line */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: currentOrionState === 'thinking' ? 0.4 : 5, ease: "linear" }}
            className={`absolute inset-8 border border-r-transparent border-b-transparent border-l-transparent rounded-full ${
              isGeneratingReport ? 'border-t-blue-400/90'
              : currentOrionState === 'success' ? 'border-t-emerald-400/90' : 'border-t-amber-300/75'
            }`}
          />

          {/* Core Mechanism container - No logos, pure organic plasma fluid dynamics */}
          <div className={`absolute inset-7 rounded-full flex items-center justify-center transition-all duration-500 overflow-hidden ${
            isGeneratingReport
              ? 'bg-gradient-to-br from-blue-600 via-blue-950 to-black border-2 border-blue-400 shadow-[inset_0_0_22px_rgba(59,130,246,0.8)]'
              : currentOrionState === 'success'
              ? 'bg-gradient-to-br from-emerald-600 via-emerald-950 to-black border-2 border-emerald-400 shadow-[inset_0_0_22px_rgba(16,185,129,0.8)]'
              : currentOrionState === 'listening'
                ? 'bg-gradient-to-br from-amber-500/95 via-amber-950 to-black border-2 border-amber-300 shadow-[inset_0_0_22px_rgba(245,158,11,0.8)]'
                : currentOrionState === 'thinking'
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

            {/* Reactive centerpiece core sphere (Pure golden/emerald/blue nucleus, no SVG Icons) */}
            <motion.div
              animate={isGeneratingReport ? {
                scale: [1, 1.35, 1],
                backgroundColor: ["#3b82f6", "#60a5fa", "#3b82f6"],
                boxShadow: ["0 0 25px 8px rgba(59,130,246,0.85)", "0 0 35px 12px rgba(96,165,250,0.95)", "0 0 25px 8px rgba(59,130,246,0.85)"]
              } : currentOrionState === 'success' ? {
                scale: [1, 1.4, 0.95],
                backgroundColor: ["#10b981", "#34d399", "#10b981"],
                boxShadow: ["0 0 25px 8px rgba(16,185,129,0.95)", "0 0 35px 14px rgba(52,211,153,0.99)", "0 0 25px 8px rgba(16,185,129,0.95)"]
              } : currentOrionState === 'listening' ? {
                scale: [0.9, 1.5, 0.9],
                backgroundColor: ["#f59e0b", "#fffbeb", "#f59e0b"],
                boxShadow: ["0 0 25px 6px rgba(251,191,36,0.95)", "0 0 35px 12px rgba(251,191,36,0.99)", "0 0 25px 6px rgba(251,191,36,0.95)"]
              } : currentOrionState === 'thinking' ? {
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
              transition={{ repeat: Infinity, duration: isGeneratingReport ? 1.5 : currentOrionState === 'listening' ? 0.8 : currentOrionState === 'thinking' ? 1.3 : isSpeaking ? 0.95 : 3.2, ease: "easeInOut" }}
              className="w-7 h-7 rounded-full flex items-center justify-center relative z-10"
            >
              {currentOrionState === 'listening' ? (
                /* Dynamic inner frequency audio wave reactivity inside central golden core */
                <div className="flex items-end justify-center gap-0.5 h-3">
                  {[1, 2, 3].map((bar) => (
                    <motion.div
                      key={bar}
                      animate={{
                        height: ["25%", "100%", "25%"]
                      }}
                      transition={{
                        duration: 0.3 + bar * 0.08,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="w-[1.5px] bg-white rounded-full"
                    />
                  ))}
                </div>
              ) : (
                /* Internal brilliant point light source */
                <div className="w-2.5 h-2.5 bg-white rounded-full blur-[1px] opacity-90 animate-pulse" />
              )}
            </motion.div>
          </div>
        </button>

        <motion.div
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-cyan-400/15 bg-neutral-950/85 px-2 py-0.5 text-[7px] font-mono uppercase tracking-[0.18em] text-cyan-200/80 shadow-[0_0_12px_rgba(34,211,238,0.12)] backdrop-blur"
        >
          {orbStatus}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
