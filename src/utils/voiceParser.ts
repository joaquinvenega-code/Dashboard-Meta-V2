import { format, subDays, setDate, setMonth, subMonths } from 'date-fns';

export interface ParsedVoiceCommand {
  intent: 'ADD_LOG_EXTENDED' | 'RECORD_OFFLINE_SALE' | 'CREATIVE_PERFORMANCE' | 'PERFORMANCE_RANKING' | 'UNKNOWN' | 'MODIFY_PREVIOUS_ENTRY' | 'DELETE_PREVIOUS_ENTRY' | 'VIEW_OFFLINE_SALES';
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
    const isPastMonth = normalized.includes('mes pasado') || normalized.includes('mes anterior');
    
    // We scan for all 1-2 digit numbers that could represent a calendar day (1 to 31)
    const dayRegex = /\b\d{1,2}\b/g;
    let match;
    
    interface DayCandidate {
      day: number;
      score: number;
    }
    const candidatesDay: DayCandidate[] = [];

    while ((match = dayRegex.exec(normalized)) !== null) {
      const parsedDayNum = parseInt(match[0], 10);
      if (parsedDayNum >= 1 && parsedDayNum <= 31) {
        const index = match.index;
        const numStr = match[0];
        
        let score = 0;
        
        // 25 characters context window before and after
        const contextBefore = normalized.slice(Math.max(0, index - 25), index);
        const contextAfter = normalized.slice(index + numStr.length, Math.min(normalized.length, index + numStr.length + 25));
        
        const charBefore = index > 0 ? normalized[index - 1] : '';
        const charAfter = index + numStr.length < normalized.length ? normalized[index + numStr.length] : '';
        
        // Positives - Before
        if (/\bdia\s*$/i.test(contextBefore) || /\bfecha\s*$/i.test(contextBefore)) {
          score += 55;
        } else if (/\b(?:el|del|al)\s*$/i.test(contextBefore)) {
          score += 35;
        } else if (/\bde\s*$/i.test(contextBefore) && !/\b(?:valor|monto|monto\s+de|valor\s+de)\s+de\s*$/i.test(contextBefore)) {
          score += 20;
        }
        
        if (/\bdia\b/i.test(contextBefore.slice(-15))) {
          score += 30;
        }
        if (/\bfecha\b/i.test(contextBefore.slice(-15))) {
          score += 30;
        }
        if (/\bmes\b/i.test(contextBefore.slice(-15))) {
          score += 20;
        }

        // Positives - After
        if (/^\s*de\s+(?:este\s+)?mes\b/i.test(contextAfter)) {
          score += 55;
        } else if (/^\s*de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i.test(contextAfter)) {
          score += 55;
        } else if (/^\s*del\s+mes\b/i.test(contextAfter)) {
          score += 55;
        } else if (/^\s*del\s+corriente\b/i.test(contextAfter)) {
          score += 45;
        } else if (/^\s*de\s+este\b/i.test(contextAfter)) {
          score += 30;
        }

        // Penalties - Context indicating currency or amounts
        if (/[\$\s]*$/i.test(contextBefore) && (contextBefore.trim().endsWith('$') || /\b(?:pesos|dolares|usd|ars|valor|monto|importe)\b/i.test(contextBefore.slice(-12)))) {
          score -= 90;
        }
        if (/\b(?:valor\s+de|monto\s+de|por|un\s+valor\s+de|importe\s+de)\s+\$?$/i.test(contextBefore)) {
          score -= 90;
        }
        if (/^[\.,]\d{3}/.test(contextAfter)) {
          score -= 100;
        }
        if (/^\s*(?:mil|millones|millon|k|m)\b/i.test(contextAfter)) {
          score -= 100;
        }
        if (/^[\.,]\d+/.test(contextAfter)) {
          score -= 60;
        }
        if (charBefore === ',' || charBefore === '.' || charAfter === ',' || charAfter === '.') {
          score -= 95;
        }

        candidatesDay.push({ day: parsedDayNum, score });
      }
    }

