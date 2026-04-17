import crypto from "node:crypto";

import { PostgrestError } from "@supabase/supabase-js";

import { hashToken } from "@/lib/auth/participant-cookie";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { SESSION_STATUSES } from "@/lib/utils/constants";
import { HttpError } from "@/lib/utils/http";
import { nowIso } from "@/lib/utils/time";
import type { CreateSessionInput, UpdateSessionDurationInput } from "@/lib/validations/schemas";
import type { DbTable } from "@/types/database";
import type { SessionWithGameSet, WaitingParticipant } from "@/types/game";

function isUniqueError(error: PostgrestError | null): boolean {
  return !!error && error.code === "23505";
}

export async function listSessions(): Promise<SessionWithGameSet[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("game_sessions")
    .select(
      "id, game_set_id, title, status, duration_seconds, start_at, end_at, created_by, created_at, game_sets(id, title, description, image_path)"
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new HttpError(500, "Failed to load sessions");
  }

  return (data ?? []) as SessionWithGameSet[];
}

export async function createSession(input: CreateSessionInput, createdBy: string): Promise<DbTable<"game_sessions">> {
  const supabase = createServiceRoleClient();

  const { count: gameSetCount, error: gameSetError } = await supabase
    .from("game_sets")
    .select("id", { count: "exact", head: true })
    .eq("id", input.game_set_id);

  if (gameSetError) {
    throw new HttpError(500, "Failed to validate selected game set");
  }

  if (!gameSetCount) {
    throw new HttpError(400, "Selected game set does not exist");
  }

  const { data, error } = await supabase
    .from("game_sessions")
    .insert({
      game_set_id: input.game_set_id,
      title: input.title,
      duration_seconds: input.duration_seconds,
      created_by: createdBy,
      status: SESSION_STATUSES.DRAFT
    })
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "23503") {
      throw new HttpError(400, "Selected game set does not exist");
    }
    throw new HttpError(400, "Failed to create session");
  }

  return data;
}

export async function updateSessionDuration(
  sessionId: string,
  input: UpdateSessionDurationInput
): Promise<DbTable<"game_sessions">> {
  const current = await maybeAutoFinishSession(sessionId, { privileged: true });
  if (current.status === SESSION_STATUSES.LIVE) {
    throw new HttpError(409, "Cannot edit duration while session is live. Finish session first.");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .update({ duration_seconds: input.duration_seconds })
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error || !data) {
    throw new HttpError(400, "Failed to update session duration");
  }

  return data;
}

export async function getSessionById(
  sessionId: string,
  options?: {
    privileged?: boolean;
  }
): Promise<SessionWithGameSet> {
  const supabase = options?.privileged
    ? createServiceRoleClient()
    : ((await createServerSupabaseClient()) as unknown as ReturnType<typeof createServiceRoleClient>);

  const { data, error } = await supabase
    .from("game_sessions")
    .select(
      "id, game_set_id, title, status, duration_seconds, start_at, end_at, created_by, created_at, game_sets(id, title, description, image_path)"
    )
    .eq("id", sessionId)
    .single();

  if (error || !data) {
    throw new HttpError(404, "Session not found");
  }

  return data as SessionWithGameSet;
}

export async function getSessionPublic(sessionId: string): Promise<SessionWithGameSet> {
  const session = await getSessionById(sessionId, { privileged: true });

  if (
    session.status !== SESSION_STATUSES.SCHEDULED &&
    session.status !== SESSION_STATUSES.LIVE &&
    session.status !== SESSION_STATUSES.FINISHED
  ) {
    throw new HttpError(403, "Session is not available yet");
  }

  return session;
}

export async function maybeAutoFinishSession(
  sessionId: string,
  options?: {
    privileged?: boolean;
  }
): Promise<SessionWithGameSet> {
  const session = await getSessionById(sessionId, options);

  if (session.status === SESSION_STATUSES.LIVE && session.end_at && new Date(session.end_at).getTime() <= Date.now()) {
    const finishedAt = nowIso();
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("game_sessions")
      .update({ status: SESSION_STATUSES.FINISHED, end_at: finishedAt })
      .eq("id", sessionId)
      .eq("status", SESSION_STATUSES.LIVE);

    if (error) {
      throw new HttpError(500, "Failed to auto-finish session");
    }

    return {
      ...session,
      status: SESSION_STATUSES.FINISHED,
      end_at: finishedAt
    };
  }

  return session;
}

