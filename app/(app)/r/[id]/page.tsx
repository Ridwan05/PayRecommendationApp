import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RecommendationForm from "@/components/RecommendationForm";
import ReviewPanel from "@/components/ReviewPanel";
import StatusBadge from "@/components/StatusBadge";
import SubmitButton from "@/components/SubmitButton";
import { naira } from "@/lib/format";
import type { Recommendation, Role } from "@/lib/types";
import { updateRecommendation, deleteRecommendation } from "../../actions";

export const dynamic = "force-dynamic";

export default async function RecommendationDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: rec }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("recommendations").select("*").eq("id", params.id).single(),
  ]);

  if (!rec) notFound();

  const role = (profile?.role ?? "hr") as Role;
  const r = rec as Recommendation;

  const isEditable =
    ["hr", "admin"].includes(role) && ["pending", "rejected"].includes(r.status);
  const canReview = ["ceo", "admin"].includes(role) && r.status === "pending";
  const isAdmin = role === "admin";

  const update = updateRecommendation.bind(null, r.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:underline">← Back</Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-900">{r.staff_name}</h1>
            <StatusBadge status={r.status} />
          </div>
        </div>
        {isAdmin && (
          <form action={deleteRecommendation}>
            <input type="hidden" name="id" value={r.id} />
            <SubmitButton className="btn-ghost text-xs">Delete</SubmitButton>
          </form>
        )}
      </div>

      {r.status === "approved" && (
        <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          Approved — this recommendation is locked and can no longer be edited.
          {r.review_note && <div className="mt-1 text-emerald-700">Note: {r.review_note}</div>}
        </div>
      )}
      {r.status === "rejected" && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          Rejected{r.review_note ? `: ${r.review_note}` : "."} HR can edit and resubmit.
        </div>
      )}

      <RecommendationForm
        action={update}
        initial={r}
        editable={isEditable}
        submitLabel={r.status === "rejected" ? "Update & resubmit" : "Save changes"}
      />

      {canReview && <ReviewPanel id={r.id} />}

      <div className="card p-6 text-xs text-slate-500">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div><span className="block text-slate-400">Annual Gross Fee</span>{naira(r.annual_gross_fee)}</div>
          <div><span className="block text-slate-400">Created</span>{new Date(r.created_at).toLocaleString()}</div>
          <div><span className="block text-slate-400">Last updated</span>{new Date(r.updated_at).toLocaleString()}</div>
          <div><span className="block text-slate-400">Reviewed</span>{r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : "—"}</div>
        </div>
      </div>
    </div>
  );
}
