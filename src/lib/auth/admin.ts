import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { env } from "@/lib/utils/env";
import { HttpError } from "@/lib/utils/http";

export interface AdminGuardResult {
  userId: string;
}

type ProfileRole = "admin" | "participant";
type AdminAuthReason = "unauthenticated" | "not_admin" | "profile_missing" | "role_lookup_failed";

interface RoleLookupResult {
  role: ProfileRole | null;
  lookupFailed: boolean;
}

export interface AdminAuthState {
  userId: string | null;
  role: ProfileRole | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  reason: AdminAuthReason | null;
}

function parseProfileRole(value: unknown): ProfileRole | null {
  if (value === "admin" || value === "participant") {
    return value;
  }

  return null;
}

async function lookupRoleWithServiceKey(userId: string): Promise<RoleLookupResult> {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return { role: null, lookupFailed: true };
  }

  try {
    const serviceClient = createServiceRoleClient();
    const { data, error } = await serviceClient.from("profiles").select("role").eq("id", userId).maybeSingle();

    if (error) {
      return { role: null, lookupFailed: true };
    }

    const role = parseProfileRole((data as { role?: unknown } | null)?.role);
    return { role, lookupFailed: false };
  } catch {
    return { role: null, lookupFailed: true };
  }
}

async function lookupRoleWithSession(userId: string): Promise<RoleLookupResult> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();

  if (error) {
    return { role: null, lookupFailed: true };
  }

  const role = parseProfileRole((data as { role?: unknown } | null)?.role);
  return { role, lookupFailed: false };
}

async function getRoleForUser(userId: string): Promise<RoleLookupResult> {
  const serviceResult = await lookupRoleWithServiceKey(userId);
  if (!serviceResult.lookupFailed) {
    return serviceResult;
  }

  return lookupRoleWithSession(userId);
}

export async function getAdminAuthState(): Promise<AdminAuthState> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      userId: null,
      role: null,
      isAuthenticated: false,
      isAdmin: false,
      reason: "unauthenticated"
    };
  }

  const { role, lookupFailed } = await getRoleForUser(user.id);

  if (role === "admin") {
    return {
      userId: user.id,
      role,
      isAuthenticated: true,
      isAdmin: true,
      reason: null
    };
  }

  if (role === "participant") {
    return {
      userId: user.id,
      role,
      isAuthenticated: true,
      isAdmin: false,
      reason: "not_admin"
    };
  }

  return {
    userId: user.id,
    role: null,
    isAuthenticated: true,
    isAdmin: false,
    reason: lookupFailed ? "role_lookup_failed" : "profile_missing"
  };
}

function loginRedirectByReason(reason: AdminAuthReason): string {
  if (reason === "unauthenticated") {
    return "/admin/login";
  }

  return `/admin/login?error=${reason}`;
}

function adminApiErrorByReason(reason: AdminAuthReason): HttpError {
  switch (reason) {
    case "unauthenticated":
      return new HttpError(401, "Authentication required");
    case "not_admin":
      return new HttpError(403, "This account is not an admin");
    case "profile_missing":
      return new HttpError(403, "Profile not found for this account");
    case "role_lookup_failed":
      return new HttpError(500, "Unable to verify admin role. Check SUPABASE_SERVICE_ROLE_KEY and profiles access.");
    default:
      return new HttpError(403, "Admin access required");
  }
}

export async function requireAdmin(): Promise<AdminGuardResult> {
  const authState = await getAdminAuthState();
  if (!authState.isAdmin || !authState.userId) {
    redirect(loginRedirectByReason(authState.reason ?? "unauthenticated"));
  }

  return { userId: authState.userId };
}

export async function requireAdminApi(): Promise<AdminGuardResult> {
  const authState = await getAdminAuthState();
  if (!authState.isAdmin || !authState.userId) {
    throw adminApiErrorByReason(authState.reason ?? "unauthenticated");
  }

  return { userId: authState.userId };
}

export async function adminSignIn(email: string, password: string): Promise<{ success: boolean; message?: string }> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, message: "Invalid admin credentials" };
  }

  const userId = data.user?.id;

  if (!userId) {
    return { success: false, message: "Unable to create session" };
  }

  const roleResult = await getRoleForUser(userId);

  if (!roleResult.role && roleResult.lookupFailed) {
    await supabase.auth.signOut();
    return {
      success: false,
      message: "Unable to verify admin role. Check SUPABASE_SERVICE_ROLE_KEY and profiles table access."
    };
  }

  if (!roleResult.role) {
    await supabase.auth.signOut();
    return { success: false, message: "Profile not found for this account. Ensure a row exists in public.profiles." };
  }

  if (roleResult.role !== "admin") {
    await supabase.auth.signOut();
    return { success: false, message: "This account is not an admin (profiles.role must be 'admin')." };
  }

  return { success: true };
}

export async function adminSignOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
}
