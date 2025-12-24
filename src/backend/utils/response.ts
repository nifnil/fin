import { Errors, type ErrorDefinition } from "@/errors";

export function serverError(error: unknown): Response {
  console.error('[server error]', error);
  const { code, message, status } = Errors.SERVER_ERROR;
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(error: ErrorDefinition): Response {
  const { code, message, status } = error;
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
