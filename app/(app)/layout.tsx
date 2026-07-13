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
  const canReview = role === "ceo" || role === "admin";
  const isAdmin = role === "admin";

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex min-w-0 items-center gap-2 text-sm font-semibold text-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/dreef-logo.png" alt="Dreef" className="h-7 w-auto shrink-0 sm:h-8" />
            <span className="hidden truncate sm:inline">Pay Recommendation App</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            {canReview && (
              <Link href="/pending" className="text-xs font-medium text-slate-600 hover:text-brand">
                Pending
              </Link>
            )}
            {isAdmin && (
              <Link href="/users" className="text-xs font-medium text-slate-600 hover:text-brand">
                Users
              </Link>
            )}
            {canCreate && (
              <Link href="/new" className="btn-primary text-xs">+ New</Link>
            )}
            <div className="hidden text-right sm:block">
              <div className="max-w-[12rem] truncate text-sm font-medium text-slate-800">
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
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
