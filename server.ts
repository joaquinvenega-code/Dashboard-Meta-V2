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
  app.post('/api/generate-ai-v3', async (req, res) => {
    console.log('[API V3] POST request received');
    const { metrics, notes, monthName, type = 'full' } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      return res.status(500).json({ 
        error: 'Llave de Gemini no encontrada. Verifica en Settings > Secrets.' 
      });
    }

    if (!metrics) {
      return res.status(400).json({ error: 'Faltan métricas en el cuerpo de la petición' });
    }
    
    try {
      const genAI = new GoogleGenAI({ apiKey }); 
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const roas = metrics.revenue / (metrics.spend || 1);
      const cpa = metrics.spend / (metrics.purchases || metrics.messages || 1);
      
      let prompt = '';
      if (type === 'metrics') {
        prompt = `Analizá como experto en Meta Ads el mes de ${monthName}. Inversión: ${metrics.spend}, Facturación: ${metrics.revenue}, ROAS: ×${roas.toFixed(2)}. Escribí un párrafo breve (80 palabras) analítico. Castellano Argentina.`;
      } else {
        const notesContext = notes && notes.length > 0 
          ? notes.map((n: any) => `- ${n.text}`).join('\n')
          : 'Sin notas.';
        prompt = `Generá un resumen ejecutivo para ${monthName}. Métricas: ROAS: ${roas.toFixed(2)}, Inversión: ${metrics.spend}. Bitácora: ${notesContext}. Máximo 180 palabras. Tono profesional. Castellano Argentina.`;
      }

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      res.json({ text });
    } catch (error: any) {
      console.error('[API V3] Gemini Error:', error);
      res.status(500).json({ error: `Error de Gemini: ${error.message}` });
    }
  });

  // Alias para depuración
  app.get('/api/generate-ai-v3', (req, res) => {
    res.json({ message: 'Esta ruta solo acepta POST. Si ves esto en el navegador, la ruta está activa pero la llamada debe ser POST.' });
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
