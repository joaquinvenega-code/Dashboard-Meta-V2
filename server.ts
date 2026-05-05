import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Full CORS and logging
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    console.log(`[SERVER] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Rutas de la Aplicación
  app.all('/generate-ai-orchestrator', async (req, res) => {
    console.log(`[ORCHESTRATOR] Request received: ${req.method}`);
    
    // El frontend mandará POST, pero aceptamos todo para evitar el 405
    if (req.method === 'OPTIONS') return res.sendStatus(200);

    const data = req.method === 'POST' ? req.body : req.query;
    const { metrics, notes, monthName, type = 'full' } = data;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      return res.status(500).json({ 
        error: 'Llave de Gemini no válida. Verifica en Settings.' 
      });
    }

    if (!metrics) {
      return res.status(400).json({ error: 'Faltan los datos de métricas' });
    }
    
    try {
      const genAI = new GoogleGenAI({ apiKey }); 
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const roas = metrics.revenue / (metrics.spend || 1);
      
      let prompt = '';
      if (type === 'metrics') {
        prompt = `Actuá como analista Senior de Meta Ads. Hacé una lectura crítica y breve del mes de ${monthName} basándote SOLO en estos números:
        - Inversión: ${metrics.spend}
        - Facturación: ${metrics.revenue}
        - ROAS: ×${roas.toFixed(2)}
        - CTR: ${metrics.ctr ? metrics.ctr.toFixed(2) : 'N/A'}%
        - Clics: ${metrics.clicks}

        Escribí UN SOLO párrafo (max 80 palabras) con tono profesional. Sé directo. Sin negritas ni markdown. Castellano de Argentina.`;
      } else {
        const notesContext = notes && notes.length > 0 
          ? notes.map((n: any) => `- ${n.text}`).join('\n')
          : 'No hay registros en la bitácora.';

        prompt = `Actuá como Director de Estrategia Digital. Generá un resumen ejecutivo integral del mes de ${monthName}.
        
        MÉTRICAS:
        - Inversión: ${metrics.spend}
        - Facturación: ${metrics.revenue}
        - ROAS: ×${roas.toFixed(2)}
        
        BITÁCORA DE ACCIONES:
        ${notesContext}
        
        ESTRUCTURA DEL RESUMEN:
        1. Resumen de resultados.
        2. Impacto de las acciones de la bitácora.
        3. 1 consejo estratégico a futuro.

        REQUISITOS: Max 180 palabras. Tono ejecutivo. Sin negritas. Castellano de Argentina. Solo texto plano con saltos de línea.`;
      }

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      res.json({ text });
    } catch (error: any) {
      console.error('[ORCHESTRATOR] Error:', error);
      res.status(500).json({ error: `Error de IA: ${error.message}` });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'online', 
      time: new Date().toISOString(), 
      hasKey: !!process.env.GEMINI_API_KEY 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
  });
}

startServer();
