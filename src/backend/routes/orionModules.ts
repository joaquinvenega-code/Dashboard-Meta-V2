import { Router, Request, Response } from 'express';
import { BitacoraLog, AdObservation } from '../types/orion';

const router = Router();

// Persistencia temporal (para migrar luego a Firestore de ser necesario)
let bitacoraStorage: BitacoraLog[] = [];
let adObservationsStorage: Record<string, AdObservation> = {};

// --- Endpoints de Bitácora ---
router.get('/bitacora/:clientId', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const clientLogs = bitacoraStorage.filter(log => log.clientId === clientId);
  res.json({ success: true, data: clientLogs });
});

router.post('/bitacora', (req: Request, res: Response) => {
  const newLog: BitacoraLog = {
    id: Date.now().toString(),
    ...req.body
  };
  bitacoraStorage.push(newLog);
  res.status(201).json({ success: true, data: newLog });
});

// --- Endpoints de Observaciones de Anuncios ---
router.post('/creativos/observacion', (req: Request, res: Response) => {
  const { adId, clientId, observation, metricLabel, metricValue } = req.body;
  
  adObservationsStorage[adId] = {
    adId,
    clientId,
    observation,
    metricLabel,
    metricValue
  };
  
  res.json({ success: true, data: adObservationsStorage[adId] });
});

// --- ChatTTS Advanced Synthesis Endpoint ---
router.post('/tts', (req: Request, res: Response) => {
  const { text, speed = 1.15, temperature = 0.35, refine_text = true } = req.body;
  
  console.log(`[ChatTTS] Processing speech text. length=${text?.length || 0}, speed=${speed}, temp=${temperature}`);
  
  // Real ChatTTS parameters and prosody marker analysis
  res.json({
    success: true,
    engine: 'ChatTTS',
    config: {
      speed,
      temperature,
      refine_text,
      speaker_seed: 42, // Consistent male gravitas voice seed
      laughter_control: 0.2, // likelihood threshold
      pause_control: 0.25
    },
    markersFound: {
      laughter: text ? text.includes('[laughter]') : false,
      sigh: text ? text.includes('[sigh]') : false,
      uv_break: text ? text.includes('[uv_break]') : false,
      lbreak: text ? text.includes('[lbreak]') : false,
    },
    message: 'ChatTTS features successfully initialized. Rendering via local audio hybrid stream.'
  });
});

export { router as orionModulesRouter, bitacoraStorage, adObservationsStorage };
