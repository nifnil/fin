import { db } from "@/db";
import { articlesTable } from "@/db/schema";
import { adminRequired, useMiddleware } from "@/middlewares";
import { jsonResponse, serverError } from "@/utils/response";

async function getHandler(_: Request): Promise<Response> {
  try {
    const articles = await db.select().from(articlesTable);
    return jsonResponse({ articles });
  } catch (error) {
    return serverError(error);
  }
}

export const GET = useMiddleware(getHandler, [adminRequired]);