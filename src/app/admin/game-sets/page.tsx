import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { DeleteGameSetButton } from "@/components/admin/delete-game-set-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/admin";
import { listGameSets } from "@/lib/services/game-set-service";

export default async function GameSetsPage(): Promise<JSX.Element> {
  await requireAdmin();
  const gameSets = await listGameSets();

  return (
    <AdminShell title="Game Sets">
      <div className="mb-4 flex justify-end">
        <Button asChild>
          <Link href="/admin/game-sets/new">New game set</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All game sets</CardTitle>
        </CardHeader>
        <CardContent>
          {gameSets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No game sets created yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Image path</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gameSets.map((gameSet) => (
                  <TableRow key={gameSet.id}>
                    <TableCell>{gameSet.title}</TableCell>
                    <TableCell className="max-w-xs truncate">{gameSet.description}</TableCell>
                    <TableCell className="font-mono text-xs">{gameSet.image_path}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/game-sets/${gameSet.id}/edit`}>Edit</Link>
                        </Button>
                        <DeleteGameSetButton id={gameSet.id} />
                      </div>
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
