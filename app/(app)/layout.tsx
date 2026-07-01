import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

const roleLabel: Record<Role, string> = { admin: "Admin", ceo: "CEO", hr: "HR" };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role ?? "hr") as Role;
  const canCreate = role === "hr" || role === "admin";

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm font-semibold text-brand">
            Pay Recommendation App
          </Link>
          <div className="flex items-center gap-4">
            {canCreate && (
              <Link href="/new" className="btn-primary text-xs">+ New</Link>
            )}
            <div className="text-right">
              <div className="text-sm font-medium text-slate-800">
                {profile?.full_name ?? profile?.email}
              </div>
              <div className="text-xs text-slate-500">{roleLabel[role]}</div>
            </div>
            <form action="/auth/signout" method="post">
              <button className="btn-ghost text-xs">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
