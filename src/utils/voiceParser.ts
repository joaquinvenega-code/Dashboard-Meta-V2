import { format, subDays } from 'date-fns';

export interface ParsedVoiceCommand {
  intent: 'ADD_LOG_EXTENDED' | 'RECORD_OFFLINE_SALE' | 'CREATIVE_PERFORMANCE' | 'PERFORMANCE_RANKING' | 'UNKNOWN';
  clientName?: string;
  date: string; // YYYY-MM-DD
  amount?: number;
  noteText?: string;
  raw: string;
}

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD') // Matches accents
    .replace(/[\u0300-\u036f]/g, '') // Removes accent marks
    .trim();
}

export function parseAdvancedVoiceCommand(
  rawText: string,
  availableClients: { id: string; name: string }[]
): ParsedVoiceCommand {
  const normalized = normalizeText(rawText);
  let intent: ParsedVoiceCommand['intent'] = 'UNKNOWN';
  let matchedClientName: string | undefined = undefined;
  let clientNameInCommand: string | undefined = undefined;

  // 1. Calculate relative dates ("hoy", "ayer", "antes de ayer" or "anteayer")
  let dateStr = format(new Date(), 'yyyy-MM-dd');
  if (normalized.includes('antes de ayer') || normalized.includes('anteayer')) {
    dateStr = format(subDays(new Date(), 2), 'yyyy-MM-dd');
  } else if (normalized.includes('ayer')) {
    dateStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  } else if (normalized.includes('hoy')) {
    dateStr = format(new Date(), 'yyyy-MM-dd');
  }

  // 2. Identify client match
  // Sort availableClients by name length descending to prevent partial match issues (e.g. "Nike Premium" before "Nike")
  const sortedClients = [...availableClients].sort((a, b) => b.name.length - a.name.length);
  for (const client of sortedClients) {
    const normClient = normalizeText(client.name);
    if (normalized.includes(normClient)) {
      matchedClientName = client.name;
      clientNameInCommand = normClient;
      break;
    }
  }

  // 3. Match Intents
  // A. RECORD_OFFLINE_SALE
  // Keywords: venta, registrar venta, venta offline, offline sale
  const saleKeywords = ['venta', 'ventas', 'registrar venta', 'monto', 'offline sale', 'vender'];
  const isSale = saleKeywords.some(kw => normalized.includes(kw));

  // B. ADD_LOG_EXTENDED
  // Keywords: bitacora, nota, comentario, registrar bitacora, agregar bitacora, anotar
  const logKeywords = ['bitacora', 'nota', 'comentario', 'anotar', 'registrar bitacora', 'agregar bitacora', 'bitacoras'];
  const isLog = logKeywords.some(kw => normalized.includes(kw));

  // C. CREATIVE_PERFORMANCE
  // Keywords: rendimiento de creativos, rendimiento de anuncios, creativos, anuncios, anuncio, creatividad
  const creativeKeywords = ['creativo', 'creativos', 'anuncio', 'anuncios', 'creatividad', 'rendimiento de creativos', 'rendimiento de anuncios'];
  const isCreative = creativeKeywords.some(kw => normalized.includes(kw));

  // D. PERFORMANCE_RANKING
  // Keywords: ranking, mejores cuentas, peores cuentas, mejoraron, empeoraron, analisis global, ranking de rendimiento
  const rankingKeywords = ['ranking', 'mejores', 'peores', 'mejoraron', 'empeoraron', 'rendimiento global', 'como vamos'];
  const isRanking = rankingKeywords.some(kw => normalized.includes(kw));

  // Determine intent based on keywords and priorities
  if (isSale) {
    intent = 'RECORD_OFFLINE_SALE';
  } else if (isLog) {
    intent = 'ADD_LOG_EXTENDED';
  } else if (isCreative) {
    intent = 'CREATIVE_PERFORMANCE';
  } else if (isRanking) {
    intent = 'PERFORMANCE_RANKING';
  }

  let amount: number | undefined = undefined;
  let noteText: string | undefined = undefined;

  // 4. Parameter Extraction
  if (intent === 'RECORD_OFFLINE_SALE') {
    // Extract a numeric value. Handled with regex, replacing possible dot thousand separators, keeping numbers.
    // e.g. "registrar venta de 50.000" -> 50000
    // Try to match numbers representing currency or amounts.
    const numberMatches = normalized.match(/\b\d+([.,]\d+)?\b/g);
    if (numberMatches) {
      // Find the first match that is likely the price/sum
      // Remove dots that might be thousand separators or commas for decimals
      const cleanedMatch = numberMatches[0].replace(/\./g, '').replace(/,/g, '.');
      amount = parseFloat(cleanedMatch);
    }
  } else if (intent === 'ADD_LOG_EXTENDED') {
    // Extract text of the note. For example after "que diga" or "nota para [cliente]"
    // E.g. "agregar nota para Nike que diga se optimizaron las audiencias"
    // We clean the text by removing introductory trigger fragments.
    let cleanText = rawText;
    const phrasesToStrip = [
      /agregar bitacora para/gi,
      /guardar bitacora para/gi,
      /registrar bitacora para/gi,
      /anotar bitacora para/gi,
      /agregar nota para/gi,
      /guardar nota para/gi,
      /registrar nota para/gi,
      /anotar nota para/gi,
      /que diga/gi,
      /diciendo/gi,
      /sobre/gi,
      /ayer/gi,
      /hoy/gi,
      /antes de ayer/gi,
      /anteayer/gi,
    ];

    // Also strip client name if matched
    if (matchedClientName) {
      const clientEscaped = matchedClientName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      phrasesToStrip.push(new RegExp(clientEscaped, 'gi'));
    }

    phrasesToStrip.forEach(regex => {
      cleanText = cleanText.replace(regex, '');
    });

    // Remove double spaces, dashes, or colons from start/end
    noteText = cleanText.replace(/^[:\s\-–—]+/g, '').replace(/[:\s\-–—]+$/g, '').trim();
    if (!noteText) {
      noteText = rawText; // Fallback
    }
  }

  return {
    intent,
    clientName: matchedClientName,
    date: dateStr,
    amount,
    noteText,
    raw: rawText
  };
}
