import { AdminShell } from "@/components/admin/admin-shell";
import { GameSetForm } from "@/components/admin/game-set-form";
import { requireAdmin } from "@/lib/auth/admin";
import { getGameSetById } from "@/lib/services/game-set-service";

export default async function EditGameSetPage({ params }: { params: Promise<{ id: string }> }): Promise<JSX.Element> {
  await requireAdmin();

  const { id } = await params;
  const gameSet = await getGameSetById(id);

  return (
    <AdminShell title="Edit Game Set">
      <GameSetForm initialData={gameSet} />
    </AdminShell>
  );
}
