import { z } from "zod";

import { requireAdminApi } from "@/lib/auth/admin";
import { finishSession } from "@/lib/services/session-service";
import { handleApiError, jsonOk } from "@/lib/utils/http";

const paramSchema = z.object({ id: z.string().uuid() });

export async function POST(_: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    await requireAdminApi();
    const params = paramSchema.parse(await context.params);
    const session = await finishSession(params.id);

    return jsonOk({ session });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: "Invalid session id" }), { status: 422 });
    }

    return handleApiError(error);
  }
}
