import { format, subDays, setDate, setMonth, subMonths } from 'date-fns';

export interface ParsedVoiceCommand {
  intent: 'ADD_LOG_EXTENDED' | 'RECORD_OFFLINE_SALE' | 'CREATIVE_PERFORMANCE' | 'PERFORMANCE_RANKING' | 'TRIGGER_SYNC' | 'UNKNOWN' | 'MODIFY_PREVIOUS_ENTRY' | 'DELETE_PREVIOUS_ENTRY' | 'VIEW_OFFLINE_SALES' | 'ORION_CAPABILITIES';
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

  // Sync / Refresh keywords
  const syncKeywords = [
    'sincronizar', 'actualizar', 'refrescar', 'sincroniza', 'actualiza', 'refresca', 'recargar', 'recarga', 'sync'
  ];
  const isSync = syncKeywords.some(kw => normalized.includes(kw));

  // Capabilities & Help keywords
  const capabilitiesKeywords = [
    'capacidad', 'capacidades', 'acciones', 'ayudarme', 'ayuda', 'ayudame', 'potencial', 'funcionas', 'funciona', 'podes hacer', 'puedes hacer', 'quien sos', 'que sos', 'que haces', 'como andas', 'instrucciones', 'comandos', 'que se puede', 'que podemos'
  ];
  const isCapabilities = capabilitiesKeywords.some(kw => normalized.includes(kw));

  // Determine intent based on keywords and priorities (Capabilities and specific intents should dominate over general Sync keywords)
  if (isCapabilities) {
    intent = 'ORION_CAPABILITIES';
  } else if (isDelete) {
    intent = 'DELETE_PREVIOUS_ENTRY';
  } else if (isModification) {
    intent = 'MODIFY_PREVIOUS_ENTRY';
  } else if (isLog) {
    intent = 'ADD_LOG_EXTENDED';
  } else if (isSale && isView) {
    intent = 'VIEW_OFFLINE_SALES';
  } else if (isSale) {
    intent = 'RECORD_OFFLINE_SALE';
  } else if (isSync) {
    intent = 'TRIGGER_SYNC';
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
    
    // First, convert Spanish written words for numbers into digit representations
    let preprocessedText = normalized;

    // Convert common Spanish multipliers and idioms
    preprocessedText = preprocessedText
      .replace(/\bmedio\s+millon\b/g, '500000')
      .replace(/\b1\s+millon\s+y\s+medio\b/g, '1500000')
      .replace(/\bun\s+millon\s+y\s+medio\b/g, '1500000');

    // Hundreds
    preprocessedText = preprocessedText
      .replace(/\bdoscientos\b/g, '200')
      .replace(/\btrescientos\b/g, '300')
      .replace(/\bcuatrocientos\b/g, '400')
      .replace(/\bquinientos\b/g, '500')
      .replace(/\bseiscientos\b/g, '600')
      .replace(/\bsetecientos\b/g, '700')
      .replace(/\bochocientos\b/g, '800')
      .replace(/\bnovecientos\b/g, '900')
      .replace(/\bciento\b/g, '100')
      .replace(/\bcien\b/g, '100');

    // Tens
    preprocessedText = preprocessedText
      .replace(/\bnoventa\b/g, '90')
      .replace(/\bochenta\b/g, '80')
      .replace(/\bsetenta\b/g, '70')
      .replace(/\bsesenta\b/g, '60')
      .replace(/\bcincuenta\b/g, '50')
      .replace(/\bcuarenta\b/g, '40')
      .replace(/\btreinta\b/g, '30')
      .replace(/\bveinte\b/g, '20')
      .replace(/\bveintiun\b/g, '21')
      .replace(/\bveintiuno\b/g, '21')
      .replace(/\bveintidos\b/g, '22')
      .replace(/\bveintitres\b/g, '23')
      .replace(/\bveinticuatro\b/g, '24')
      .replace(/\bveinticinco\b/g, '25')
      .replace(/\bveintiseis\b/g, '26')
      .replace(/\bveintisiete\b/g, '27')
      .replace(/\bveintiocho\b/g, '28')
      .replace(/\bveintinueve\b/g, '29')
      .replace(/\bdiez\b/g, '10')
      .replace(/\bonce\b/g, '11')
      .replace(/\bdoce\b/g, '12')
      .replace(/\btrece\b/g, '13')
      .replace(/\bcatorce\b/g, '14')
      .replace(/\bquince\b/g, '15')
      .replace(/\bdieciseis\b/g, '16')
      .replace(/\bdiecisiete\b/g, '17')
      .replace(/\bdieciocho\b/g, '18')
      .replace(/\bdiecinueve\b/g, '19');

    // Single digits
    preprocessedText = preprocessedText
      .replace(/\bun\b/g, '1')
      .replace(/\buno\b/g, '1')
      .replace(/\buna\b/g, '1')
      .replace(/\bdos\b/g, '2')
      .replace(/\btres\b/g, '3')
      .replace(/\bcuatro\b/g, '4')
      .replace(/\bcinco\b/g, '5')
      .replace(/\bseis\b/g, '6')
      .replace(/\bsiete\b/g, '7')
      .replace(/\bocho\b/g, '8')
      .replace(/\bnueve\b/g, '9');

    // Join tens & units (e.g. "30 y 5" -> "35")
    preprocessedText = preprocessedText.replace(/\b(\d0)\s+y\s+(\d)\b/g, (_, p1, p2) => String(Number(p1) + Number(p2)));

    // Collapse space-separated numbers that look like thousands separation (e.g. "1 200 000" -> "1200000")
    let collapsedSpacesText = preprocessedText.replace(/(\d)\s+(?=\d)/g, '$1');

    // Replace written-word helpers
    collapsedSpacesText = collapsedSpacesText
      .replace(/\bun\s+millon\b/g, '1 millon')
      .replace(/\bun\s+mil\b/g, '1 mil');

    // Extract candidates tracking position & multiplier indices
    const numberRegex = /\b\d+([.,]\d+)*\b/g;
    interface Candidate {
      original: string;
      val: number;
      hasMultiplier: boolean;
      startIdx: number;
      endIdx: number;
      endIdxWithMultiplier: number;
    }
    const candidates: Candidate[] = [];
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
      let multiplierLength = 0;

      // Check for millions, mil, and standard suffixes match
      const multMatch = /^\s*(?:(?:de\s+)?millon(?:es)?\b|(?:de\s+)?million(?:s)?\b|m\b|mil\b|thousand(?:s)?\b|k\b)/i.exec(collapsedSpacesText.slice(endIdx));
      
      if (multMatch) {
        const multWord = multMatch[0];
        multiplierLength = multMatch.index + multWord.length;
        hasMultiplier = true;
        
        const normalizedMult = multWord.toLowerCase();
        if (normalizedMult.includes('millon') || normalizedMult.includes('million') || normalizedMult.trim() === 'm') {
          multiplier = 1000000;
        } else if (normalizedMult.includes('mil') || normalizedMult.includes('thousand') || normalizedMult.trim() === 'k') {
          multiplier = 1000;
        }
      }

      candidates.push({
        original: numStr,
        val: baseVal * multiplier,
        hasMultiplier,
        startIdx,
        endIdx,
        endIdxWithMultiplier: endIdx + multiplierLength
      });
    }

