import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { naira } from "@/lib/format";
import type { Recommendation } from "@/lib/types";

// Always copied on every notification.
const ALWAYS_CC = "people@dreef.org";

// ---------------------------------------------------------------------------
// Low-level sender — posts to the Resend REST API. If email env vars are not
// configured the call is a no-op (logged), so the core workflow never breaks
// just because notifications aren't set up. Sends both HTML and plain text,
// and always CCs ALWAYS_CC.
// ---------------------------------------------------------------------------
async function sendEmail(opts: { to: string[]; subject: string; html: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  let to = opts.to.filter(Boolean);

  // people@dreef.org is always copied; skip the CC if it's already a recipient.
  let cc = to.some((a) => a.toLowerCase() === ALWAYS_CC) ? [] : [ALWAYS_CC];
  // If there's no primary recipient, send directly to the copy address instead.
  if (to.length === 0) {
    to = cc;
    cc = [];
  }

  if (!apiKey || !from) {
    console.warn("[email] RESEND_API_KEY / EMAIL_FROM not set — skipping:", opts.subject);
    return;
  }
  if (to.length === 0) {
    console.warn("[email] No recipients — skipping:", opts.subject);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        ...(cc.length ? { cc } : {}),
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      console.error("[email] Resend error:", res.status, await res.text());
    }
  } catch (err) {
    // Never let a notification failure break the user's action.
    console.error("[email] Failed to send:", err);
  }
}

function appUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return `${base}${path}`;
}

// Shared detail lines used by both the HTML and plain-text renderers.
function detailLines(rec: Recommendation): [string, string][] {
  const lines: [string, string][] = [["Staff", rec.staff_name]];
  if (rec.designation) lines.push(["Designation", rec.designation]);
  lines.push(["Annual Gross Fee", naira(rec.annual_gross_fee)]);
  return lines;
}

function renderHtml(heading: string, bodyHtml: string, rec: Recommendation) {
  const rows = detailLines(rec)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#64748b">${label}</td><td style="padding:4px 0;font-weight:600">${value}</td></tr>`
    )
    .join("");
  const link = appUrl(`/r/${rec.id}`);
  const cta = process.env.NEXT_PUBLIC_APP_URL
    ? `<p style="margin:20px 0"><a href="${link}" style="background:#4f46e5;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:14px">View recommendation</a></p>`
    : "";
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;max-width:560px">
    <h2 style="font-size:18px;margin:0 0 4px">${heading}</h2>
    ${bodyHtml}
    <table style="font-size:14px;margin-top:12px;border-collapse:collapse">${rows}</table>
    ${cta}
    <p style="color:#94a3b8;font-size:12px;margin-top:24px">Pay Recommendation App — automated notification.</p>
  </div>`;
}

function renderText(heading: string, bodyText: string, rec: Recommendation) {
  const rows = detailLines(rec)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
  const link = process.env.NEXT_PUBLIC_APP_URL ? `\n\nView: ${appUrl(`/r/${rec.id}`)}` : "";
  return `${heading}\n\n${bodyText}\n\n${rows}${link}\n\n— Pay Recommendation App (automated notification)`;
}

// ---------------------------------------------------------------------------
// Recipient lookups (service-role; bypasses RLS).
// ---------------------------------------------------------------------------
async function emailsForRole(role: "ceo" | "hr" | "admin"): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("profiles").select("email").eq("role", role);
  return (data ?? []).map((p) => p.email).filter(Boolean);
}

async function emailForUser(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("profiles").select("email").eq("id", userId).single();
  return data?.email ? [data.email] : [];
}

// ---------------------------------------------------------------------------
// Public notification API — called from server actions.
// ---------------------------------------------------------------------------

// New or edited recommendation is now Pending → notify the CEO only.
export async function notifyCeoOfPending(rec: Recommendation, isNew: boolean) {
  // Only the CEO (the approver) is notified — admins are intentionally excluded.
  const to = await emailsForRole("ceo");
  const verb = isNew ? "submitted" : "updated and resubmitted";
  const heading = "Recommendation awaiting your approval";
  const bodyText = `A pay recommendation for ${rec.staff_name} was ${verb} and is now pending your decision.`;
  await sendEmail({
    to,
    subject: `Pay recommendation ${isNew ? "awaiting approval" : "resubmitted"}: ${rec.staff_name}`,
    html: renderHtml(
      heading,
      `<p style="font-size:14px">A pay recommendation for <strong>${rec.staff_name}</strong> was ${verb} and is now pending your decision.</p>`,
      rec
    ),
    text: renderText(heading, bodyText, rec),
  });
}

// CEO approved/rejected → notify the HR author only (admins excluded).
export async function notifyHrOfDecision(rec: Recommendation) {
  const to = await emailForUser(rec.created_by);
  const approved = rec.status === "approved";
  const heading = approved ? "Your recommendation was approved" : "Your recommendation was rejected";
  const decision = approved ? "approved" : "rejected";
  const resubmitHint = approved ? "" : " You can edit and resubmit it.";
  const noteText = rec.review_note ? `\n\nNote: ${rec.review_note}` : "";
  const noteHtml = rec.review_note
    ? `<p style="font-size:14px"><strong>Note:</strong> ${rec.review_note}</p>`
    : "";
  await sendEmail({
    to,
    subject: `Pay recommendation ${decision}: ${rec.staff_name}`,
    html: renderHtml(
      heading,
      `<p style="font-size:14px">The recommendation for <strong>${rec.staff_name}</strong> was <strong>${decision}</strong>.${resubmitHint}</p>${noteHtml}`,
      rec
    ),
    text: renderText(
      heading,
      `The recommendation for ${rec.staff_name} was ${decision}.${resubmitHint}${noteText}`,
      rec
    ),
  });
}
