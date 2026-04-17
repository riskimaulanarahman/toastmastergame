"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { WaitingParticipant } from "@/types/game";

interface ParticipantRow {
  id: string;
  display_name: string;
  joined_at: string;
}

async function fetchWaitingParticipants(sessionId: string): Promise<WaitingParticipant[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("participants")
    .select("id, display_name, joined_at")
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ParticipantRow[]).map((row) => ({
    id: row.id,
    display_name: row.display_name,
    joined_at: row.joined_at
  }));
}

export function WaitingParticipantsList({
  sessionId,
  initialRows,
  title = "Waiting List",
  emptyMessage = "No participants in waiting room yet."
}: {
  sessionId: string;
  initialRows: WaitingParticipant[];
  title?: string;
  emptyMessage?: string;
}): JSX.Element {
  const [rows, setRows] = useState<WaitingParticipant[]>(initialRows);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const refresh = async (): Promise<void> => {
      try {
        const latest = await fetchWaitingParticipants(sessionId);
        setRows(latest);
        setErrorMessage(null);
      } catch (error) {
        console.error("Failed to refresh waiting participants", error);
        setErrorMessage("Failed to refresh waiting participants");
      }
    };

    const channel = supabase
      .channel(`waiting-participants-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{rows.length} participant(s)</p>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">{emptyMessage}</p> : null}
      {rows.length > 0 ? (
        <ul className="space-y-1 rounded-md border bg-white p-3 text-sm">
          {rows.map((participant) => (
            <li key={participant.id} className="flex items-center justify-between gap-3 border-b py-1 last:border-0">
              <span>{participant.display_name}</span>
              <span className="text-xs text-muted-foreground">{new Date(participant.joined_at).toLocaleTimeString()}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
    </div>
  );
}
