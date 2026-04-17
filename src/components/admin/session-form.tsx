"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const sessionFormSchema = z.object({
  game_set_id: z.string().uuid(),
  title: z.string().trim().min(3),
  duration_seconds: z.coerce.number().int().positive().max(7200)
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

export function SessionForm({
  gameSets
}: {
  gameSets: Array<{ id: string; title: string }>;
}): JSX.Element {
  const router = useRouter();

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      game_set_id: gameSets[0]?.id,
      title: "",
      duration_seconds: 180
    }
  });

  async function onSubmit(values: SessionFormValues): Promise<void> {
    try {
      const response = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      const contentType = response.headers.get("content-type") ?? "";
      const body = contentType.includes("application/json")
        ? ((await response.json()) as { error?: string; session?: { id: string } })
        : ({ error: await response.text() } as { error?: string; session?: { id: string } });

      if (!response.ok || !body.session) {
        throw new Error(body.error ?? "Failed to create session");
      }

      toast.success("Session created");
      router.push(`/admin/sessions/${body.session.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create session");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Game Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="game_set_id">Game set</Label>
            <select
              id="game_set_id"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              {...form.register("game_set_id")}
            >
              {gameSets.map((gameSet) => (
                <option key={gameSet.id} value={gameSet.id}>
                  {gameSet.title}
                </option>
              ))}
            </select>
            <p className="text-xs text-destructive">{form.formState.errors.game_set_id?.message}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Session title</Label>
            <Input id="title" {...form.register("title")} placeholder="Weekend Room Challenge" />
            <p className="text-xs text-destructive">{form.formState.errors.title?.message}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration_seconds">Duration (seconds)</Label>
            <Input id="duration_seconds" type="number" min={30} max={7200} {...form.register("duration_seconds")} />
            <p className="text-xs text-destructive">{form.formState.errors.duration_seconds?.message}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/sessions")}>Cancel</Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating..." : "Create session"}
        </Button>
      </div>
    </form>
  );
}
