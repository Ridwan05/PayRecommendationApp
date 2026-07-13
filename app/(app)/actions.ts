"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { num } from "@/lib/format";
import { notifyCeoOfNewBatch, notifyCeoOfResubmit, notifyHrOfDecision } from "@/lib/email";
import type { Recommendation, Role } from "@/lib/types";

async function getRole(): Promise<{ userId: string; role: Role } | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  return { userId: user.id, role: profile.role as Role };
}

function detailsFrom(formData: FormData) {
  return detailsFromRow(Object.fromEntries(formData.entries()));
}

// Parse one candidate's fields from a plain object (a FormData entry map or a
// row from the batch form's JSON payload).
function detailsFromRow(row: Record<string, unknown>) {
  const str = (k: string) => String(row[k] ?? "").trim();
  return {
    staff_name: str("staff_name"),
    designation: str("designation") || null,
    components: str("components") || null,
    current_pay: num(str("current_pay") || null),
    expectation: num(str("expectation") || null),
    years_experience: num(str("years_experience") || null),
    monthly_consultancy_fee: num(str("monthly_consultancy_fee") || null) ?? 0,
    year_end_fee: num(str("year_end_fee") || null) ?? 0,
    performance_fee: num(str("performance_fee") || null) ?? 0,
    upkeep_fee: num(str("upkeep_fee") || null) ?? 0,
  };
}

// Create one or many recommendations from the batch form's JSON payload.
export async function createRecommendations(formData: FormData) {
  const auth = await getRole();
  if (!auth || !["hr", "admin"].includes(auth.role)) {
    throw new Error("Not authorised to create recommendations.");
  }

  let rows: Record<string, unknown>[];
  try {
    rows = JSON.parse(String(formData.get("payload") ?? "[]"));
  } catch {
    throw new Error("Could not read the form data.");
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Add at least one candidate.");
  }

  const payloads = rows.map((r) => ({
    ...detailsFromRow(r),
    created_by: auth.userId,
    status: "pending" as const,
  }));
  if (payloads.some((p) => !p.staff_name)) {
    throw new Error("Every candidate needs a name.");
  }

  const supabase = createClient();
  const { error } = await supabase.from("recommendations").insert(payloads);
  if (error) throw new Error(error.message);

  await notifyCeoOfNewBatch(payloads.length);
  revalidatePath("/");
  revalidatePath("/pending");
  redirect("/");
}

export async function updateRecommendation(id: string, formData: FormData) {
  const auth = await getRole();
  if (!auth || !["hr", "admin"].includes(auth.role)) {
    throw new Error("Not authorised to edit recommendations.");
  }
  const supabase = createClient();

  // Only editable while pending or rejected (enforced by RLS too).
  const { data: existing } = await supabase
    .from("recommendations")
    .select("status")
    .eq("id", id)
    .single();
  if (!existing) throw new Error("Recommendation not found.");
  if (!["pending", "rejected"].includes(existing.status)) {
    throw new Error("Approved recommendations cannot be edited.");
  }

  const payload = detailsFrom(formData);
  if (!payload.staff_name) throw new Error("Staff name is required.");

  // Re-editing a rejected recommendation returns it to pending.
  const { data, error } = await supabase
    .from("recommendations")
    .update({ ...payload, status: "pending", review_note: null })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  await notifyCeoOfResubmit(data as Recommendation);
  revalidatePath("/");
  revalidatePath("/pending");
  revalidatePath(`/r/${id}`);
  redirect(`/r/${id}`);
}

export async function reviewRecommendation(formData: FormData) {
  const auth = await getRole();
  if (!auth || !["ceo", "admin"].includes(auth.role)) {
    throw new Error("Only the CEO or an admin can approve or reject.");
  }
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision"));
  const note = String(formData.get("review_note") ?? "").trim() || null;
  if (!["approved", "rejected"].includes(decision)) {
    throw new Error("Invalid decision.");
  }

  const supabase = createClient();

  // Only pending recommendations can be reviewed — approved/rejected are locked
  // (also enforced by RLS). Prevents re-deciding an already-resolved record.
  const { data: existing } = await supabase
    .from("recommendations")
    .select("status")
    .eq("id", id)
    .single();
  if (!existing) throw new Error("Recommendation not found.");
  if (existing.status !== "pending") {
    throw new Error("Only pending recommendations can be reviewed.");
  }

  const { data, error } = await supabase
    .from("recommendations")
    .update({
      status: decision,
      review_note: note,
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  await notifyHrOfDecision(data as Recommendation);
  revalidatePath("/");
  revalidatePath("/pending");
  revalidatePath(`/r/${id}`);
}

// Approve every pending recommendation at once (CEO/Admin only).
export async function approveAll() {
  const auth = await getRole();
  if (!auth || !["ceo", "admin"].includes(auth.role)) {
    throw new Error("Only the CEO or an admin can approve.");
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recommendations")
    .update({
      status: "approved",
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("status", "pending")
    .select("*");

  if (error) throw new Error(error.message);
  const recs = (data ?? []) as Recommendation[];
  // Notify each recommendation's HR author of the decision.
  await Promise.all(recs.map((r) => notifyHrOfDecision(r)));
  revalidatePath("/");
  revalidatePath("/pending");
}

export async function deleteRecommendation(formData: FormData) {
  const auth = await getRole();
  if (!auth || auth.role !== "admin") {
    throw new Error("Only an admin can delete recommendations.");
  }
  const id = String(formData.get("id"));
  const supabase = createClient();
  const { error } = await supabase.from("recommendations").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/pending");
  redirect("/");
}
