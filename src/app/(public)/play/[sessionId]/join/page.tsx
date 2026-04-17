import Link from "next/link";
import { redirect } from "next/navigation";

import { JoinSessionForm } from "@/components/game/join-session-form";
import { SessionStateWatcher } from "@/components/game/session-state-watcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { readParticipantCookie } from "@/lib/auth/participant-cookie";
import { maybeAutoFinishSession, validateParticipantToken } from "@/lib/services/session-service";

export default async function JoinSessionPage({
  params
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<JSX.Element> {
  const { sessionId } = await params;

  const participantCookie = await readParticipantCookie();
  if (participantCookie?.sessionId === sessionId) {
    try {
      await validateParticipantToken(sessionId, participantCookie.participantId, participantCookie.token);
      redirect(`/play/${sessionId}`);
    } catch {
      // Keep user on join page when cookie exists but token is no longer valid.
    }
  }

  const session = await maybeAutoFinishSession(sessionId, { privileged: true });

  if (session.status !== "scheduled") {
    const message =
      session.status === "live"
        ? "Game already started. Late join is not allowed."
        : session.status === "finished"
          ? "Session already finished."
          : "Waiting room is not open yet.";

    return (
      <div className="mx-auto max-w-xl space-y-4">
        <SessionStateWatcher sessionId={sessionId} />
        <Card>
          <CardHeader>
            <CardTitle>Session is not open for joining</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/">Back to sessions</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/play/${sessionId}/result`}>Go to result page</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <SessionStateWatcher sessionId={sessionId} />
      <Card>
        <CardHeader>
          <CardTitle>{session.title}</CardTitle>
          <CardDescription>Enter your display name to join the waiting room.</CardDescription>
        </CardHeader>
        <CardContent>
          <JoinSessionForm sessionId={sessionId} />
        </CardContent>
      </Card>
    </div>
  );
}
