"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type SessionStatus = "draft" | "scheduled" | "live" | "finished";

type SessionAction = "open" | "start" | "finish";

export function SessionControls({ sessionId, status }: { sessionId: string; status: SessionStatus }): JSX.Element {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<SessionAction | null>(null);
  const [confirmRestartOpen, setConfirmRestartOpen] = useState(false);

  async function trigger(
    action: SessionAction,
    options?: {
      confirmRestartFinished?: boolean;
    }
  ): Promise<void> {
    setLoadingAction(action);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body:
          action === "start"
            ? JSON.stringify({ confirm_restart_finished: options?.confirmRestartFinished ?? false })
            : undefined
      });
      const contentType = response.headers.get("content-type") ?? "";
      const body = contentType.includes("application/json")
        ? ((await response.json()) as { error?: string })
        : ({ error: await response.text() } as { error?: string });

      if (!response.ok) {
        throw new Error(body.error ?? `Failed to ${action} session`);
      }

      if (action === "open") {
        toast.success("Waiting room opened");
      } else if (action === "start" && status === "finished") {
        toast.success("Session restarted to waiting room");
      } else if (action === "start") {
        toast.success("Session started");
      } else {
        toast.success("Session finished");
      }

      if (action === "start") {
        setConfirmRestartOpen(false);
      }

      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "draft" ? (
        <Button onClick={() => void trigger("open")} disabled={loadingAction !== null}>
          {loadingAction === "open" ? "Opening..." : "Open Waiting Room"}
        </Button>
      ) : null}

      {status === "scheduled" ? (
        <Button onClick={() => void trigger("start")} disabled={loadingAction !== null}>
          {loadingAction === "start" ? "Starting..." : "Start Session"}
        </Button>
      ) : null}

      {status === "finished" ? (
        <AlertDialog open={confirmRestartOpen} onOpenChange={setConfirmRestartOpen}>
          <AlertDialogTrigger asChild>
            <Button disabled={loadingAction !== null}>{loadingAction === "start" ? "Restarting..." : "Restart Session"}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restart finished session?</AlertDialogTitle>
              <AlertDialogDescription>
                Restarting will reset previous round data for this session, including participants and submissions, then open waiting room for the new round.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loadingAction !== null}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void trigger("start", { confirmRestartFinished: true })}
                disabled={loadingAction !== null}
              >
                {loadingAction === "start" ? "Restarting..." : "Yes, restart session"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      <Button
        variant="destructive"
        onClick={() => void trigger("finish")}
        disabled={status === "draft" || status === "finished" || loadingAction !== null}
      >
        {loadingAction === "finish" ? "Finishing..." : "Finish session"}
      </Button>
    </div>
  );
}
