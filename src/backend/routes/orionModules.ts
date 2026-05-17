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

export { router as orionModulesRouter, bitacoraStorage, adObservationsStorage };
