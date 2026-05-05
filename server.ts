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
  app.all('/api/v2/ai-summary', async (req, res) => {
    console.log(`[API V2] Request: ${req.method} ${req.url}`);
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    // Aceptar tanto POST como GET (para debug) pero avisar en el prompt si no hay body
    const isPost = req.method === 'POST';
    const body = isPost ? req.body : {};
    const { metrics, notes, monthName, type = 'full' } = body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      return res.status(500).json({ 
        error: 'Llave de Gemini no encontrada. Agrégala en Settings > Secrets con el nombre GEMINI_API_KEY.' 
      });
    }

    if (!metrics && isPost) {
      return res.status(400).json({ error: 'Faltan métricas en la solicitud' });
    }

    try {
      const genAI = new GoogleGenAI({ apiKey }); 
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const roas = metrics ? metrics.revenue / (metrics.spend || 1) : 0;
      const cpa = metrics ? metrics.spend / (metrics.purchases || metrics.messages || 1) : 0;
      
      let prompt = '';

      if (type === 'metrics') {
        prompt = `
          Sos un analista experto en Meta Ads. Hacé una lectura crítica y profesional del rendimiento del mes de ${monthName}.
          
          MÉTRICAS:
          - Inversión: ${metrics.spend}
          - Facturación: ${metrics.revenue}
          - ROAS: ×${roas.toFixed(2)}
          - CTR: ${metrics.ctr ? metrics.ctr.toFixed(2) : 'N/A'}%
          
          TAREA:
          Escribí un párrafo breve (80 palabras) analizando estos números. Sé directo y objetivo. 
          No uses negritas ni markdown. Castellano de Argentina.
        `;
      } else {
        const notesContext = notes && notes.length > 0 
          ? notes.map((n: any) => `- [${(n.timestamp || '').split('T')[0] || 'S/F'}] ${n.text}`).join('\n')
          : 'No hay notas registradas.';

        prompt = `
          Sos un Director de Estrategia Digital. Generá un resumen integral para el cliente sobre ${monthName}.
          
          DATOS DUROS:
          - Inversión: ${metrics.spend}
          - Facturación: ${metrics.revenue}
          - ROAS: ×${roas.toFixed(2)}
          - CPA: ${cpa.toFixed(2)}
          
          BITÁCORA DE ACCIONES:
          ${notesContext}
          
          ESTRUCTURA:
          1. Rendimiento: Análisis de los KPIs principales.
          2. Valor Agregado: Relacionar las acciones de la bitácora con los resultados.
          3. Siguiente Nivel: 1 o 2 consejos estratégicos.
          
          REQUISITOS:
          Máximo 180 palabras. Tono ejecutivo. Sin negritas. Castellano de Argentina. Solo texto plano.
        `;
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      res.json({ text });
    } catch (error: any) {
      console.error('[SERVER] Gemini Error:', error);
      res.status(500).json({ error: `Error de Gemini: ${error.message}` });
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
