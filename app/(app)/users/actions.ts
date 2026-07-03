"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/types";

const ROLES: Role[] = ["admin", "ceo", "hr"];

// Verify the caller is an admin before doing anything with the service-role
// client (which bypasses RLS). Returns the admin's own user id.
async function requireAdmin(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Only an admin can manage users.");
  return user.id;
}

export async function createUser(formData: FormData) {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const full_name = String(formData.get("full_name") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "hr") as Role;
  if (!email) throw new Error("Email is required.");
  if (!ROLES.includes(role)) throw new Error("Invalid role.");

  const admin = createAdminClient();
  if (!admin) throw new Error("Server is missing SUPABASE_SERVICE_ROLE_KEY — cannot create users.");

  // Passwordless: create a confirmed user with no password (login is by email code).
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name, role },
  });
  if (error) throw new Error(error.message);

  // The handle_new_user trigger creates the profile from metadata; upsert makes
  // the role/name authoritative regardless.
  const { error: pErr } = await admin
    .from("profiles")
    .upsert({ id: data.user.id, email, full_name, role }, { onConflict: "id" });
  if (pErr) throw new Error(pErr.message);

  revalidatePath("/users");
}

export async function updateUserRole(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const role = String(formData.get("role")) as Role;
  if (!ROLES.includes(role)) throw new Error("Invalid role.");

  const admin = createAdminClient();
  if (!admin) throw new Error("Server is missing SUPABASE_SERVICE_ROLE_KEY.");

  const { error } = await admin.from("profiles").update({ role }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/users");
}

export async function deleteUser(formData: FormData) {
  const adminId = await requireAdmin();
  const id = String(formData.get("id"));
  if (id === adminId) throw new Error("You cannot delete your own account.");

  const admin = createAdminClient();
  if (!admin) throw new Error("Server is missing SUPABASE_SERVICE_ROLE_KEY.");

  // Clear references first so the recommendations FK doesn't block deletion.
  await admin.from("recommendations").update({ created_by: null }).eq("created_by", id);
  await admin.from("recommendations").update({ reviewed_by: null }).eq("reviewed_by", id);

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);
  revalidatePath("/users");
}
