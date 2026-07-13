"use client";

import { useState } from "react";
import { naira } from "@/lib/format";
import SubmitButton from "./SubmitButton";

type Row = {
  staff_name: string;
  designation: string;
  years_experience: string;
  components: string;
  current_pay: string;
  expectation: string;
  monthly_consultancy_fee: string;
  year_end_fee: string;
  performance_fee: string;
  upkeep_fee: string;
};

const EMPTY: Row = {
  staff_name: "",
  designation: "",
  years_experience: "",
  components: "",
  current_pay: "",
  expectation: "",
  monthly_consultancy_fee: "",
  year_end_fee: "",
  performance_fee: "",
  upkeep_fee: "",
};

const numv = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

export default function BatchRecommendationForm({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY }]);

  const update = (i: number, key: keyof Row, val: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  const addRow = () => setRows((rs) => [...rs, { ...EMPTY }]);
  const removeRow = (i: number) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs));

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="payload" value={JSON.stringify(rows)} />

      {rows.map((r, i) => {
        const annualConsultancy = numv(r.monthly_consultancy_fee) * 12;
        const annualGross =
          annualConsultancy + numv(r.year_end_fee) + numv(r.performance_fee) + numv(r.upkeep_fee);
        return (
          <section key={i} className="card space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Candidate {i + 1}</h2>
              {rows.length > 1 && (
                <button type="button" onClick={() => removeRow(i)} className="btn-ghost text-xs">
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Candidate Name<span className="text-red-500">*</span></label>
                <input className="input" required value={r.staff_name}
                  onChange={(e) => update(i, "staff_name", e.target.value)} />
              </div>
              <div>
                <label className="label">Designation</label>
                <input className="input" value={r.designation}
                  onChange={(e) => update(i, "designation", e.target.value)} />
              </div>
              <div>
                <label className="label">Years of Experience</label>
                <input type="number" step="0.5" min="0" className="input" value={r.years_experience}
                  onChange={(e) => update(i, "years_experience", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Components</label>
                <textarea rows={2} className="input" value={r.components}
                  onChange={(e) => update(i, "components", e.target.value)}
                  placeholder="e.g. Basic, housing, transport…" />
              </div>
              <div>
                <label className="label">Current Pay (₦)</label>
                <input type="number" step="0.01" min="0" className="input" value={r.current_pay}
                  onChange={(e) => update(i, "current_pay", e.target.value)} />
              </div>
              <div>
                <label className="label">Expectation (₦)</label>
                <input type="number" step="0.01" min="0" className="input" value={r.expectation}
                  onChange={(e) => update(i, "expectation", e.target.value)} />
              </div>

              <div>
                <label className="label">Monthly Consultancy Fee (₦)</label>
                <input type="number" step="0.01" min="0" className="input" value={r.monthly_consultancy_fee}
                  onChange={(e) => update(i, "monthly_consultancy_fee", e.target.value)} />
              </div>
              <div>
                <label className="label">Annual Consultancy Pay (₦) — auto</label>
                <input className="input" value={naira(annualConsultancy)} readOnly tabIndex={-1} />
              </div>
              <div>
                <label className="label">Year End Fee (₦)</label>
                <input type="number" step="0.01" min="0" className="input" value={r.year_end_fee}
                  onChange={(e) => update(i, "year_end_fee", e.target.value)} />
              </div>
              <div>
                <label className="label">Performance / Success Fee (₦)</label>
                <input type="number" step="0.01" min="0" className="input" value={r.performance_fee}
                  onChange={(e) => update(i, "performance_fee", e.target.value)} />
              </div>
              <div>
                <label className="label">Upkeep Fee (₦)</label>
                <input type="number" step="0.01" min="0" className="input" value={r.upkeep_fee}
                  onChange={(e) => update(i, "upkeep_fee", e.target.value)} />
              </div>
              <div>
                <label className="label">Annual Gross Fee (₦) — auto</label>
                <input className="input font-semibold text-brand" value={naira(annualGross)} readOnly tabIndex={-1} />
              </div>
            </div>
          </section>
        );
      })}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={addRow} className="btn-ghost text-sm">
          + Add another candidate
        </button>
        <SubmitButton>
          Submit {rows.length > 1 ? `${rows.length} recommendations` : "recommendation"} for approval
        </SubmitButton>
      </div>
    </form>
  );
}
