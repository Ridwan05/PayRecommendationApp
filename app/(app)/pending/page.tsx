import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { naira } from "@/lib/format";
import ApproveAllButton from "@/components/ApproveAllButton";
import { approveAll } from "../actions";
import type { Recommendation, Role } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = Pick<
  Recommendation,
  | "id"
  | "staff_name"
  | "years_experience"
  | "monthly_consultancy_fee"
  | "annual_consultancy_pay"
  | "year_end_fee"
  | "upkeep_fee"
  | "annual_gross_fee"
  | "performance_fee"
>;

export default async function PendingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (me?.role ?? "hr") as Role;
  if (!["ceo", "admin"].includes(role)) {
    return (
      <div className="card p-6">
        <p className="text-sm text-slate-600">
          Only the CEO or an admin can view pending recommendations.
        </p>
        <Link href="/" className="btn-ghost mt-4">Back</Link>
      </div>
    );
  }

  const { data } = await supabase
    .from("recommendations")
    .select(
      "id, staff_name, years_experience, monthly_consultancy_fee, annual_consultancy_pay, year_end_fee, upkeep_fee, annual_gross_fee, performance_fee"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  const recs = (data ?? []) as Row[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:underline">← Back</Link>
          <h1 className="mt-2 text-lg font-semibold text-slate-900">Pending Recommendations</h1>
          <p className="mt-1 text-sm text-slate-500">
            {recs.length} awaiting your approval. Click a candidate to view full details and
            approve or reject individually.
          </p>
        </div>
        {recs.length > 0 && <ApproveAllButton action={approveAll} count={recs.length} />}
      </div>

      {recs.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">No pending recommendations.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Candidate Name</th>
                <th className="px-4 py-3 font-medium text-right">Years of Experience</th>
                <th className="px-4 py-3 font-medium text-right">Monthly Consultancy Fee</th>
                <th className="px-4 py-3 font-medium text-right">Annual Consultancy Pay (₦)</th>
                <th className="px-4 py-3 font-medium text-right">Year End Fee (₦)</th>
                <th className="px-4 py-3 font-medium text-right">Upkeep Fee (₦)</th>
                <th className="px-4 py-3 font-medium text-right">Annual Gross Fee (₦)</th>
                <th className="px-4 py-3 font-medium text-right">Performance / Success Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recs.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/r/${r.id}`} className="font-medium text-brand hover:underline">
                      {r.staff_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.years_experience ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{naira(r.monthly_consultancy_fee)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{naira(r.annual_consultancy_pay)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{naira(r.year_end_fee)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{naira(r.upkeep_fee)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{naira(r.annual_gross_fee)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{naira(r.performance_fee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
