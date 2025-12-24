import { Errors } from '@/errors';
import { validateToken } from '@/services/admin';
import { errorResponse } from '@/utils/response';

export async function adminRequired(
  req: Request,
  handler: (req: Request) => Promise<Response>
): Promise<Response> {
  const token = req.headers.get('X-Adm-Token');
  if (!token || (await validateToken(token))) {
    return errorResponse(Errors.RESOURCE_NOT_FOUND);
  }
  return await handler(req);
}
