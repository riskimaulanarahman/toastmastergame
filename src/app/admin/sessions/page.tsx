import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { SessionStatusBadge } from "@/components/admin/session-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/admin";
import { listSessions } from "@/lib/services/session-service";

export default async function SessionsPage(): Promise<JSX.Element> {
  await requireAdmin();
  const sessions = await listSessions();

  return (
    <AdminShell title="Sessions">
      <div className="mb-4 flex justify-end">
        <Button asChild>
          <Link href="/admin/sessions/new">New session</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Game Set</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration (s)</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{session.title}</TableCell>
                    <TableCell>{session.game_sets?.title ?? "N/A"}</TableCell>
                    <TableCell>
                      <SessionStatusBadge status={session.status} />
                    </TableCell>
                    <TableCell>{session.duration_seconds}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/sessions/${session.id}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
