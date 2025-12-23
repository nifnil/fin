import { Errors } from "@/errors";

export function serverError(error: unknown): Response {
  console.error('[server error]', error);
  const { code, message, status } = Errors.SERVER_ERROR;
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}