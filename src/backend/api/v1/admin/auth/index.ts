import { createToken, getUser } from "@/services/admin";
import { Errors } from "@/errors";
import { errorResponse, jsonResponse, serverError } from "@/utils/response";

interface CreateTokenRequest {
  userId: string;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { userId } = await req.json() as CreateTokenRequest;
    if (!userId || !await getUser(userId)) {
      return errorResponse(Errors.BAD_REQUEST);
    }
    
    const token = await createToken(userId);
    return jsonResponse({ token });
  } catch (error) {
    return serverError(error);
  }
}
