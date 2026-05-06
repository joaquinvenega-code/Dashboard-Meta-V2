import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Habilitamos CORS para evitar bloqueos del navegador
  app.use(cors());

  // Logging para depuración en la consola de AI Studio
  app.use((req, res, next) => {
    console.log(`[V16] ${req.method} ${req.url}`);
    next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- API ENGINE V16 (ULTRA COMPATIBLE) ---
  // Usamos app.use para que coincida incluso con variaciones de path
  app.use('/api/v16-engine', async (req, res) => {
    // Manejo manual de CORS por si el middleware falla
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
    
    if (req.method === 'OPTIONS') return res.sendStatus(204);

    console.log(`[V16-HIT] Method: ${req.method}, Path: ${req.url}`);

    try {
      // Extraemos datos de donde sea (body o query)
      const data = { ...req.query, ...req.body };
      let { metrics, notes, monthName, type = 'metrics' } = data;

      // Parseo defensivo
      if (typeof metrics === 'string') try { metrics = JSON.parse(metrics); } catch(e) {}
      if (typeof notes === 'string') try { notes = JSON.parse(notes); } catch(e) {}

      const apiKey = process.env.GEMINI_API_KEY;
      
      // Respuesta de test rápido si no hay métricas
      if (!metrics && req.method === 'GET') {
        return res.json({ 
          status: 'ready', 
          message: 'V16 Engine Active',
          hasKey: !!apiKey 
        });
      }

      if (!apiKey) {
        throw new Error('GEMINI_API_KEY no detectada en el servidor.');
      }

      if (!metrics) {
        return res.status(400).json({ error: 'Métricas no proporcionadas.' });
      }

      const genAI = new GoogleGenAI({ apiKey });
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const roas = metrics.revenue / (metrics.spend || 1);
      
      let prompt = '';
      if (type === 'metrics') {
        prompt = `Analizá brevemente la performance de Meta Ads de ${monthName}: Inversión ${metrics.spend}, Facturación ${metrics.revenue}, ROAS: ×${roas.toFixed(2)}. Escribí un solo párrafo corto (60-80 palabras). Castellano Argentina. Sin negritas.`;
      } else {
        const notesContext = notes && notes.length > 0 ? notes.map((n: any) => `- ${n.text}`).join('\n') : 'Sin notas.';
        prompt = `Resumen estratégico de ${monthName}. ROAS ${roas.toFixed(2)}, Inversión ${metrics.spend}. Notas de bitácora: ${notesContext}. Máximo 150 palabras. Castellano Argentina. Texto plano.`;
      }

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      console.log('[V16-AI] Success');
      return res.json({ text });

    } catch (err: any) {
      console.error('[V16-ERROR]', err);
      return res.status(500).json({ 
        error: err.message || 'Error interno del servidor AI',
        details: 'Verifica la API Key en Settings.'
      });
    }
  });

  app.get('/api/health', (req, res) => res.json({ status: 'ok', v: 16 }));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor V16 iniciado en puerto ${PORT}`);
  });
}

startServer();
