import { z } from "zod";

import { requireAdminApi } from "@/lib/auth/admin";
import { deleteGameSet, upsertGameSet } from "@/lib/services/game-set-service";
import { handleApiError, jsonOk } from "@/lib/utils/http";
import { gameSetSchema } from "@/lib/validations/schemas";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const admin = await requireAdminApi();
    const params = paramsSchema.parse(await context.params);
    const payload = gameSetSchema.parse(await request.json());

    const gameSet = await upsertGameSet(payload, admin.userId, params.id);
    return jsonOk({ gameSet });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: error.issues[0]?.message ?? "Invalid payload" }), { status: 422 });
    }

    return handleApiError(error);
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    await requireAdminApi();
    const params = paramsSchema.parse(await context.params);

    await deleteGameSet(params.id);
    return jsonOk({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: "Invalid game set id" }), { status: 422 });
    }

    return handleApiError(error);
  }
}
