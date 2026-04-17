"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { JoinSessionInput } from "@/lib/validations/schemas";
import { joinSessionSchema } from "@/lib/validations/schemas";

export function JoinSessionForm({ sessionId }: { sessionId: string }): JSX.Element {
  const router = useRouter();
  const form = useForm<JoinSessionInput>({
    resolver: zodResolver(joinSessionSchema),
    defaultValues: {
      display_name: ""
    }
  });

  async function onSubmit(values: JoinSessionInput): Promise<void> {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      const contentType = response.headers.get("content-type") ?? "";
      const body = contentType.includes("application/json")
        ? ((await response.json()) as { error?: string })
        : ({ error: await response.text() } as { error?: string });

      if (!response.ok) {
        throw new Error(body.error ?? "Unable to join session");
      }

      toast.success("Joined waiting room");
      router.push(`/play/${sessionId}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to join session");
    }
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input id="display_name" placeholder="Your nickname" {...form.register("display_name")} />
        <p className="text-xs text-destructive">{form.formState.errors.display_name?.message}</p>
      </div>
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Joining..." : "Join waiting room"}
      </Button>
    </form>
  );
}
