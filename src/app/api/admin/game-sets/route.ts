import { z } from "zod";

import { requireAdminApi } from "@/lib/auth/admin";
import { upsertGameSet } from "@/lib/services/game-set-service";
import { handleApiError, jsonOk } from "@/lib/utils/http";
import { gameSetSchema } from "@/lib/validations/schemas";

export async function POST(request: Request): Promise<Response> {
  try {
    const admin = await requireAdminApi();
    const payload = gameSetSchema.parse(await request.json());
    const gameSet = await upsertGameSet(payload, admin.userId);

    return jsonOk({ gameSet }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: error.issues[0]?.message ?? "Invalid payload" }), { status: 422 });
    }

    return handleApiError(error);
  }
}
