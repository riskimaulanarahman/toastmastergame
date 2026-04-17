import Link from "next/link";
import { redirect } from "next/navigation";

import { CountdownTimer } from "@/components/game/countdown-timer";
import { SessionStateWatcher } from "@/components/game/session-state-watcher";
import { SubmissionForm } from "@/components/game/submission-form";
import { WaitingParticipantsList } from "@/components/game/waiting-participants-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readParticipantCookie } from "@/lib/auth/participant-cookie";
import { getPublicImageUrl } from "@/lib/services/storage-service";
import {
  hasParticipantSubmitted,
  listWaitingParticipants,
  maybeAutoFinishSession,
  validateParticipantToken
} from "@/lib/services/session-service";

export default async function PlaySessionPage({
  params
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<JSX.Element> {
  const { sessionId } = await params;

  const cookie = await readParticipantCookie();
  if (!cookie || cookie.sessionId !== sessionId) {
    redirect(`/play/${sessionId}/join`);
  }

  try {
    await validateParticipantToken(sessionId, cookie.participantId, cookie.token);
  } catch {
    redirect(`/play/${sessionId}/join`);
  }

  const session = await maybeAutoFinishSession(sessionId, { privileged: true });

  if (session.status === "finished") {
    redirect(`/play/${sessionId}/result`);
  }

  if (session.status === "scheduled") {
    const waitingParticipants = await listWaitingParticipants(sessionId);

    return (
      <div className="space-y-5">
        <SessionStateWatcher sessionId={sessionId} />
        <Card>
          <CardHeader>
            <CardTitle>{session.title}</CardTitle>
            <p className="text-sm text-muted-foreground">You are in the waiting room. Game starts when admin presses Start.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge variant="outline">WAITING ROOM</Badge>
            <WaitingParticipantsList
              sessionId={sessionId}
              initialRows={waitingParticipants}
              title="Participants Waiting"
              emptyMessage="No participants have joined yet."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session.status !== "live") {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Session is not live</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={`/play/${sessionId}/result`}>View result page</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const imagePath = session.game_sets?.image_path;
  const imageUrl = imagePath ? getPublicImageUrl(imagePath) : null;
  const alreadySubmitted = await hasParticipantSubmitted(sessionId, cookie.participantId);

  return (
    <div className="space-y-5">
      <SessionStateWatcher sessionId={sessionId} />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>{session.title}</CardTitle>
            <p className="text-sm text-muted-foreground">Guess all 10 numbered items in English.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge>LIVE</Badge>
            <CountdownTimer endAt={session.end_at} serverNow={new Date().toISOString()} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {imageUrl ? (
            <div className="overflow-hidden rounded-xl border bg-white">
              <img src={imageUrl} alt="Game room" className="h-auto w-full object-contain" />
            </div>
          ) : (
            <p className="text-sm text-destructive">Game image is missing.</p>
          )}

          <SubmissionForm sessionId={sessionId} disabled={false} initialSubmitted={alreadySubmitted} endAt={session.end_at} />
        </CardContent>
      </Card>
    </div>
  );
}
