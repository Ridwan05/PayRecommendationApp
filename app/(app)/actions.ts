"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { num } from "@/lib/format";
import { notifyCeoOfPending, notifyHrOfDecision } from "@/lib/email";
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
  return {
    staff_name: String(formData.get("staff_name") ?? "").trim(),
    designation: String(formData.get("designation") ?? "").trim() || null,
    components: String(formData.get("components") ?? "").trim() || null,
    current_pay: num(formData.get("current_pay")),
    expectation: num(formData.get("expectation")),
    years_experience: num(formData.get("years_experience")),
    monthly_consultancy_fee: num(formData.get("monthly_consultancy_fee")) ?? 0,
    year_end_fee: num(formData.get("year_end_fee")) ?? 0,
    performance_fee: num(formData.get("performance_fee")) ?? 0,
    upkeep_fee: num(formData.get("upkeep_fee")) ?? 0,
  };
}

export async function createRecommendation(formData: FormData) {
  const auth = await getRole();
  if (!auth || !["hr", "admin"].includes(auth.role)) {
    throw new Error("Not authorised to create recommendations.");
  }
  const supabase = createClient();
  const payload = detailsFrom(formData);
  if (!payload.staff_name) throw new Error("Staff name is required.");

  const { data, error } = await supabase
    .from("recommendations")
    .insert({ ...payload, created_by: auth.userId, status: "pending" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  await notifyCeoOfPending(data as Recommendation, true);
  revalidatePath("/");
  redirect(`/r/${data.id}`);
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
  await notifyCeoOfPending(data as Recommendation, false);
  revalidatePath("/");
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
  revalidatePath(`/r/${id}`);
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
  redirect("/");
}
