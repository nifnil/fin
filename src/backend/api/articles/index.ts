import { db } from "@/db";
import { articlesTable } from "@/db/schema";
import { serverError } from "@/utils/response";

export async function GET(_: Request): Promise<Response> {
  try {
    const articles = await db.select().from(articlesTable);
    return new Response(JSON.stringify({ articles, message: 'success' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return serverError(error);
  }
}
