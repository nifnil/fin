import { Errors } from '@/errors';
import { isValidUUID } from '@/utils/misc';
import { getPathSegment } from '@/utils/request';
import { errorResponse } from '@/utils/response';

export async function withUUID(
  req: Request,
  handler: (req: Request) => Promise<Response>
): Promise<Response> {
  const uuid = getPathSegment(req);

  if (!uuid || !isValidUUID(uuid)) {
    return errorResponse(Errors.BAD_REQUEST);
  }

  return await handler(req);
}
