import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { TOTAL_ITEMS } from "@/lib/utils/constants";
import { HttpError } from "@/lib/utils/http";
import type { GameSetInput } from "@/lib/validations/schemas";
import type { Database, DbTable } from "@/types/database";
import type { GameSetWithAnswers } from "@/types/game";

export async function listGameSets(): Promise<GameSetWithAnswers[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("game_sets")
    .select("*, game_set_answers(*)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new HttpError(500, "Unable to load game sets");
  }

  return (data ?? []) as GameSetWithAnswers[];
}

export async function getGameSetById(id: string): Promise<GameSetWithAnswers> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase.from("game_sets").select("*, game_set_answers(*)").eq("id", id).single();

  if (error || !data) {
    throw new HttpError(404, "Game set not found");
  }

  return data as GameSetWithAnswers;
}

export async function upsertGameSet(input: GameSetInput, actorId: string, gameSetId?: string): Promise<DbTable<"game_sets">> {
  if (input.answers.length !== TOTAL_ITEMS) {
    throw new HttpError(400, "Exactly 10 answers are required");
  }

  const supabase = createServiceRoleClient();

  const payload: Database["public"]["Tables"]["game_sets"]["Insert"] = {
    title: input.title,
    description: input.description,
    image_path: input.image_path,
    total_items: TOTAL_ITEMS,
    created_by: actorId
  };

  let targetId = gameSetId;

  if (gameSetId) {
    const { error: updateError } = await supabase.from("game_sets").update(payload).eq("id", gameSetId);
    if (updateError) {
      throw new HttpError(400, "Failed to update game set");
    }
  } else {
    const { data: created, error: createError } = await supabase.from("game_sets").insert(payload).select("*").single();
    if (createError || !created) {
      throw new HttpError(400, "Failed to create game set");
    }
    targetId = created.id;
  }

  if (!targetId) {
    throw new HttpError(500, "Missing game set id");
  }

  const answersPayload = input.answers.map((entry) => ({
    game_set_id: targetId,
    item_number: entry.item_number,
    answer_text: entry.answer_text,
    accepted_aliases: entry.accepted_aliases
  }));

  const { error: answersError } = await supabase.from("game_set_answers").upsert(answersPayload, {
    onConflict: "game_set_id,item_number"
  });

  if (answersError) {
    throw new HttpError(400, "Failed to save game answers");
  }

  const { data, error } = await supabase.from("game_sets").select("*").eq("id", targetId).single();
  if (error || !data) {
    throw new HttpError(500, "Unable to read saved game set");
  }

  return data;
}

export async function deleteGameSet(id: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("game_sets").delete().eq("id", id);

  if (error) {
    throw new HttpError(400, "Failed to delete game set");
  }
}

export async function getGameSetImageSignedUrl(path: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient();

  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "game-images";

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 30);
  if (error || !data) {
    return null;
  }

  return data.signedUrl;
}
