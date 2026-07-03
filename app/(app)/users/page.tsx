import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubmitButton from "@/components/SubmitButton";
import type { Profile, Role } from "@/lib/types";
import { createUser, updateUserRole, deleteUser } from "./actions";

export const dynamic = "force-dynamic";

const ROLES: Role[] = ["admin", "ceo", "hr"];
const roleLabel: Record<Role, string> = { admin: "Admin", ceo: "CEO", hr: "HR" };

export default async function UsersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") {
    return (
      <div className="card p-6">
        <p className="text-sm text-slate-600">Only an admin can manage users.</p>
        <Link href="/" className="btn-ghost mt-4">Back</Link>
      </div>
    );
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .order("role");
  const users = (data ?? []) as Profile[];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:underline">← Back</Link>
        <h1 className="mt-2 text-lg font-semibold text-slate-900">Users &amp; Roles</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add people and set their role. New users sign in passwordless with an email code.
        </p>
      </div>

      {/* Add user */}
      <form action={createUser} className="card space-y-4 p-6">
        <h2 className="text-base font-semibold text-slate-900">Add a user</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Email<span className="text-red-500">*</span></label>
            <input name="email" type="email" required className="input" placeholder="person@company.com" />
          </div>
          <div>
            <label className="label">Full name</label>
            <input name="full_name" className="input" placeholder="Jane Doe" />
          </div>
          <div>
            <label className="label">Role</label>
            <select name="role" defaultValue="hr" className="input">
              {ROLES.map((r) => (
                <option key={r} value={r}>{roleLabel[r]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <SubmitButton className="btn-primary w-full sm:w-auto">Add user</SubmitButton>
          </div>
        </div>
      </form>

      {/* Existing users */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-800">{u.full_name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <form action={updateUserRole} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <select name="role" defaultValue={u.role} className="input h-9 w-28 py-1">
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{roleLabel[r]}</option>
                      ))}
                    </select>
                    <SubmitButton className="btn-ghost text-xs">Save</SubmitButton>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.id === user.id ? (
                    <span className="text-xs text-slate-400">You</span>
                  ) : (
                    <form action={deleteUser}>
                      <input type="hidden" name="id" value={u.id} />
                      <SubmitButton className="btn-danger text-xs">Delete</SubmitButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
