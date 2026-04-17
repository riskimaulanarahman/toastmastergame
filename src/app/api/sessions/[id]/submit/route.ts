import { NextRequest } from "next/server";
import { z } from "zod";

import { isParticipantCookieConfigured, readParticipantCookie } from "@/lib/auth/participant-cookie";
import { createSubmission } from "@/lib/services/submission-service";
import { validateParticipantToken } from "@/lib/services/session-service";
import { handleApiError, HttpError, jsonError, jsonOk } from "@/lib/utils/http";
import { submissionSchema } from "@/lib/validations/schemas";

const paramSchema = z.object({ id: z.string().uuid() });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const params = paramSchema.parse(await context.params);
    const payload = submissionSchema.parse(await request.json());

    if (!isParticipantCookieConfigured()) {
      throw new HttpError(500, "Server configuration error: PARTICIPANT_COOKIE_SECRET is missing");
    }

    const cookie = await readParticipantCookie();
    if (!cookie || cookie.sessionId !== params.id) {
      throw new HttpError(401, "Participant session is missing or invalid");
    }

    await validateParticipantToken(params.id, cookie.participantId, cookie.token);

    const result = await createSubmission({
      sessionId: params.id,
      participantId: cookie.participantId,
      answersInput: payload.answers
    });

    return jsonOk({
      submissionId: result.submissionId,
      totalCorrect: result.totalCorrect,
      timeElapsedSeconds: result.timeElapsedSeconds
    });
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
