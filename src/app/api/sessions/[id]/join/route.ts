import { NextRequest } from "next/server";
import { z } from "zod";

import { isParticipantCookieConfigured, setParticipantCookie } from "@/lib/auth/participant-cookie";
import { joinParticipant } from "@/lib/services/session-service";
import { handleApiError, HttpError, jsonError, jsonOk } from "@/lib/utils/http";
import { joinSessionSchema } from "@/lib/validations/schemas";

const paramSchema = z.object({ id: z.string().uuid() });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const params = paramSchema.parse(await context.params);
    const body = joinSessionSchema.parse(await request.json());

    if (!isParticipantCookieConfigured()) {
      throw new HttpError(500, "Server configuration error: PARTICIPANT_COOKIE_SECRET is missing");
    }

    const joined = await joinParticipant(params.id, body.display_name);

    await setParticipantCookie({
      sessionId: params.id,
      participantId: joined.participantId,
      token: joined.token,
      issuedAt: Date.now()
    });

    return jsonOk({ participantId: joined.participantId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid request", 422);
    }

    if (error instanceof SyntaxError) {
      return jsonError("Invalid JSON body", 400);
    }

    return handleApiError(error);
  }
}