    // Pass: Merge adjacent candidate numbers to reconstruct complex composite numbers (e.g., "1 millon 200,000")
    let mergedCandidates = [...candidates];
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < mergedCandidates.length - 1; i++) {
        const c1 = mergedCandidates[i];
        const c2 = mergedCandidates[i + 1];
        
        const gap = collapsedSpacesText.slice(c1.endIdxWithMultiplier, c2.startIdx).trim();
        // Allow gap to be empty, or 'y', or 'con', or a comma
        if (gap === "" || gap === "y" || gap === "con" || gap === ",") {
          let canMerge = false;
          
          // Rule A: Millions + anything smaller than a million
          if (c1.val >= 1000000 && c1.val % 1000000 === 0 && c2.val < 1000000) {
            canMerge = true;
          }
          // Rule B: Thousands + anything smaller than a thousand
          else if (c1.val >= 1000 && c1.val % 1000 === 0 && c2.val < 1000) {
            canMerge = true;
          }
          // Rule C: Tens + Units (just in case they were parsed separately)
          else if (c1.val >= 10 && c1.val < 100 && c1.val % 10 === 0 && c2.val < 10) {
            canMerge = true;
          }
          
          if (canMerge) {
            const mergedVal = c1.val + c2.val;
            const newCandidate: Candidate = {
              original: c1.original + " " + gap + " " + c2.original,
              val: mergedVal,
              hasMultiplier: c1.hasMultiplier || c2.hasMultiplier,
              startIdx: c1.startIdx,
              endIdx: c2.endIdx,
              endIdxWithMultiplier: c2.endIdxWithMultiplier
            };
            
            mergedCandidates.splice(i, 2, newCandidate);
            changed = true;
            break; 
          }
        }
      }
    }

    if (mergedCandidates.length > 0) {
      // Find the best candidate: prefer those with multiplier words OR those greater than 31
      let bestCandidate = mergedCandidates[0];
      if (mergedCandidates.length > 1) {
        const filtered = mergedCandidates.filter(c => c.val > 31 || c.hasMultiplier);
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
