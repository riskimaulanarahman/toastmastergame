import { z } from "zod";

import { requireAdminApi } from "@/lib/auth/admin";
import { openSessionForWaitingRoom } from "@/lib/services/session-service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/http";

const paramSchema = z.object({ id: z.string().uuid() });

export async function POST(_: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    await requireAdminApi();
    const params = paramSchema.parse(await context.params);
    const session = await openSessionForWaitingRoom(params.id);

    return jsonOk({ session });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid session id", 422);
    }

    return handleApiError(error);
  }
}
