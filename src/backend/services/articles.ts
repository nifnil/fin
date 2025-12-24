import { db } from '@/db';
import { articlesTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function getArticleBySlug(
  slug: string
): Promise<typeof articlesTable.$inferSelect | undefined> {
  const article = await db
    .select()
    .from(articlesTable)
    .where(eq(articlesTable.slug, slug))
    .limit(1);
  return article[0];
}
