"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SessionStatus = "draft" | "scheduled" | "live" | "finished";

export function SessionDurationEditor({
  sessionId,
  initialDuration,
  status
}: {
  sessionId: string;
  initialDuration: number;
  status: SessionStatus;
}): JSX.Element {
  const router = useRouter();
  const [value, setValue] = useState(String(initialDuration));
  const [loading, setLoading] = useState(false);

  const isLive = status === "live";

  async function saveDuration(): Promise<void> {
    if (loading || isLive) {
      return;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 7200) {
      toast.error("Duration must be an integer between 1 and 7200 seconds");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ duration_seconds: parsed })
      });

      const contentType = response.headers.get("content-type") ?? "";
      const body = contentType.includes("application/json")
        ? ((await response.json()) as { error?: string })
        : ({ error: await response.text() } as { error?: string });

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to update duration");
      }

      toast.success("Session duration updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update duration");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <Label htmlFor="session-duration">Duration (seconds)</Label>
      <div className="flex items-center gap-2">
        <Input
          id="session-duration"
          type="number"
          min={1}
          max={7200}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={loading || isLive}
          className="w-40"
        />
        <Button type="button" onClick={() => void saveDuration()} disabled={loading || isLive}>
          {loading ? "Saving..." : "Save duration"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {isLive ? "Duration cannot be changed while session is live. Finish it first." : "Used for next start/restart of this session."}
      </p>
    </div>
  );
}
