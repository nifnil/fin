import { Errors } from '@/errors';
import { adminRequired, useMiddleware } from '@/middlewares';
import { getArticleBySlug } from '@/services/articles';
import { getPathSegment } from '@/utils/request';
import { errorResponse, jsonResponse, serverError } from '@/utils/response';

export const dynamic = 'force-dynamic'; // static by default, unless reading the request
export const runtime = 'edge'; // specify the runtime to be edge

async function getHandler(request: Request): Promise<Response> {
  const slug = getPathSegment(request);
  try {
    if (!slug) {
      return errorResponse(Errors.RESOURCE_NOT_FOUND);
    }
    const article = await getArticleBySlug(slug);
    if (!article) {
      return errorResponse(Errors.RESOURCE_NOT_FOUND);
    }
    return jsonResponse({ article });
  } catch (error) {
    return serverError(error);
  }
}

export const GET = useMiddleware(getHandler, [adminRequired]);