import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { SessionDurationEditor } from "@/components/admin/session-duration-editor";
import { LeaderboardTable } from "@/components/game/leaderboard-table";
import { WaitingParticipantsList } from "@/components/game/waiting-participants-list";
import { SessionControls } from "@/components/admin/session-controls";
import { SessionStatusBadge } from "@/components/admin/session-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/admin";
import { getLeaderboard, getParticipantCount } from "@/lib/services/leaderboard-service";
import { getDetailedSubmissions, listWaitingParticipants, maybeAutoFinishSession } from "@/lib/services/session-service";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }): Promise<JSX.Element> {
  await requireAdmin();

  const { id } = await params;
  const [session, leaderboard, participantCount, waitingParticipants, submissions] = await Promise.all([
    maybeAutoFinishSession(id, { privileged: true }),
    getLeaderboard(id),
    getParticipantCount(id),
    listWaitingParticipants(id),
    getDetailedSubmissions(id)
  ]);

  return (
    <AdminShell title="Session Detail">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span>{session.title}</span>
              <SessionStatusBadge status={session.status} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Duration: {session.duration_seconds}s</Badge>
              <Badge variant="outline">Participants: {participantCount}</Badge>
              <Badge variant="outline">Submissions: {leaderboard.length}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Session ID: {session.id}</p>
            <div className="flex flex-wrap items-center gap-3">
              <SessionControls sessionId={session.id} status={session.status} />
              <Button variant="outline" asChild>
                <a href={`/api/sessions/${session.id}/leaderboard.csv`}>Export CSV</a>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/play/${session.id}/result`}>Open public results</Link>
              </Button>
            </div>
            <SessionDurationEditor
              sessionId={session.id}
              initialDuration={session.duration_seconds}
              status={session.status}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Waiting List</CardTitle>
          </CardHeader>
          <CardContent>
            <WaitingParticipantsList
              sessionId={session.id}
              initialRows={waitingParticipants}
              title="Participants in Waiting Room"
              emptyMessage="No participants are waiting yet."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaderboardTable sessionId={session.id} initialRows={leaderboard} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submission Details</CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submission data yet.</p>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div key={submission.submission_id} className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="font-medium">{submission.participant_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Correct: {submission.total_correct} | Time: {submission.time_elapsed_seconds}s
                      </p>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Answer</TableHead>
                          <TableHead>Correct</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submission.answers.map((answer) => (
                          <TableRow key={`${submission.submission_id}-${answer.item_number}`}>
                            <TableCell>{answer.item_number}</TableCell>
                            <TableCell>{answer.answer_text}</TableCell>
                            <TableCell>{answer.is_correct ? "Yes" : "No"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