export async function startSession(
  sessionId: string,
  options?: {
    confirmRestartFinished?: boolean;
  }
): Promise<DbTable<"game_sessions">> {
  const supabase = createServiceRoleClient();
  const confirmRestartFinished = options?.confirmRestartFinished ?? false;

  const existing = await maybeAutoFinishSession(sessionId, { privileged: true });

  if (existing.status === SESSION_STATUSES.DRAFT) {
    throw new HttpError(409, "Session is draft. Open waiting room first.");
  }

  if (existing.status === SESSION_STATUSES.LIVE) {
    throw new HttpError(400, "Session is already live");
  }

  if (existing.status === SESSION_STATUSES.FINISHED && !confirmRestartFinished) {
    throw new HttpError(409, "Session is finished. Confirm restart to reset previous round data.");
  }

  if (existing.status === SESSION_STATUSES.FINISHED && confirmRestartFinished) {
    const { error: resetError } = await supabase.from("participants").delete().eq("session_id", sessionId);

    if (resetError) {
      throw new HttpError(500, "Failed to reset previous round data");
    }

    const { data: restartedSession, error: restartError } = await supabase
      .from("game_sessions")
      .update({
        status: SESSION_STATUSES.SCHEDULED,
        start_at: null,
        end_at: null
      })
      .eq("id", sessionId)
      .select("*")
      .single();

    if (restartError || !restartedSession) {
      throw new HttpError(400, "Failed to move restarted session to waiting room");
    }

    return restartedSession;
  }

  if (existing.status !== SESSION_STATUSES.SCHEDULED) {
    throw new HttpError(409, "Session must be in waiting room before starting.");
  }

  const startAt = nowIso();
  const endAt = new Date(Date.now() + existing.duration_seconds * 1000).toISOString();

  const { data, error } = await supabase
    .from("game_sessions")
    .update({
      status: SESSION_STATUSES.LIVE,
      start_at: startAt,
      end_at: endAt
    })
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error || !data) {
    throw new HttpError(400, "Failed to start session");
  }

  return data;
}

export async function openSessionForWaitingRoom(sessionId: string): Promise<DbTable<"game_sessions">> {
  const supabase = createServiceRoleClient();
  const existing = await maybeAutoFinishSession(sessionId, { privileged: true });

  if (existing.status === SESSION_STATUSES.SCHEDULED) {
    throw new HttpError(409, "Session is already in waiting room.");
  }

  if (existing.status === SESSION_STATUSES.LIVE) {
    throw new HttpError(409, "Session is already live and cannot be opened to waiting room.");
  }

  if (existing.status === SESSION_STATUSES.FINISHED) {
    throw new HttpError(409, "Session is finished. Use restart to create a new waiting room round.");
  }

  const { data, error } = await supabase
    .from("game_sessions")
    .update({
      status: SESSION_STATUSES.SCHEDULED,
      start_at: null,
      end_at: null
    })
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error || !data) {
    throw new HttpError(400, "Failed to open waiting room");
  }

  return data;
}

export async function finishSession(sessionId: string): Promise<DbTable<"game_sessions">> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("game_sessions")
    .update({
      status: SESSION_STATUSES.FINISHED,
      end_at: nowIso()
    })
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error || !data) {
    throw new HttpError(400, "Failed to finish session");
  }

  return data;
}

