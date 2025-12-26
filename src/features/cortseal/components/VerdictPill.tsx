import type { ClaimVerdict } from "@/features/cortseal/schemas";

export function VerdictPill({ verdict }: { verdict: ClaimVerdict }) {
  const styles: Record<ClaimVerdict, string> = {
    supported: "border-emerald-200 bg-emerald-50 text-emerald-800",
    unsupported: "border-rose-200 bg-rose-50 text-rose-800",
    unclear: "border-border bg-muted text-foreground",
  };

  const label: Record<ClaimVerdict, string> = {
    supported: "Supported",
    unsupported: "Unsupported",
    unclear: "Unclear",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles[verdict]}`}
    >
      {label[verdict]}
    </span>
  );
}

