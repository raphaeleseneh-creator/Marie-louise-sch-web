// Shared status pill for the staff workspace and the parent portal.
// Colour follows meaning (done / needs attention / problem), and the text always states the
// status too, so colour is never the only cue.
const SUCCESS = new Set(["published", "paid", "active", "present", "approved", "confirmed", "accepted", "completed"]);
const WARNING = new Set(["pending", "partially_paid", "late", "contacted", "new", "no children linked"]);
const DANGER = new Set(["unpaid", "overdue", "absent", "declined", "cancelled", "deactivated"]);

const tones = {
  success: "bg-[#E7F6EE] text-[#06603F] ring-[#BFE5D1]",
  warning: "bg-[#FFF4D6] text-[#7A4A00] ring-[#F4D98F]",
  danger: "bg-[#FDECEA] text-[#A3261B] ring-[#F5C2BC]",
  neutral: "bg-[#F1ECF6] text-[#4A1774] ring-[#DDD0EA]",
};

export function statusTone(value: string): keyof typeof tones {
  if (SUCCESS.has(value)) return "success";
  if (WARNING.has(value)) return "warning";
  if (DANGER.has(value)) return "danger";
  return "neutral";
}

/** "bank_transfer" → "Bank transfer" */
export function humanize(value: unknown) {
  const text = String(value ?? "").replaceAll("_", " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "—";
}

export function StatusBadge({ value, fallback = "draft" }: { value: unknown; fallback?: string }) {
  const text = String(value ?? fallback);
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${tones[statusTone(text)]}`}>
    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />{humanize(text)}
  </span>;
}

/** Placeholder rows shown while records load; announced once to screen readers. */
export function LoadingBlock({ label = "Loading records…", rows = 4 }: { label?: string; rows?: number }) {
  return <div role="status" aria-live="polite" className="rounded-xl border border-[#E5DFE9] bg-white p-5">
    <span className="sr-only">{label}</span>
    <div aria-hidden="true" className="animate-pulse space-y-4 motion-reduce:animate-none">
      <div className="h-4 w-1/3 rounded bg-[#ECE6F1]" />
      {Array.from({ length: rows }, (_, i) => <div key={i} className="flex gap-4"><div className="h-3 flex-1 rounded bg-[#F1ECF6]" /><div className="h-3 w-1/4 rounded bg-[#F1ECF6]" /><div className="h-3 w-1/6 rounded bg-[#F1ECF6]" /></div>)}
    </div>
  </div>;
}

/** First focusable element on a page: lets keyboard users jump past navigation. */
export function SkipLink({ target }: { target: string }) {
  return <a href={`#${target}`} className="sr-only z-[60] rounded-lg bg-[#E9DB3D] px-4 py-3 text-sm font-extrabold text-[#29166F] focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to main content</a>;
}
