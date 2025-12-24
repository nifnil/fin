import express from 'express';

export function getFullUrl(req: Request | express.Request): URL {
  if ('originalUrl' in req) {
    const expressReq = req as express.Request;
    return new URL(
      expressReq.originalUrl,
      `${expressReq.protocol}://${expressReq.headers.host}`
    );
  }
  return new URL((req as Request).url);
}

export function getPathSegment(req: Request | express.Request): string | null {
  const url = getFullUrl(req);
  const parts = url.pathname.split('/');
  return parts.pop() ?? null;
}
