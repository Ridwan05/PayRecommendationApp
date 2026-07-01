export function naira(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "₦ 0.00";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(value);
}

export function num(v: FormDataEntryValue | null): number | null {
  if (v === null) return null;
  const s = String(v).replace(/,/g, "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
