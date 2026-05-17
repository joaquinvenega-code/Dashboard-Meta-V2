import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { bitacoraStorage, adObservationsStorage } from './orionModules';

const router = Router();

// El API Key se maneja de forma segura en el servidor
const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.Orion_Dashboard;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no configurada');
  }
  return new GoogleGenerativeAI(apiKey);
};

router.post('/generate-report', async (req: Request, res: Response) => {
  const { clientId, metaMetrics } = req.body;

  try {
    // 1. Extraer contexto manual ingresado en los nuevos módulos
    const clientLogs = bitacoraStorage.filter(log => log.clientId === clientId);
    const clientObservations = Object.values(adObservationsStorage).filter(obs => obs.clientId === clientId);

    // 2. Construir prompt inyectando la bitácora y la performance de creativos
    const prompt = `
      Actuá como un Director de Growth especializado en Performance Marketing. Analizá los siguientes datos de la cuenta para generar un informe estratégico mensual para el cliente.
      
      Idioma: Castellano de Argentina (voseo, tono profesional pero directo y cercano, sin sonar corporativo estructurado).
      
      MÉTRICAS CORE DE META ADS:
      ${JSON.stringify(metaMetrics, null, 2)}
      
      BITÁCORA DE GESTIÓN OPERATIVA REALIZADA EN EL MES:
      ${clientLogs.map(l => `-[${l.date}] (${l.category}): ${l.description}`).join('\n')}
      
      ANÁLISIS DE CREATIVOS GANADORES CON NOTAS DEL CONSULTOR:
      ${clientObservations.map(o => `- Ad ID: ${o.adId} | Métrica: ${o.metricLabel} (${o.metricValue}) | Observación Técnica: ${o.observation}`).join('\n')}
      
      REQUISITOS DEL REPORTE:
      1. No repitas los números de forma aburrida. Cruzá los datos de Meta con las acciones de la bitácora para justificar caídas, subas o testeos.
      2. Da contexto estratégico basado en las observaciones de los creativos ganadores (TOFU/MOFU/BOFU).
      3. Planteá los pasos a seguir claros basados en el análisis.
    `;

    const ai = getAI();
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    res.json({ success: true, report: responseText });
  } catch (error: any) {
    console.error('Error procesando el reporte con Gemini:', error);
    res.status(500).json({ success: false, error: 'Error procesando el reporte con Gemini V18' });
  }
});

export { router as aiReportRouter };
