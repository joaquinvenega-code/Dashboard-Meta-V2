import { Router, Request, Response } from 'express';
import { BitacoraLog, AdObservation } from '../types/orion';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

const router = Router();

// Initialize Google Cloud TTS Client if credentials exist
let ttsClient: TextToSpeechClient | null = null;

try {
  if (process.env.GOOGLE_CLOUD_TTS_CREDENTIALS_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_CLOUD_TTS_CREDENTIALS_JSON);
    ttsClient = new TextToSpeechClient({ credentials });
    console.log('[Orion System] Google Cloud TTS Client Initialized successfully.');
  }
} catch (e) {
  console.error('[Orion System] Error parsing GOOGLE_CLOUD_TTS_CREDENTIALS_JSON. Ensure it is valid JSON.', e);
}

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

// --- Google Cloud TTS Endpoint ---
router.post('/tts-google', async (req: Request, res: Response) => {
  const { text, voiceName } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  if (!ttsClient && process.env.GOOGLE_CLOUD_TTS_CREDENTIALS_JSON) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_CLOUD_TTS_CREDENTIALS_JSON);
      ttsClient = new TextToSpeechClient({ credentials });
      console.log('[Orion System] Google Cloud TTS Client Lazy Initialized.');
    } catch (e) {
      console.error('[Orion System] Error parsing GOOGLE_CLOUD_TTS_CREDENTIALS_JSON.', e);
    }
  }

  if (!ttsClient) {
    return res.status(503).json({ error: 'Google Cloud TTS is not configured on the server. Please set GOOGLE_CLOUD_TTS_CREDENTIALS_JSON.' });
  }

  try {
    const defaultVoice = 'es-419-Neural2-C';
    const selectedVoice = voiceName || defaultVoice;
    // Extract language code from voice name (e.g. "es-419" from "es-419-Neural2-C")
    const match = selectedVoice.match(/^([a-z]{2}-[A-Za-z0-9]+)-/);
    const languageCode = match ? match[1] : 'es-419';

    const input = { text };
    const voice = {
      languageCode,
      name: selectedVoice,
    };
    const audioConfig = {
      audioEncoding: 'MP3' as const,
      speakingRate: 1.05, // Ligeramente acelerado para mayor agilidad
      pitch: 0.0,
    };

    const [response] = await ttsClient.synthesizeSpeech({
      input,
      voice,
      audioConfig,
    });

    if (response.audioContent) {
      res.setHeader('Content-Type', 'audio/mpeg');
      return res.send(Buffer.from(response.audioContent));
    } else {
      throw new Error('No audio content received from Google Cloud TTS');
    }
  } catch (error: any) {
    console.error('[Orion System] TTS Synthesis Error:', error);
    return res.status(500).json({ error: error.message || 'Error generating TTS' });
  }
});

export { router as orionModulesRouter, bitacoraStorage, adObservationsStorage };
