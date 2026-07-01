"use client";

import { useState } from "react";
import { reviewRecommendation } from "@/app/(app)/actions";
import SubmitButton from "./SubmitButton";

export default function ReviewPanel({ id }: { id: string }) {
  const [note, setNote] = useState("");

  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold text-slate-900">CEO Decision</h2>
      <form className="mt-4 space-y-4">
        <input type="hidden" name="id" value={id} />
        <div>
          <label className="label">Note (optional — recommended when rejecting)</label>
          <textarea name="review_note" rows={3} className="input" value={note}
            onChange={(e) => setNote(e.target.value)} placeholder="Reason or comments…" />
        </div>
        <div className="flex gap-3">
          <SubmitButton
            className="btn-primary"
            formAction={(fd) => {
              fd.set("decision", "approved");
              return reviewRecommendation(fd);
            }}
          >
            Approve
          </SubmitButton>
          <SubmitButton
            className="btn-danger"
            formAction={(fd) => {
              fd.set("decision", "rejected");
              return reviewRecommendation(fd);
            }}
          >
            Reject
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
