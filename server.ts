import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { orionModulesRouter } from './src/backend/routes/orionModules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Habilitamos CORS y Body Parsers inmediatamente
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging general
  app.use((req, res, next) => {
    console.log(`[FLOW] ${req.method} ${req.url}`);
    next();
  });

  // --- API ROUTES ---
  app.use('/orion', orionModulesRouter);

  // --- API ENGINE V18 (LEGACY COMPATIBILITY) ---
  app.all('/v18-engine', async (req, res) => {
    // CORS manual adicional
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');

    if (req.method === 'OPTIONS') return res.sendStatus(204);

    console.log(`[V18-DEBUG] ${req.method} request hit!`);

    try {
      const apiKey = process.env.Orion_Dashboard || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('API Key no configurada en Settings.');

      // Unificamos datos de POST (body) y GET (query)
      const data = { ...req.body, ...req.query };
      let { metrics, notes, monthName, type = 'metrics' } = data;

      // Parseo defensivo por si vienen como strings (común en GET)
      if (typeof metrics === 'string') try { metrics = JSON.parse(metrics); } catch(e) {}
      if (typeof notes === 'string') try { notes = JSON.parse(notes); } catch(e) {}

      if (!metrics) {
        return res.json({ status: 'ok', message: 'V18 Engine Waiting for Data', hasKey: !!apiKey });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const totalRevenue = (metrics.revenue || 0) + (metrics.offlineRevenue || 0);
      const roasReal = totalRevenue / (metrics.spend || 1);
      
      let prompt = '';
      if (type === 'metrics') {
        prompt = `Análisis Meta Ads ${monthName}: Inversión ${metrics.spend}, Facturación Meta ${metrics.revenue}, Ventas Offline ${metrics.offlineRevenue || 0}, Facturación Total ${totalRevenue}, ROAS Real: ×${roasReal.toFixed(2)}. Un párrafo corto (80 palabras). Castellano Argentina. Sin negritas.`;
      } else {
        const notesContext = notes && notes.length > 0 ? notes.map((n: any) => `- ${n.text}`).join('\n') : 'Sin notas.';
        prompt = `Resumen estratégico ${monthName}. Facturación Total ${totalRevenue}, ROAS Real ${roasReal.toFixed(2)}, Inversión ${metrics.spend}. Notas bitácora: ${notesContext}. Máximo 150 palabras. Castellano Argentina.`;
      }

      const result = await model.generateContent(prompt);
      return res.json({ text: result.response.text() });

    } catch (err: any) {
      console.error('[V18-FAIL]', err);
      return res.status(500).json({ error: err.message });
    }
  });


  app.get('/api/health', (req, res) => res.json({ status: 'ok', v: 17 }));

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
    console.log(`Servidor V17 iniciado en puerto ${PORT}`);
  });
}

startServer();
