import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { TOTAL_ITEMS, SESSION_STATUSES } from "@/lib/utils/constants";
import { normalizeAnswer } from "@/lib/utils";
import { HttpError } from "@/lib/utils/http";
import { secondsDiff } from "@/lib/utils/time";
import type { SubmissionInput } from "@/lib/validations/schemas";
import type { SubmissionEvaluationResult } from "@/types/game";

interface EvaluateSubmissionParams {
  sessionId: string;
  participantId: string;
  answersInput: SubmissionInput["answers"];
}

function evaluateAnswers(
  officialAnswers: Array<{ item_number: number; answer_text: string; accepted_aliases: string[] }>,
  provided: SubmissionInput["answers"]
): SubmissionEvaluationResult {
  const normalizedOfficialMap = new Map<number, Set<string>>();

  for (const item of officialAnswers) {
    const allowed = new Set<string>([normalizeAnswer(item.answer_text), ...item.accepted_aliases.map(normalizeAnswer)]);
    normalizedOfficialMap.set(item.item_number, allowed);
  }

  const answers = provided
    .sort((a, b) => a.item_number - b.item_number)
    .map((answer) => {
      const normalized = normalizeAnswer(answer.answer_text);
      const validAnswers = normalizedOfficialMap.get(answer.item_number) ?? new Set<string>();
      return {
        item_number: answer.item_number,
        answer_text: answer.answer_text,
        is_correct: normalized.length > 0 && validAnswers.has(normalized)
      };
    });

  const totalCorrect = answers.filter((answer) => answer.is_correct).length;

  return { totalCorrect, answers };
}

export async function createSubmission(params: EvaluateSubmissionParams): Promise<{
  submissionId: string;
  totalCorrect: number;
  timeElapsedSeconds: number;
}> {
  const supabase = createServiceRoleClient();

  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .select("id, game_set_id, status, start_at, end_at")
    .eq("id", params.sessionId)
    .single();

  if (sessionError || !session) {
    throw new HttpError(404, "Session not found");
  }

  if (session.status !== SESSION_STATUSES.LIVE) {
    throw new HttpError(400, "Session is not live");
  }

  if (!session.start_at || !session.end_at) {
    throw new HttpError(400, "Session timing is not set");
  }

  if (new Date(session.end_at).getTime() <= Date.now()) {
    await supabase.from("game_sessions").update({ status: SESSION_STATUSES.FINISHED }).eq("id", params.sessionId);
    throw new HttpError(400, "Session has ended");
  }

  const { count, error: existingError } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("session_id", params.sessionId)
    .eq("participant_id", params.participantId);

  if (existingError) {
    throw new HttpError(500, "Unable to check submission status");
  }

  if ((count ?? 0) > 0) {
    throw new HttpError(409, "You have already submitted");
  }

  const { data: officialAnswers, error: answersError } = await supabase
    .from("game_set_answers")
    .select("item_number, answer_text, accepted_aliases")
    .eq("game_set_id", session.game_set_id)
    .order("item_number", { ascending: true });

  if (answersError || !officialAnswers || officialAnswers.length !== TOTAL_ITEMS) {
    throw new HttpError(500, "Official answer key is incomplete");
  }

  const evaluation = evaluateAnswers(officialAnswers, params.answersInput);
  const submittedAt = new Date().toISOString();
  const timeElapsedSeconds = secondsDiff(session.start_at, submittedAt);

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .insert({
      session_id: params.sessionId,
      participant_id: params.participantId,
      submitted_at: submittedAt,
      time_elapsed_seconds: timeElapsedSeconds,
      score: evaluation.totalCorrect,
      total_correct: evaluation.totalCorrect
    })
    .select("id")
    .single();

  if (submissionError || !submission) {
    if (submissionError?.code === "23505") {
      throw new HttpError(409, "You have already submitted");
    }
    throw new HttpError(500, "Failed to save submission");
  }

  const detailedAnswersPayload = evaluation.answers.map((answer) => ({
    submission_id: submission.id,
    item_number: answer.item_number,
    answer_text: answer.answer_text,
    is_correct: answer.is_correct
  }));

  const { error: detailError } = await supabase.from("submission_answers").insert(detailedAnswersPayload);

  if (detailError) {
    throw new HttpError(500, "Failed to save submitted answers");
  }

  return {
    submissionId: submission.id,
    totalCorrect: evaluation.totalCorrect,
    timeElapsedSeconds
  };
}
