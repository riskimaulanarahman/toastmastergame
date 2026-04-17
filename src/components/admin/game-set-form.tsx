"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GameSetWithAnswers } from "@/types/game";

const answerEditorSchema = z.object({
  item_number: z.number().int().min(1).max(10),
  answer_text: z.string().trim().min(1),
  aliases_text: z.string().trim().optional()
});

const gameSetFormSchema = z.object({
  title: z.string().trim().min(3),
  description: z.string().trim().min(3),
  image_path: z.string().trim().min(3),
  answers: z.array(answerEditorSchema).length(10)
});

type GameSetFormValues = z.infer<typeof gameSetFormSchema>;

function createDefaultAnswers(): GameSetFormValues["answers"] {
  return Array.from({ length: 10 }, (_, index) => ({
    item_number: index + 1,
    answer_text: "",
    aliases_text: ""
  }));
}

function toDefaultValues(initialData?: GameSetWithAnswers): GameSetFormValues {
  if (!initialData) {
    return {
      title: "",
      description: "",
      image_path: "",
      answers: createDefaultAnswers()
    };
  }

  const answersMap = new Map(initialData.game_set_answers.map((item) => [item.item_number, item]));

  return {
    title: initialData.title,
    description: initialData.description ?? "",
    image_path: initialData.image_path,
    answers: Array.from({ length: 10 }, (_, idx) => {
      const itemNumber = idx + 1;
      const existing = answersMap.get(itemNumber);

      return {
        item_number: itemNumber,
        answer_text: existing?.answer_text ?? "",
        aliases_text: existing?.accepted_aliases.join(", ") ?? ""
      };
    })
  };
}

export function GameSetForm({ initialData }: { initialData?: GameSetWithAnswers }): JSX.Element {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<GameSetFormValues>({
    resolver: zodResolver(gameSetFormSchema),
    defaultValues: useMemo(() => toDefaultValues(initialData), [initialData])
  });

  const isEdit = Boolean(initialData);

  async function uploadImage(file: File): Promise<void> {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/game-sets/upload-image", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as { error?: string; path?: string; publicUrl?: string };

      if (!response.ok || !payload.path) {
        throw new Error(payload.error ?? "Failed to upload image");
      }

      form.setValue("image_path", payload.path, { shouldValidate: true });
      setImagePreview(payload.publicUrl ?? null);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: GameSetFormValues): Promise<void> {
    const payload = {
      title: values.title,
      description: values.description,
      image_path: values.image_path,
      answers: values.answers.map((answer) => ({
        item_number: answer.item_number,
        answer_text: answer.answer_text,
        accepted_aliases: answer.aliases_text
          ? answer.aliases_text
              .split(",")
              .map((alias) => alias.trim())
              .filter(Boolean)
          : []
      }))
    };

    try {
      const endpoint = isEdit ? `/api/admin/game-sets/${initialData?.id}` : "/api/admin/game-sets";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save game set");
      }

      toast.success(`Game set ${isEdit ? "updated" : "created"}`);
      router.push("/admin/game-sets");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save game set");
    }
  }

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Game Set</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...form.register("title")} />
            <p className="text-xs text-destructive">{form.formState.errors.title?.message}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...form.register("description")} />
            <p className="text-xs text-destructive">{form.formState.errors.description?.message}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_path">Image Path</Label>
            <Input id="image_path" {...form.register("image_path")} placeholder="game-sets/room-01.png" />
            <div className="flex items-center gap-3">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadImage(file);
                  }
                }}
              />
            </div>
            {uploading ? <p className="text-xs text-muted-foreground">Uploading image...</p> : null}
            {(imagePreview || form.watch("image_path")) && (
              <div className="overflow-hidden rounded-lg border">
                <img
                  src={
                    imagePreview ??
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "game-images"}/${form.watch("image_path")}`
                  }
                  alt="Uploaded preview"
                  className="h-44 w-full object-cover"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">Upload stores to Supabase Storage and fills image path automatically.</p>
            <p className="text-xs text-destructive">{form.formState.errors.image_path?.message}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Answers and Aliases (1-10)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.watch("answers").map((answer, index) => (
            <div key={answer.item_number} className="grid gap-3 rounded-lg border p-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`answer-${index}`}>Item {answer.item_number} official answer</Label>
                <Input id={`answer-${index}`} {...form.register(`answers.${index}.answer_text`)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`aliases-${index}`}>Aliases (comma separated)</Label>
                <Input id={`aliases-${index}`} {...form.register(`answers.${index}.aliases_text`)} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/game-sets")}>Cancel</Button>
        <Button type="submit" disabled={form.formState.isSubmitting || uploading}>
          {form.formState.isSubmitting ? "Saving..." : isEdit ? "Update game set" : "Create game set"}
        </Button>
      </div>
    </form>
  );
}
