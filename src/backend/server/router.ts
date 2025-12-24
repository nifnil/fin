import { Errors, isKnownError } from '@/errors';
import express from 'express';
import fs from 'fs';
import path from 'path';

function filePathToRoute(filePath: string): string {
  return filePath
    .replace(/^.*\/api/, '/api')
    .replace(/\/index\.ts$/, '')
    .replace(/\.ts$/, '')
    .replace(/\[\.{3}(\w+)\]/g, '*')
    .replace(/\[(\w+)\]/g, ':$1');
}

function castRequest(req: express.Request): Request {
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      headers.append(key, value.join(', '));
    } else if (value) {
      headers.append(key, value);
    }
  }

  return new Request(url, {
    method: req.method,
    headers,
    body:
      req.method !== 'GET' && req.method !== 'HEAD'
        ? JSON.stringify(req.body)
        : null,
  });
}

export async function registerApiRoutes(app: express.Express): Promise<void> {
  const apiDir = path.resolve(import.meta.dir, '../api');
  const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;

  async function walk(dir: string): Promise<void> {
    for (const file of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (!file.endsWith('.ts')) {
        continue;
      }

      const route = filePathToRoute(fullPath);
      const module = await import(fullPath);

      methods.forEach((method) => {
        const handlerName = method.toUpperCase();
        if (module[handlerName]) {
          app[method](
            route,
            async (req: express.Request, res: express.Response) => {
              try {
                const response = await module[handlerName](castRequest(req));

                if (response instanceof Response) {
                  const status = response.status;
                  const body = await response.text();

                  response.headers.forEach((value, key) => {
                    res.set(key, value);
                  });

                  res.status(status).send(body);
                } else {
                  res.json(response);
                }
              } catch (err: unknown) {
                if (isKnownError(err)) {
                  res.status(err.status).json({
                    code: err.code,
                    message: err.message,
                  });
                  return;
                }

                console.error('[api error]', err);
                const { code, message, status } = Errors.SERVER_ERROR;
                res.status(status).json({ code, message });
              }
            }
          );
          console.warn(`[api] [${method.toUpperCase()}] ${route}`);
        }
      });
    }
  }

  await walk(apiDir);
}
