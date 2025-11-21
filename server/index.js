import express from 'express';
import compression from 'compression';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';

dotenv.config();

const PORT = Number.parseInt(process.env.PORT || process.env.SOLAR_WEBUI_PORT || '8080', 10);
const CONTROL_URL = process.env.SOLAR_CONTROL_URL || 'http://localhost:8000';
const CONTROL_API_KEY = process.env.SOLAR_CONTROL_API_KEY || '';
const LOG_LEVEL = process.env.NODE_ENV === 'production' ? 'warn' : 'info';
const DEBUG_PROXY = process.env.SOLAR_WEBUI_DEBUG === 'true';

console.log('[solar-webui] config', {
  port: PORT,
  controlUrl: CONTROL_URL,
  hasControlApiKey: CONTROL_API_KEY.length > 0,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

const app = express();
app.disable('x-powered-by');

const controlProxy = createProxyMiddleware({
  target: CONTROL_URL,
  changeOrigin: true,
  ws: true,
  logLevel: LOG_LEVEL,
  pathRewrite: (path) => path.replace(/^\/api\/control/, ''),
  preserveHeaderKeyCase: true,
  headers: CONTROL_API_KEY
    ? {
        'X-API-Key': CONTROL_API_KEY,
        Authorization: `Bearer ${CONTROL_API_KEY}`,
      }
    : undefined,
});

app.use(
  '/api/control',
  (req, _res, next) => {
    if (DEBUG_PROXY) {
      console.log('[proxy] incoming request', {
        method: req.method,
        url: req.originalUrl,
        hasApiKey: !!req.headers['x-api-key'],
      });
    }
    next();
  },
  controlProxy
);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    target: CONTROL_URL,
    hasControlApiKey: Boolean(CONTROL_API_KEY),
  });
});

if (fs.existsSync(DIST_DIR)) {
  app.use(compression());
  app.use(
    express.static(DIST_DIR, {
      index: false,
      maxAge: '1h',
    }),
  );

  app.use((req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else {
  app.use((_req, res) => {
    res.status(500).send('Build output missing. Run "npm run build" before starting the server.');
  });
}

const server = http.createServer(app);
server.on('upgrade', (req, socket, head) => {
  if (DEBUG_PROXY) {
    console.log('[proxy] upgrade request', {
      url: req.url,
      headers: {
        host: req.headers.host,
        origin: req.headers.origin,
      },
    });
  }
  controlProxy.upgrade(req, socket, head);
});

server.listen(PORT, () => {
  console.log(`[solar-webui] listening on port ${PORT}`);
  console.log(`[solar-webui] proxying control requests to ${CONTROL_URL}`);
  if (!CONTROL_API_KEY) {
    console.warn('[solar-webui] SOLAR_CONTROL_API_KEY is not set. API requests may fail with 401.');
  }
});


