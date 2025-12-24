import { db } from '@/db';
import { articleVersionsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function getArticleVersionByUUID(
  uuid: string
): Promise<typeof articleVersionsTable.$inferSelect | undefined> {
  const articleVersion = await db
    .select()
    .from(articleVersionsTable)
    .where(eq(articleVersionsTable.id, uuid));
  return articleVersion[0];
}
