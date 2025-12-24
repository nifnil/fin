import { db } from '@/db';
import { articlesTable } from '@/db/schema';
import { Errors } from '@/errors';
import { getSlug } from '@/utils/request';
import { serverError } from '@/utils/response';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic'; // static by default, unless reading the request
export const runtime = 'edge'; // specify the runtime to be edge

export async function GET(request: Request): Promise<Response> {
  const slug = getSlug(request);
  try {
    if (!slug) {
      const { message, status, code } = Errors.ARTICLE_NOT_FOUND;
      return new Response(JSON.stringify({ code, message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const articles = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.slug, slug));
    if (articles.length === 0) {
      const { message, status, code } = Errors.ARTICLE_NOT_FOUND;
      return new Response(JSON.stringify({ code, message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ article: articles[0], message: 'success' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return serverError(error);
  }
}