    // Select candidate with the highest score
    if (candidatesDay.length > 0) {
      candidatesDay.sort((a, b) => b.score - a.score);
      const bestCandidate = candidatesDay[0];
      
      if (bestCandidate.score >= 5 || (candidatesDay.length === 1 && bestCandidate.score > -20)) {
        if (isPastMonth) {
          docDate = subMonths(new Date(), 1);
        } else {
          docDate = new Date();
        }
        docDate = setDate(docDate, bestCandidate.day);
        dateDetected = true;
      }
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
  const saleKeywords = ['venta', 'ventas', 'registrar venta', 'monto', 'offline sale', 'vender', 'vendi', 'venda'];
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

  // E. MODIFY_PREVIOUS_ENTRY
  const modificationKeywords = [
    'modifica', 'modificar', 'cambiale', 'cambiarle', 'ponele', 'ponle', 'corregir', 'corrije', 'corrige', 
    'correccion', 'rectificar', 'rectifica', 'modifiques'
  ];
  const isModification = modificationKeywords.some(kw => normalized.includes(kw));

  // F. DELETE_PREVIOUS_ENTRY
  const deleteKeywords = [
    'borra', 'borrar', 'elimina', 'eliminar', 'cancela', 'cancelar', 'deshace', 'deshacer', 'quitar', 'quita'
  ];
  const isDelete = deleteKeywords.some(kw => normalized.includes(kw));

  // G. VIEW_OFFLINE_SALES
  const viewKeywords = [
    'ver', 'mostrar', 'mostrame', 'decime', 'menciona', 'mencioname', 'listar', 'lista', 'cuales tiene', 'que tiene', 'consulta', 'consultar', 'historial'
  ];
  const isView = viewKeywords.some(kw => normalized.includes(kw));

  // Determine intent based on keywords and priorities (Delete and Modification dominate if detected)
  if (isDelete) {
    intent = 'DELETE_PREVIOUS_ENTRY';
  } else if (isModification) {
    intent = 'MODIFY_PREVIOUS_ENTRY';
  } else if (isSale && isView) {
    intent = 'VIEW_OFFLINE_SALES';
  } else if (isSale) {
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
  if (intent === 'RECORD_OFFLINE_SALE' || intent === 'MODIFY_PREVIOUS_ENTRY') {
    // Robustly extract amounts, even if transcribed with spaces (e.g. "1 600 000" or "45 000")
    // or traditional symbols ("$1.600.000", "45,000")
    
    // Step A: Collapse space-separated numbers that look like thousands separation.
    // Replace spaces that occur between digits, e.g. "1 600 000" -> "1600000"
    // To do this safely, we find any space character that has digits on both sides
    let collapsedSpacesText = normalized.replace(/(\d)\s+(?=\d)/g, '$1');

    // Replace common written word numbers representing isolated multipliers
    collapsedSpacesText = collapsedSpacesText
      .replace(/\bun\s+millon\b/g, '1 millon')
      .replace(/\bun\s+mil\b/g, '1 mil')
      .replace(/\bmedio\s+millon\b/g, '500000');

    // Step B: Extract numbers while scanning for adjacent verbal multipliers (millones, mil, k, m, etc.)
    const numberRegex = /\b\d+([.,]\d+)*\b/g;
    const candidates: Array<{ original: string; val: number; hasMultiplier: boolean }> = [];
    let numMatch;

    while ((numMatch = numberRegex.exec(collapsedSpacesText)) !== null) {
      const numStr = numMatch[0];
      const startIdx = numMatch.index;
      const endIdx = startIdx + numStr.length;

      // Snip the text directly following this matched number for multiplier words
      const snippetAfter = collapsedSpacesText.slice(endIdx, endIdx + 40).trim();

      const baseVal = parseFloat(numStr.replace(/\./g, '').replace(/,/g, ''));
      if (isNaN(baseVal)) continue;

      let multiplier = 1;
      let hasMultiplier = false;

      // Checking for millions, mil (thousands), and standard suffixes
      if (/^(?:de\s+)?millon(?:es)?\b|^(?:de\s+)?million(?:s)?\b/i.test(snippetAfter)) {
        multiplier = 1000000;
        hasMultiplier = true;
      } else if (/^m\b/i.test(snippetAfter)) {
        multiplier = 1000000;
        hasMultiplier = true;
      } else if (/^mil\b/i.test(snippetAfter) || /^thousand(?:s)?\b/i.test(snippetAfter)) {
        multiplier = 1000;
        hasMultiplier = true;
      } else if (/^k\b/i.test(snippetAfter)) {
        multiplier = 1000;
        hasMultiplier = true;
      }

      candidates.push({
        original: numStr,
        val: baseVal * multiplier,
        hasMultiplier
      });
    }

    if (candidates.length > 0) {
      // Find the best candidate: prefer those with multiplier words OR those greater than 31
      let bestCandidate = candidates[0];
      if (candidates.length > 1) {
        // Filters out the day number if we matched a candidate that represents an actual sale amount
        const filtered = candidates.filter(c => c.val > 31 || c.hasMultiplier);
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
