"use server";

import { redirect } from "next/navigation";

import { adminSignIn, adminSignOut } from "@/lib/auth/admin";
import { adminLoginSchema } from "@/lib/validations/schemas";

export async function loginAction(
  _: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | undefined> {
  const payload = adminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!payload.success) {
    return { error: payload.error.issues[0]?.message ?? "Invalid credentials format" };
  }

  const result = await adminSignIn(payload.data.email, payload.data.password);
  if (!result.success) {
    return { error: result.message ?? "Unable to login" };
  }

  redirect("/admin/dashboard");
}

export async function logoutAction(): Promise<void> {
  await adminSignOut();
  redirect("/admin/login");
}
