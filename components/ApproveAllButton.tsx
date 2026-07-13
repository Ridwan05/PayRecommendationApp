"use client";

import SubmitButton from "./SubmitButton";

export default function ApproveAllButton({
  action,
  count,
}: {
  action: (formData: FormData) => void;
  count: number;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Approve all ${count} pending recommendation${count === 1 ? "" : "s"}?`)) {
          e.preventDefault();
        }
      }}
    >
      <SubmitButton className="btn-primary">Approve all ({count})</SubmitButton>
    </form>
  );
}
