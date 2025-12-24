import { Errors } from '@/errors';
import { useMiddleware } from '@/middlewares';
import { getArticleVersionByUUID } from '@/services/versions';
import { getPathSegment } from '@/utils/request';
import { errorResponse, jsonResponse, serverError } from '@/utils/response';
import { adminRequired, withUUID } from '@/middlewares';

async function getHandler(request: Request): Promise<Response> {
  const uuid = getPathSegment(request);
  try {
    const articleVersion = await getArticleVersionByUUID(uuid!);
    if (!articleVersion) {
      return errorResponse(Errors.RESOURCE_NOT_FOUND);
    }
    return jsonResponse(articleVersion);
  } catch (error) {
    return serverError(error);
  }
}

export const GET = useMiddleware(getHandler, [adminRequired, withUUID]);