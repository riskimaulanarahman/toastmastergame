import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { HttpError } from "@/lib/utils/http";
import { toCsvRow } from "@/lib/utils";
import type { LeaderboardRow } from "@/types/game";

interface SubmissionLeaderboardRow {
  participant_id: string;
  total_correct: number;
  time_elapsed_seconds: number;
  submitted_at: string;
  participants: { display_name: string } | Array<{ display_name: string }> | null;
}

export async function getLeaderboard(sessionId: string): Promise<LeaderboardRow[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("submissions")
    .select("participant_id, total_correct, time_elapsed_seconds, submitted_at, participants(display_name)")
    .eq("session_id", sessionId)
    .order("total_correct", { ascending: false })
    .order("time_elapsed_seconds", { ascending: true })
    .order("submitted_at", { ascending: true });

  if (error) {
    console.error("getLeaderboard query error", error);
    throw new HttpError(500, "Unable to load leaderboard");
  }

  return ((data ?? []) as SubmissionLeaderboardRow[]).map((row, index) => ({
    participant_id: row.participant_id,
    display_name: Array.isArray(row.participants)
      ? (row.participants[0]?.display_name ?? "Unknown")
      : (row.participants?.display_name ?? "Unknown"),
    total_correct: row.total_correct,
    time_elapsed_seconds: row.time_elapsed_seconds,
    submitted_at: row.submitted_at,
    rank_position: index + 1
  }));
}

export async function getParticipantCount(sessionId: string): Promise<number> {
  const supabase = createServiceRoleClient();

  const { count, error } = await supabase
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (error) {
    throw new HttpError(500, "Unable to load participant count");
  }

  return count ?? 0;
}

export async function exportLeaderboardCsv(sessionId: string): Promise<string> {
  const rows = await getLeaderboard(sessionId);

  const header = toCsvRow(["Rank", "Display Name", "Correct", "Elapsed Seconds", "Submitted At"]);
  const lines = rows.map((row) =>
    toCsvRow([row.rank_position, row.display_name, row.total_correct, row.time_elapsed_seconds, row.submitted_at])
  );

  return [header, ...lines].join("\n");
}
