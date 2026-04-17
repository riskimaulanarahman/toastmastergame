import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/login-form";
import { getAdminAuthState } from "@/lib/auth/admin";

function mapLoginNotice(errorCode?: string): string | undefined {
  switch (errorCode) {
    case "not_admin":
      return "This account is signed in but does not have admin access.";
    case "profile_missing":
      return "Admin profile was not found. Ensure this user exists in public.profiles.";
    case "role_lookup_failed":
      return "Unable to verify admin role right now. Check server configuration and try again.";
    default:
      return undefined;
  }
}

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<JSX.Element> {
  const authState = await getAdminAuthState();

  if (authState.isAdmin) {
    redirect("/admin/dashboard");
  }

  const params = await searchParams;
  const queryError = typeof params.error === "string" ? params.error : undefined;
  const implicitError = authState.isAuthenticated && !authState.isAdmin ? (authState.reason ?? undefined) : undefined;
  const notice = mapLoginNotice(queryError ?? implicitError);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <AdminLoginForm notice={notice} />
    </main>
  );
}
