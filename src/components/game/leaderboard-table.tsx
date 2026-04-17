"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { LeaderboardRow } from "@/types/game";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SubmissionLeaderboardRow {
  participant_id: string;
  total_correct: number;
  time_elapsed_seconds: number;
  submitted_at: string;
  participants: { display_name: string } | Array<{ display_name: string }> | null;
}

async function fetchLeaderboard(sessionId: string): Promise<LeaderboardRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("participant_id, total_correct, time_elapsed_seconds, submitted_at, participants(display_name)")
    .eq("session_id", sessionId)
    .order("total_correct", { ascending: false })
    .order("time_elapsed_seconds", { ascending: true })
    .order("submitted_at", { ascending: true });

  if (error) {
    throw error;
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

export function LeaderboardTable({
  sessionId,
  initialRows,
  title = "Leaderboard"
}: {
  sessionId: string;
  initialRows: LeaderboardRow[];
  title?: string;
}): JSX.Element {
  const [rows, setRows] = useState<LeaderboardRow[]>(initialRows);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const refresh = async (): Promise<void> => {
      try {
        const latest = await fetchLeaderboard(sessionId);
        setRows(latest);
        setErrorMessage(null);
      } catch (error) {
        console.error("Failed to refresh leaderboard", error);
        setErrorMessage("Failed to refresh leaderboard");
      }
    };

    const channel = supabase
      .channel(`leaderboard-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
          filter: `session_id=eq.${sessionId}`
        },
        async () => refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_sessions",
          filter: `id=eq.${sessionId}`
        },
        async () => refresh()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  if (rows.length === 0) {
    return (
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">No submissions yet.</p>
        {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Correct</TableHead>
            <TableHead>Time (s)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.participant_id}>
              <TableCell>{row.rank_position}</TableCell>
              <TableCell>{row.display_name}</TableCell>
              <TableCell>{row.total_correct}</TableCell>
              <TableCell>{row.time_elapsed_seconds}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
