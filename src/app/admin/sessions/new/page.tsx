import { AdminShell } from "@/components/admin/admin-shell";
import { SessionForm } from "@/components/admin/session-form";
import { requireAdmin } from "@/lib/auth/admin";
import { listGameSets } from "@/lib/services/game-set-service";

export default async function NewSessionPage(): Promise<JSX.Element> {
  await requireAdmin();
  const gameSets = await listGameSets();

  return (
    <AdminShell title="Create Session">
      {gameSets.length === 0 ? (
        <p className="text-sm text-muted-foreground">Create at least one game set first.</p>
      ) : (
        <SessionForm gameSets={gameSets.map((item) => ({ id: item.id, title: item.title }))} />
      )}
    </AdminShell>
  );
}
