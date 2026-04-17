import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage(): Promise<JSX.Element> {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();

  const [{ count: gameSetCount }, { count: sessionCount }, { count: liveCount }, { count: participantCount }] = await Promise.all([
    supabase.from("game_sets").select("id", { count: "exact", head: true }),
    supabase.from("game_sessions").select("id", { count: "exact", head: true }),
    supabase.from("game_sessions").select("id", { count: "exact", head: true }).eq("status", "live"),
    supabase.from("participants").select("id", { count: "exact", head: true })
  ]);

  return (
    <AdminShell title="Dashboard">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Game Sets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{gameSetCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{sessionCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{liveCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{participantCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link href="/admin/game-sets/new">Create game set</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/sessions/new">Create session</Link>
        </Button>
      </div>
    </AdminShell>
  );
}
