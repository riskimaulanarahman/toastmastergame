import crypto from "node:crypto";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { env } from "@/lib/utils/env";
import { HttpError } from "@/lib/utils/http";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function uploadGameImage(file: File): Promise<{ path: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new HttpError(400, "Unsupported image type. Use PNG, JPG, or WEBP.");
  }

  const maxBytes = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new HttpError(400, `Image size exceeds ${env.MAX_UPLOAD_SIZE_MB} MB limit.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const sanitizedExtension = /^[a-z0-9]+$/.test(extension) ? extension : "png";
  const objectPath = `game-sets/${crypto.randomUUID()}.${sanitizedExtension}`;

  const supabase = createServiceRoleClient();

  const { error } = await supabase.storage
    .from(env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET)
    .upload(objectPath, buffer, {
      contentType: file.type,
      upsert: false,
      cacheControl: "3600"
    });

  if (error) {
    throw new HttpError(500, "Failed to upload image");
  }

  return { path: objectPath };
}

export function getPublicImageUrl(path: string): string {
  const base = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET}`;
  return `${base}/${path}`;
}