export async function joinParticipant(sessionId: string, displayName: string): Promise<{ participantId: string; token: string }> {
  const supabase = createServiceRoleClient();

  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .select("id, status, end_at")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    throw new HttpError(404, "Session not found");
  }

  if (session.status === SESSION_STATUSES.DRAFT) {
    throw new HttpError(400, "Session waiting room is not open yet");
  }

  if (session.status === SESSION_STATUSES.LIVE) {
    throw new HttpError(400, "Game has started. Late join is not allowed.");
  }

  if (session.status === SESSION_STATUSES.FINISHED) {
    throw new HttpError(400, "Session has finished");
  }

  if (session.status !== SESSION_STATUSES.SCHEDULED) {
    throw new HttpError(400, "Session is not open for joining");
  }

  if (session.end_at && new Date(session.end_at).getTime() <= Date.now()) {
    await supabase.from("game_sessions").update({ status: SESSION_STATUSES.FINISHED }).eq("id", sessionId);
    throw new HttpError(400, "Session has already ended");
  }

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .insert({
      session_id: sessionId,
      display_name: displayName
    })
    .select("id")
    .single();

  if (isUniqueError(participantError)) {
    throw new HttpError(409, "Display name already used in this session");
  }

  if (participantError || !participant) {
    throw new HttpError(400, "Unable to join session");
  }

  const token = crypto.randomUUID();
  const tokenHash = hashToken(token);

  const { error: tokenError } = await supabase.from("participant_tokens").upsert(
    {
      participant_id: participant.id,
      session_id: sessionId,
      token_hash: tokenHash
    },
    { onConflict: "participant_id" }
  );

  if (tokenError) {
    throw new HttpError(500, "Unable to secure participant session");
  }

  return { participantId: participant.id, token };
}

export async function listWaitingParticipants(sessionId: string): Promise<WaitingParticipant[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("participants")
    .select("id, display_name, joined_at")
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw new HttpError(500, "Unable to load waiting participants");
  }

  return (data ?? []) as WaitingParticipant[];
}

export async function validateParticipantToken(sessionId: string, participantId: string, token: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("participant_tokens")
    .select("token_hash")
    .eq("participant_id", participantId)
    .eq("session_id", sessionId)
    .single();

  if (error || !data) {
    throw new HttpError(401, "Invalid participant session");
  }

  if (data.token_hash !== hashToken(token)) {
    throw new HttpError(401, "Invalid participant session");
  }
}

export async function hasParticipantSubmitted(sessionId: string, participantId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();

  const { count, error } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("participant_id", participantId);

  if (error) {
    throw new HttpError(500, "Failed to verify submission status");
  }

  return (count ?? 0) > 0;
}

export async function getSessionStatusSnapshot(sessionId: string): Promise<Pick<DbTable<"game_sessions">, "id" | "status" | "start_at" | "end_at" | "game_set_id">> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("game_sessions")
    .select("id, status, start_at, end_at, game_set_id")
    .eq("id", sessionId)
    .single();

  if (error || !data) {
    throw new HttpError(404, "Session not found");
  }

  if (data.status === SESSION_STATUSES.LIVE && data.end_at && new Date(data.end_at).getTime() <= Date.now()) {
    const { error: updateError } = await supabase
      .from("game_sessions")
      .update({ status: SESSION_STATUSES.FINISHED })
      .eq("id", sessionId)
      .eq("status", SESSION_STATUSES.LIVE);

    if (updateError) {
      throw new HttpError(500, "Failed to update session status");
    }

    return { ...data, status: SESSION_STATUSES.FINISHED };
  }

  return data;
}

export async function getDetailedSubmissions(sessionId: string): Promise<
  Array<{
    submission_id: string;
    participant_name: string;
    total_correct: number;
    time_elapsed_seconds: number;
    submitted_at: string;
    answers: Array<{ item_number: number; answer_text: string; is_correct: boolean }>;
  }>
> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("submissions")
    .select(
      "id, total_correct, time_elapsed_seconds, submitted_at, participants(display_name), submission_answers(item_number, answer_text, is_correct)"
    )
    .eq("session_id", sessionId)
    .order("total_correct", { ascending: false })
    .order("time_elapsed_seconds", { ascending: true })
    .order("submitted_at", { ascending: true });

  if (error) {
    throw new HttpError(500, "Failed to load submission details");
  }

  return (data ?? []).map((row) => ({
    submission_id: row.id,
    participant_name: row.participants?.display_name ?? "Unknown",
    total_correct: row.total_correct,
    time_elapsed_seconds: row.time_elapsed_seconds,
    submitted_at: row.submitted_at,
    answers: (row.submission_answers ?? []).sort((a, b) => a.item_number - b.item_number)
  }));
}
