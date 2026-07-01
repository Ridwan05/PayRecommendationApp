"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }, // only pre-provisioned users
    });
    setLoading(false);
    // Move to the code step regardless, so we don't reveal which emails exist.
    if (error && !/not allowed|signups|user not found/i.test(error.message)) {
      setError(error.message);
      return;
    }
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) {
      setError("That code is invalid or has expired. Request a new one.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold text-brand">Pay Recommendation App</h1>
        <p className="mt-1 text-sm text-slate-500">
          {step === "email" ? "Sign in with your work email" : `Enter the code sent to ${email}`}
        </p>

        {step === "email" ? (
          <form onSubmit={sendCode} className="mt-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@dreef.org"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "Sending code…" : "Email me a sign-in code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="mt-6 space-y-4">
            <div>
              <label className="label">6-digit code</label>
              <input
                className="input tracking-[0.3em] text-center text-lg"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="Enter the code from the email"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary w-full" disabled={loading || code.length < 6}>
              {loading ? "Verifying…" : "Verify & sign in"}
            </button>
            {/* Supabase email OTP length is configurable (this project uses 8). */}
            <button
              type="button"
              className="btn-ghost w-full text-xs"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
            >
              ← Use a different email
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
