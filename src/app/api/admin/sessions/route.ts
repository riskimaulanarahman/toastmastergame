import { z } from "zod";

import { requireAdminApi } from "@/lib/auth/admin";
import { createSession } from "@/lib/services/session-service";
import { handleApiError, jsonOk } from "@/lib/utils/http";
import { createSessionSchema } from "@/lib/validations/schemas";

export async function POST(request: Request): Promise<Response> {
  try {
    const admin = await requireAdminApi();
    const payload = createSessionSchema.parse(await request.json());
    const session = await createSession(payload, admin.userId);

    return jsonOk({ session }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: error.issues[0]?.message ?? "Invalid payload" }), { status: 422 });
    }

    return handleApiError(error);
  }
}
