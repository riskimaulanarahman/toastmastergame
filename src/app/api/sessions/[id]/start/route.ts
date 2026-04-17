import { z } from "zod";

import { requireAdminApi } from "@/lib/auth/admin";
import { startSession } from "@/lib/services/session-service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/http";

const paramSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({
  confirm_restart_finished: z.boolean().optional()
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    await requireAdminApi();
    const params = paramSchema.parse(await context.params);

    const rawText = await request.text();
    let rawBody: unknown = {};
    if (rawText.trim().length > 0) {
      try {
        rawBody = JSON.parse(rawText) as unknown;
      } catch {
        return jsonError("Invalid JSON body", 400);
      }
    }

    const body = bodySchema.parse(rawBody);
    const session = await startSession(params.id, {
      confirmRestartFinished: body.confirm_restart_finished ?? false
    });

    return jsonOk({ session });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid request", 422);
    }

    return handleApiError(error);
  }
}
