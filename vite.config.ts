import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv, type Plugin } from 'vite';
import { handleLocalization, type LocalizationEnv } from './server/localization';

function localizationApi(env: LocalizationEnv): Plugin {
  const middleware = (server: {
    middlewares: {
      use: (
        handler: (
          req: import('node:http').IncomingMessage,
          res: import('node:http').ServerResponse,
          next: () => void,
        ) => void,
      ) => void;
    };
  }) => {
    server.middlewares.use((req, res, next) => {
      if (req.url?.split('?')[0] !== '/api/localize') {
        next();
        return;
      }
      void (async () => {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
          if (body.length > 4096) {
            res.writeHead(413);
            res.end('Request too large');
            return;
          }
        }
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers))
          if (value) headers.set(key, Array.isArray(value) ? value.join(',') : value);
        const result = await handleLocalization(
          new Request(`http://${req.headers.host}${req.url}`, {
            method: req.method,
            headers,
            body: req.method === 'POST' ? body : undefined,
          }),
          env,
        );
        res.writeHead(result.status, Object.fromEntries(result.headers));
        res.end(await result.text());
      })().catch(() => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Localization unavailable.' }));
      });
    });
  };
  return {
    name: 'voca-localization-api',
    configureServer: middleware,
    configurePreviewServer: middleware,
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    localizationApi({ ...loadEnv(mode, process.cwd(), ''), ...process.env }),
  ],
  server: {
    watch: {
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 30 },
      ignored: ['**/test-results/**', '**/*.tsbuildinfo'],
    },
  },
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'], restoreMocks: true },
}));
