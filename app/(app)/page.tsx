import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import { naira } from "@/lib/format";
import type { Recommendation, Status } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = createClient();
  const { data } = await supabase
    .from("recommendations")
    .select("id, staff_name, designation, annual_gross_fee, status, created_at")
    .order("created_at", { ascending: false });

  const recs = (data ?? []) as Pick<
    Recommendation,
    "id" | "staff_name" | "designation" | "annual_gross_fee" | "status" | "created_at"
  >[];

  const counts = recs.reduce(
    (acc, r) => ((acc[r.status] = (acc[r.status] ?? 0) + 1), acc),
    {} as Record<Status, number>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Recommendations</h1>
        <div className="flex gap-2 text-xs">
          <StatusBadge status="pending" /> <span className="text-slate-500">{counts.pending ?? 0}</span>
          <StatusBadge status="approved" /> <span className="text-slate-500">{counts.approved ?? 0}</span>
          <StatusBadge status="rejected" /> <span className="text-slate-500">{counts.rejected ?? 0}</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Staff</th>
              <th className="px-4 py-3 font-medium">Designation</th>
              <th className="px-4 py-3 font-medium text-right">Annual Gross Fee</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  No recommendations yet.
                </td>
              </tr>
            )}
            {recs.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/r/${r.id}`} className="font-medium text-brand hover:underline">
                    {r.staff_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.designation ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{naira(r.annual_gross_fee)}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
