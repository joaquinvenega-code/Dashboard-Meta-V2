import { format, subDays, setDate, setMonth, subMonths } from 'date-fns';

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

  // 1. Calculate relative or custom dates in Spanish
  // Default to today
  let docDate = new Date();
  let dateDetected = false;

  // Detect relative indicators:
  if (normalized.includes('antes de ayer') || normalized.includes('anteayer')) {
    docDate = subDays(new Date(), 2);
    dateDetected = true;
  } else if (normalized.includes('ayer')) {
    docDate = subDays(new Date(), 1);
    dateDetected = true;
  } else if (normalized.includes('hoy')) {
    docDate = new Date();
    dateDetected = true;
  }

  // If no relative day detected yet, check for explicit days:
  if (!dateDetected) {
    // Regex for: "dia 18 de este mes", "dia 18", "el 18 de este mes", "el 18", "el dia 18"
    // Also "dia 18 del mes pasado" or "18 del mes pasado"
    const isPastMonth = normalized.includes('mes pasado') || normalized.includes('mes anterior');
    
    // Look for numbers of 1 or 2 digits representing a calendar day (1 to 31)
    // Matches expressions like 'el dia 18', 'el 18', 'dia 18', 'fecha 18', 'el dia de 18'
    const dayRegex = /\b(?:el\s+)?(?:dia\s+)?(?:de\s+)?(\d{1,2})\b/gi;
    let match;
    let fallbackDay: number | null = null;

    // Scan the speech text for candidates
    while ((match = dayRegex.exec(normalized)) !== null) {
      const parsedDayNum = parseInt(match[1], 10);
      if (parsedDayNum >= 1 && parsedDayNum <= 31) {
        // Filter out matches that represent huge dollar amounts matched by mistake by keeping only those related to date context or near 'dia', 'de este mes', or end of string
        const index = match.index;
        const surroundingText = normalized.substring(Math.max(0, index - 20), Math.min(normalized.length, index + 35));
        
        const hasDateKeyword = /dia|mes|fecha|fecha de|ayer|hoy|el/gi.test(surroundingText);
        // If it seems to be part of an amount (e.g. "1 600 000" or "$18"), let's not misinterpret it as a day
        const isPartOfAmount = /peso|dolar|[\$\d\s]{5,}/gi.test(surroundingText) && !surroundingText.includes('mes') && !surroundingText.includes('dia');

        if (hasDateKeyword && !isPartOfAmount) {
          fallbackDay = parsedDayNum;
          break;
        }
      }
    }

    if (fallbackDay !== null) {
      if (isPastMonth) {
        docDate = subMonths(new Date(), 1);
      } else {
        docDate = new Date();
      }
      docDate = setDate(docDate, fallbackDay);
      dateDetected = true;
    }
  }

  // Format final date
  const dateStr = format(docDate, 'yyyy-MM-dd');

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
  const saleKeywords = ['venta', 'ventas', 'registrar venta', 'monto', 'offline sale', 'vender', 'vendi'];
  const isSale = saleKeywords.some(kw => normalized.includes(kw));

  // B. ADD_LOG_EXTENDED
  const logKeywords = ['bitacora', 'nota', 'comentario', 'anotar', 'registrar bitacora', 'agregar bitacora', 'bitacoras'];
  const isLog = logKeywords.some(kw => normalized.includes(kw));

  // C. CREATIVE_PERFORMANCE
  const creativeKeywords = ['creativo', 'creativos', 'anuncio', 'anuncios', 'creatividad', 'rendimiento de creativos', 'rendimiento de anuncios'];
  const isCreative = creativeKeywords.some(kw => normalized.includes(kw));

  // D. PERFORMANCE_RANKING
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
    // Robustly extract amounts, even if transcribed with spaces (e.g. "1 600 000" or "45 000")
    // or traditional symbols ("$1.600.000", "45,000")
    
    // Step A: Collapse space-separated numbers that look like thousands separation.
    // Replace spaces that occur between digits, e.g. "1 600 000" -> "1600000"
    // To do this safely, we find any space character that has digits on both sides
    const collapsedSpacesText = normalized.replace(/(\d)\s+(?=\d)/g, '$1');

    // Step B: Match standard formatted numbers (e.g. "1600000", "45000", "50.000", "12,50")
    // Avoid capturing single digit days when larger numbers are available
    const numberMatches = collapsedSpacesText.match(/\b\d+([.,]\d+)*\b/g);
    if (numberMatches) {
      // Find the best candidate: usually the largest number represents the financial sale amount,
      // and smaller numbers (1 to 31) might be calendar days.
      const candidates = numberMatches.map(numStr => {
        const cleanedStr = numStr.replace(/\./g, '').replace(/,/g, '');
        return {
          original: numStr,
          val: parseFloat(cleanedStr)
        };
      }).filter(c => !isNaN(c.val));

      // Prefer candidate that is NOT a calendar day mentioned (such as 18) unless it is the only number.
      let bestCandidate = candidates[0];
      if (candidates.length > 1) {
        // Filters out the day number if we matched it before
        const filtered = candidates.filter(c => c.val > 31);
        if (filtered.length > 0) {
          bestCandidate = filtered[0];
        }
      }

      if (bestCandidate) {
        amount = bestCandidate.val;
      }
    }
  } else if (intent === 'ADD_LOG_EXTENDED') {
    // Extract text of the note.
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
