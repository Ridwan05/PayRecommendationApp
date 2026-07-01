"use client";
import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children,
  className = "btn-primary",
  formAction,
}: {
  children: React.ReactNode;
  className?: string;
  formAction?: (formData: FormData) => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} formAction={formAction}>
      {pending ? "Working…" : children}
    </button>
  );
}
