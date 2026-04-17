import Link from "next/link";

import { LeaderboardTable } from "@/components/game/leaderboard-table";
import { SessionStateWatcher } from "@/components/game/session-state-watcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLeaderboard } from "@/lib/services/leaderboard-service";
import { maybeAutoFinishSession } from "@/lib/services/session-service";

export default async function ResultPage({
  params
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<JSX.Element> {
  const { sessionId } = await params;
  const session = await maybeAutoFinishSession(sessionId, { privileged: true });
  if (session.status !== "finished") {
    return (
      <div className="space-y-4">
        <SessionStateWatcher sessionId={sessionId} />
        <Card>
          <CardHeader>
            <CardTitle>{session.title}</CardTitle>
            <CardDescription>Results are available after the session is finished.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={`/play/${sessionId}`}>Back to game</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const leaderboard = await getLeaderboard(sessionId);

  return (
    <div className="space-y-4">
      <SessionStateWatcher sessionId={sessionId} />
      <Card>
        <CardHeader>
          <CardTitle>{session.title}</CardTitle>
          <CardDescription>Final leaderboard</CardDescription>
        </CardHeader>
        <CardContent>
          <LeaderboardTable sessionId={sessionId} initialRows={leaderboard} title="Ranking" />
        </CardContent>
      </Card>
      <Button variant="outline" asChild>
        <Link href="/">Back to sessions</Link>
      </Button>
    </div>
  );
}
