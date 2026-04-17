import { AdminShell } from "@/components/admin/admin-shell";
import { GameSetForm } from "@/components/admin/game-set-form";
import { requireAdmin } from "@/lib/auth/admin";

export default async function NewGameSetPage(): Promise<JSX.Element> {
  await requireAdmin();

  return (
    <AdminShell title="Create Game Set">
      <GameSetForm />
    </AdminShell>
  );
}
