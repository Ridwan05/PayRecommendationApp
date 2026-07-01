# Pay Recommendation App

Internal tool for **HR** to submit staff pay recommendations for the **CEO** to
approve or reject, with an **Admin** who can do everything. Built with Next.js
(App Router) on the frontend (deploy to Vercel) and Supabase for auth + database.

## Roles
- **HR** — create recommendations; edit them **only while status is Pending or Rejected**.
- **CEO** — approve or reject pending recommendations (with an optional note).
- **Admin** — full access: create, edit, review, delete, and manage user roles.

## Form
**1. Details:** Name, Designation, Components, Current Pay, Expectation, Years of Experience.

**2. Recommendation:** Monthly Consultancy Fee, Annual Consultancy Pay, Year End Fee,
Performance/Success Fee, Upkeep Fee, Annual Gross Fee.

All money is in Naira (₦). Two fields are calculated automatically:
- **Annual Consultancy Pay** = Monthly Consultancy Fee × 12
- **Annual Gross Fee** = Annual Consultancy Pay + Year End Fee + Performance/Success Fee + Upkeep Fee

## Workflow / edit rules
- A new recommendation starts as **Pending**.
- HR/Admin can edit while **Pending** or **Rejected**. Editing a Rejected one resends it as Pending.
- CEO/Admin approve or reject a Pending one. **Approved records are locked** (no more edits).
- These rules are enforced both in the app and by Supabase Row Level Security.
- **Only pending recommendations can be approved/rejected** — once resolved, a record is locked against further review decisions (app + RLS).

## Email notifications
- When a recommendation is **submitted or resubmitted** (status becomes *Pending*), the **CEO** (and any admins) get an email.
- When the CEO **approves or rejects**, the **HR** author gets an email with the decision and any note.
- Notifications are sent via [Resend](https://resend.com). If the email env vars are not set, sending is skipped silently and the core workflow is unaffected.

---

## Setup

### 1. Create a Supabase project
At https://supabase.com create a project. Then in **SQL Editor**, paste and run
[`supabase/schema.sql`](supabase/schema.sql). This creates the tables, the
auto-calculated columns, and all security policies.

### 2. Create users and assign roles
In Supabase **Authentication → Users → Add user**, create one user per person
(email + password). A profile row is created automatically for each. Then in
**SQL Editor** run [`supabase/seed_roles.sql`](supabase/seed_roles.sql) after
editing the emails to set who is `admin`, `ceo`, and `hr`. New users default to `hr`.

### 3. Environment variables
Copy `.env.local.example` to `.env.local` and fill in from
**Supabase → Project Settings → API**:
```
NEXT_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```
For email notifications also set (all optional — omit to disable email):
```
SUPABASE_SERVICE_ROLE_KEY=<service_role key>   # server-only; looks up recipient emails
RESEND_API_KEY=re_...                          # from resend.com
EMAIL_FROM="Pay Recommendations <noreply@yourdomain.com>"
NEXT_PUBLIC_APP_URL=https://<your-app>.vercel.app
```

### 4. Run locally
```
npm install
npm run dev
```
Open http://localhost:3000 and sign in.

---

## Deploy to Vercel
1. Push this folder to a GitHub repo.
2. In Vercel, **Add New → Project** and import the repo (framework auto-detected as Next.js).
3. Under **Environment Variables** add the same two `NEXT_PUBLIC_SUPABASE_*` values.
4. Deploy. That's it — no other config needed.
5. In Supabase **Authentication → URL Configuration**, add your Vercel URL to the
   allowed redirect/site URLs.

## Tech
Next.js 14 · React 18 · TypeScript · Tailwind CSS · @supabase/ssr (cookie-based auth).

## Project structure
```
app/
  login/                 sign-in page
  (app)/                 authenticated area (dashboard, new, detail)
    actions.ts           server actions: create / update / review / delete
  auth/signout/          sign-out route
lib/supabase/            browser + server + middleware Supabase clients
components/              form, review panel, status badge
supabase/schema.sql      run once to set up the database
supabase/seed_roles.sql  assign roles by email
```
