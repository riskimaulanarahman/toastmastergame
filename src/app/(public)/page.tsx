import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export default async function HomePage(): Promise<JSX.Element> {
  noStore();

  const supabase = createServiceRoleClient();

  const { data: sessions } = await supabase
    .from("game_sessions")
    .select("id, title, status, end_at")
    .in("status", ["scheduled", "live", "finished"])
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Active and Recent Sessions</CardTitle>
          <CardDescription>Join a waiting room, watch live status, or open finished results.</CardDescription>
        </CardHeader>
      </Card>

      {sessions && sessions.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg">{session.title}</CardTitle>
                  <Badge
                    variant={
                      session.status === "scheduled" ? "outline" : session.status === "live" ? "default" : "secondary"
                    }
                  >
                    {session.status.toUpperCase()}
                  </Badge>
                </div>
                <CardDescription>
                  {session.status === "scheduled"
                    ? "Waiting room is open. Join now and wait for admin to start."
                    : session.end_at
                      ? `Ends at ${new Date(session.end_at).toLocaleString()}`
                      : "No end time"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                {session.status === "scheduled" ? (
                  <Button asChild>
                    <Link href={`/play/${session.id}/join`}>Join Waiting Room</Link>
                  </Button>
                ) : null}
                {session.status === "live" ? (
                  <Button type="button" variant="secondary" disabled>
                    In Progress (Late Join Closed)
                  </Button>
                ) : null}
                <Button variant="outline" asChild>
                  <Link href={`/play/${session.id}/result`}>View Results</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              No waiting, live, or finished sessions are available yet. Ask admin to publish a waiting room first.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
