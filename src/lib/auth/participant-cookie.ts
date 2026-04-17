import crypto from "node:crypto";

import { cookies } from "next/headers";

import { env } from "@/lib/utils/env";

const COOKIE_NAME = "participant_session";
const COOKIE_TTL_SECONDS = 60 * 60 * 8;

export interface ParticipantCookiePayload {
  sessionId: string;
  participantId: string;
  token: string;
  issuedAt: number;
}

function signPayload(payloadBase64: string): string {
  const secret = env.PARTICIPANT_COOKIE_SECRET;
  if (!secret) {
    throw new Error("Missing environment variable: PARTICIPANT_COOKIE_SECRET");
  }

  return crypto.createHmac("sha256", secret).update(payloadBase64).digest("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function isParticipantCookieConfigured(): boolean {
  return Boolean(env.PARTICIPANT_COOKIE_SECRET);
}

export async function setParticipantCookie(payload: ParticipantCookiePayload): Promise<void> {
  const cookieStore = await cookies();
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(encodedPayload);

  cookieStore.set(COOKIE_NAME, `${encodedPayload}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_TTL_SECONDS,
    path: "/"
  });
}

export async function clearParticipantCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function readParticipantCookie(): Promise<ParticipantCookiePayload | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(COOKIE_NAME)?.value;

    if (!raw) {
      return null;
    }

    if (!env.PARTICIPANT_COOKIE_SECRET) {
      return null;
    }

    const [payloadBase64, signature] = raw.split(".");

    if (!payloadBase64 || !signature) {
      return null;
    }

    if (signPayload(payloadBase64) !== signature) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf8")) as ParticipantCookiePayload;

    if (!parsed.sessionId || !parsed.participantId || !parsed.token || !parsed.issuedAt) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
