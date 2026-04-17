import { z } from "zod";

import { requireAdminApi } from "@/lib/auth/admin";
import { updateSessionDuration } from "@/lib/services/session-service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/http";
import { updateSessionDurationSchema } from "@/lib/validations/schemas";

const paramSchema = z.object({ id: z.string().uuid() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    await requireAdminApi();
    const params = paramSchema.parse(await context.params);
    const payload = updateSessionDurationSchema.parse(await request.json());

    const session = await updateSessionDuration(params.id, payload);

    return jsonOk({ session });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid payload", 422);
    }

    if (error instanceof SyntaxError) {
      return jsonError("Invalid JSON body", 400);
    }

    return handleApiError(error);
  }
}
