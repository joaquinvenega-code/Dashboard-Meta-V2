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
    console.log(`[V15] ${req.method} ${req.url}`);
    next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- API ENGINE V15 ---
  // Aceptamos ALL para diagnosticar si el problema es el método
  app.all('/v15-engine', async (req, res) => {
    if (req.method === 'OPTIONS') return res.sendStatus(204);

    // Extraemos los datos del body (POST) o de la query (GET)
    const data = req.method === 'POST' ? req.body : req.query;
    const { metrics, notes, monthName, type = 'metrics' } = data;
    
    // Tratamiento especial por si vienen stringificados en una query GET
    let parsedMetrics = metrics;
    if (typeof metrics === 'string') {
      try { parsedMetrics = JSON.parse(metrics); } catch(e) {}
    }
    let parsedNotes = notes;
    if (typeof notes === 'string') {
      try { parsedNotes = JSON.parse(notes); } catch(e) {}
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'undefined') {
      return res.status(500).json({ error: 'Llave de IA no encontrada. Configúrala en Settings como GEMINI_API_KEY.' });
    }

    if (!parsedMetrics) {
      return res.status(400).json({ error: 'Faltan datos de métricas.' });
    }

    try {
      const genAI = new GoogleGenAI({ apiKey });
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const roas = parsedMetrics.revenue / (parsedMetrics.spend || 1);
      
      let prompt = '';
      if (type === 'metrics') {
        prompt = `Analizá brevemente la performance de Meta Ads de ${monthName}: Inversión ${parsedMetrics.spend}, Facturación ${parsedMetrics.revenue}, ROAS: ×${roas.toFixed(2)}. Escribí un solo párrafo corto (máximo 80 palabras). Castellano Argentina. Texto plano, sin negritas.`;
      } else {
        const notesContext = parsedNotes && parsedNotes.length > 0 ? parsedNotes.map((n: any) => `- ${n.text}`).join('\n') : 'Sin notas registradas.';
        prompt = `Resumen ejecutivo de ${monthName}. Métricas: ROAS ${roas.toFixed(2)}, Inversión ${parsedMetrics.spend}. Contexto: ${notesContext}. Máximo 150 palabras. Castellano Argentina. Texto plano, sin negritas.`;
      }

      const result = await model.generateContent(prompt);
      res.json({ text: result.response.text() });
    } catch (err: any) {
      console.error('[V15 ERROR]', err);
      res.status(500).json({ error: `Error de Gemini: ${err.message}` });
    }
  });

  app.get('/api/health', (req, res) => res.json({ status: 'ok', v: 15 }));

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
    console.log(`Servidor V15 iniciado en puerto ${PORT}`);
  });
}

startServer();
