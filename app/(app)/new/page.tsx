import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BatchRecommendationForm from "@/components/BatchRecommendationForm";
import { createRecommendations } from "../actions";

export default async function NewRecommendation() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["hr", "admin"].includes(profile.role)) {
    return (
      <div className="card p-6">
        <p className="text-sm text-slate-600">Only HR or an admin can create recommendations.</p>
        <Link href="/" className="btn-ghost mt-4">Back</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:underline">← Back</Link>
        <h1 className="mt-2 text-lg font-semibold text-slate-900">New Pay Recommendations</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add one or more candidates, then submit them all for approval at once.
        </p>
      </div>
      <BatchRecommendationForm action={createRecommendations} />
    </div>
  );
}
