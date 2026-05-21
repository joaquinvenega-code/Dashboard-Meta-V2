import { format, subDays } from 'date-fns';

export interface ParsedVoiceCommand {
  intent: 'ADD_LOG_EXTENDED' | 'RECORD_OFFLINE_SALE' | 'CREATIVE_PERFORMANCE' | 'PERFORMANCE_RANKING' | 'UNKNOWN';
  clientName?: string;
  clientId?: string;
  date: string; // YYYY-MM-DD
  amount?: number;
  noteText?: string;
  raw: string;
}

export interface AvailableClient {
  id: string;
  name: string;
  customName?: string;
}

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD') // Matches accents
    .replace(/[\u0300-\u036f]/g, '') // Removes accent marks
    .trim();
}

/**
 * Removes advertising account names noise words like "cuenta", "publicitaria", "ads"
 * to extract the pure business/client name.
 */
export function cleanAccountName(name: string): string {
  const norm = normalizeText(name);
  const cleaned = norm
    .replace(/\b(cuenta|publicitaria|ads|advertising|digital|campana|campanas|business|bm|feed|facebook|marketing|oficial|official|arg|cl|co|mx|ars|usd|grupo|agencia)\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ') // Replace punctuation/symbols with space
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned;
}

export function parseAdvancedVoiceCommand(
  rawText: string,
  availableClients: AvailableClient[]
): ParsedVoiceCommand {
  const normalized = normalizeText(rawText);
  let intent: ParsedVoiceCommand['intent'] = 'UNKNOWN';
  let matchedClientName: string | undefined = undefined;

  // 1. Calculate relative dates ("hoy", "ayer", "antes de ayer" or "anteayer")
  let dateStr = format(new Date(), 'yyyy-MM-dd');
  if (normalized.includes('antes de ayer') || normalized.includes('anteayer')) {
    dateStr = format(subDays(new Date(), 2), 'yyyy-MM-dd');
  } else if (normalized.includes('ayer')) {
    dateStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  } else if (normalized.includes('hoy')) {
    dateStr = format(new Date(), 'yyyy-MM-dd');
  }

  // 2. Identify client match with scoring
  let bestScore = 0;
  let bestClient: AvailableClient | undefined = undefined;

  for (const client of availableClients) {
    let score = 0;
    const rawNorm = normalizeText(client.name);
    const customNorm = client.customName ? normalizeText(client.customName) : '';
    
    const rawClean = cleanAccountName(client.name);
    const customClean = client.customName ? cleanAccountName(client.customName) : '';

    // Check full customName match (Score: 100)
    if (customNorm && (normalized.includes(customNorm) || customNorm.includes(normalized))) {
      score = Math.max(score, 100);
    }
    // Check clean customName match (Score: 95)
    if (customClean && customClean.length >= 2 && (normalized.includes(customClean) || customClean.includes(normalized))) {
      score = Math.max(score, 95);
    }
    // Check clean rawName match (Score: 90)
    if (rawClean && rawClean.length >= 2 && (normalized.includes(rawClean) || rawClean.includes(normalized))) {
      score = Math.max(score, 90);
    }
    // Check full rawName match (Score: 80)
    if (rawNorm && (normalized.includes(rawNorm) || rawNorm.includes(normalized))) {
      score = Math.max(score, 80);
    }

    // Token intersection matching
    const queryTokens = normalized.split(/[^a-z0-9]+/).filter(w => w.length >= 2);
    const clientTokens = rawClean.split(/[^a-z0-9]+/).filter(w => w.length >= 2);
    const customTokens = customClean.split(/[^a-z0-9]+/).filter(w => w.length >= 2);

    const clientIntersection = clientTokens.filter(t => normalized.includes(t) || queryTokens.includes(t)).length;
    const customIntersection = customTokens.filter(t => normalized.includes(t) || queryTokens.includes(t)).length;

    if (clientTokens.length > 0 && clientIntersection > 0) {
      const ratio = clientIntersection / clientTokens.length;
      score = Math.max(score, Math.round(ratio * 85));
    }
    if (customTokens.length > 0 && customIntersection > 0) {
      const ratio = customIntersection / customTokens.length;
      score = Math.max(score, Math.round(ratio * 95));
    }

    if (score > bestScore) {
      bestScore = score;
      bestClient = client;
    }
  }

  // Minimum threshold score of 20 to prevent completely random matches
  if (bestScore >= 20 && bestClient) {
    matchedClientName = bestClient.name;
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
      const cleanedMatch = numberMatches[0].replace(/\./g, '').replace(/,/g, '.');
      amount = parseFloat(cleanedMatch);
    }
  } else if (intent === 'ADD_LOG_EXTENDED') {
    // Extract text of the note. For example after "que diga" or "nota para [cliente]"
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

    if (bestClient && bestClient.customName) {
      const customEscaped = bestClient.customName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      phrasesToStrip.push(new RegExp(customEscaped, 'gi'));
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
    clientId: bestClient?.id,
    date: dateStr,
    amount,
    noteText,
    raw: rawText
  };
}
