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
  app.post('/orchestrator-summary-v1', async (req, res) => {
    console.log(`[ORCHESTRATOR] Solicitud recibida: ${req.method} ${req.url}`);
    const { metrics, notes, monthName } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      console.error('[API] Error: Missing GEMINI_API_KEY');
      return res.status(500).json({ 
        error: 'Llave de Gemini no encontrada. Agrégala en Settings > Secrets con el nombre GEMINI_API_KEY.' 
      });
    }

    try {
      const genAI = new GoogleGenAI({ apiKey }); 
      // @ts-ignore
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const roas = metrics.revenue / (metrics.spend || 1);
      const cpa = metrics.spend / (metrics.purchases || metrics.messages || 1);
      
      const notesContext = notes && notes.length > 0 
        ? notes.map((n: any) => `- [${(n.timestamp || '').split('T')[0] || 'S/F'}] ${n.text}`).join('\n')
        : 'No hay notas registradas para este período.';

      const prompt = `
        Generá un resumen ejecutivo profesional para un cliente sobre el rendimiento de sus campañas de ${monthName}.
        
        MÉTRICAS CLAVE:
        - Inversión: ${metrics.spend}
        - Facturación: ${metrics.revenue}
        - ROAS: ×${roas.toFixed(2)}
        - CPA/CPR: ${cpa.toFixed(2)}
        - CTR: ${metrics.ctr ? metrics.ctr.toFixed(2) : 'N/A'}%
        - Clics: ${metrics.clicks}
        
        BITÁCORA DE TRABAJO:
        ${notesContext}
        
        ESTRUCTURA DEL RESUMEN:
        1. Intro: Resumen breve del trabajo realizado.
        2. Análisis: Comentar brevemente ROAS, Facturación y CPA.
        3. Próximos pasos: Sugerencias concretas.
        
        REQUISITOS:
        - Tono: Profesional y directo.
        - Idioma: Castellano (Argentina).
        - Extensión: Máximo 150 palabras.
        - Formato: Solo texto plano con saltos de línea (sin negritas ni markdown).
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('[ORCHESTRATOR] Resumen generado con éxito');
      res.json({ text });
    } catch (error: any) {
      console.error('[ORCHESTRATOR] Error de Gemini:', error);
      res.status(500).json({ error: `Error de Gemini: ${error.message}` });
    }
  });

  app.get('/server-status', (req, res) => {
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
