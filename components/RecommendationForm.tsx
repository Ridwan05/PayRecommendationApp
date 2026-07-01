"use client";

import { useState } from "react";
import { naira } from "@/lib/format";
import type { Recommendation } from "@/lib/types";
import SubmitButton from "./SubmitButton";

type Props = {
  action: (formData: FormData) => void;
  initial?: Partial<Recommendation>;
  editable: boolean;
  submitLabel: string;
};

export default function RecommendationForm({ action, initial, editable, submitLabel }: Props) {
  const [monthly, setMonthly] = useState(Number(initial?.monthly_consultancy_fee ?? 0));
  const [yearEnd, setYearEnd] = useState(Number(initial?.year_end_fee ?? 0));
  const [perf, setPerf] = useState(Number(initial?.performance_fee ?? 0));
  const [upkeep, setUpkeep] = useState(Number(initial?.upkeep_fee ?? 0));

  const annualConsultancy = monthly * 12;
  const annualGross = annualConsultancy + yearEnd + perf + upkeep;

  const n = (v: number) => (Number.isFinite(v) ? v : 0);

  return (
    <form action={action} className="space-y-8">
      {/* Section 1 — Details */}
      <section className="card p-6">
        <h2 className="text-base font-semibold text-slate-900">1. Details</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Name<span className="text-red-500">*</span></label>
            <input name="staff_name" className="input" required disabled={!editable}
              defaultValue={initial?.staff_name ?? ""} />
          </div>
          <div>
            <label className="label">Designation</label>
            <input name="designation" className="input" disabled={!editable}
              defaultValue={initial?.designation ?? ""} />
          </div>
          <div>
            <label className="label">Years of Experience</label>
            <input name="years_experience" type="number" step="0.5" min="0" className="input"
              disabled={!editable} defaultValue={initial?.years_experience ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Components</label>
            <textarea name="components" rows={2} className="input" disabled={!editable}
              defaultValue={initial?.components ?? ""}
              placeholder="e.g. Basic, housing, transport…" />
          </div>
          <div>
            <label className="label">Current Pay (₦)</label>
            <input name="current_pay" type="number" step="0.01" min="0" className="input"
              disabled={!editable} defaultValue={initial?.current_pay ?? ""} />
          </div>
          <div>
            <label className="label">Expectation (₦)</label>
            <input name="expectation" type="number" step="0.01" min="0" className="input"
              disabled={!editable} defaultValue={initial?.expectation ?? ""} />
          </div>
        </div>
      </section>

      {/* Section 2 — Recommendation */}
      <section className="card p-6">
        <h2 className="text-base font-semibold text-slate-900">2. Recommendation</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Monthly Consultancy Fee (₦)</label>
            <input name="monthly_consultancy_fee" type="number" step="0.01" min="0" className="input"
              disabled={!editable} defaultValue={initial?.monthly_consultancy_fee ?? 0}
              onChange={(e) => setMonthly(n(parseFloat(e.target.value)))} />
          </div>
          <div>
            <label className="label">Annual Consultancy Pay (₦) — auto</label>
            <input className="input" value={naira(annualConsultancy)} readOnly tabIndex={-1} />
          </div>
          <div>
            <label className="label">Year End Fee (₦)</label>
            <input name="year_end_fee" type="number" step="0.01" min="0" className="input"
              disabled={!editable} defaultValue={initial?.year_end_fee ?? 0}
              onChange={(e) => setYearEnd(n(parseFloat(e.target.value)))} />
          </div>
          <div>
            <label className="label">Performance / Success Fee (₦)</label>
            <input name="performance_fee" type="number" step="0.01" min="0" className="input"
              disabled={!editable} defaultValue={initial?.performance_fee ?? 0}
              onChange={(e) => setPerf(n(parseFloat(e.target.value)))} />
          </div>
          <div>
            <label className="label">Upkeep Fee (₦)</label>
            <input name="upkeep_fee" type="number" step="0.01" min="0" className="input"
              disabled={!editable} defaultValue={initial?.upkeep_fee ?? 0}
              onChange={(e) => setUpkeep(n(parseFloat(e.target.value)))} />
          </div>
          <div>
            <label className="label">Annual Gross Fee (₦) — auto</label>
            <input className="input font-semibold text-brand" value={naira(annualGross)} readOnly tabIndex={-1} />
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Annual Consultancy Pay = Monthly × 12. Annual Gross Fee = Annual Consultancy Pay +
          Year End + Performance + Upkeep. Both are calculated automatically.
        </p>
      </section>

      {editable && (
        <div className="flex justify-end">
          <SubmitButton>{submitLabel}</SubmitButton>
        </div>
      )}
    </form>
  );
}
