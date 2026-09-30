type MeterProps = {
  /** 0-100 */
  percent: number;
  tone?: "auto" | "green" | "cyan" | "amber" | "red";
  /** Show moving stripes while something is actively flowing. */
  active?: boolean;
  label?: string;
  className?: string;
};

/** Animated progress bar: width eases between values, colour shifts as it fills. */
export function Meter({ percent, tone = "auto", active = false, label, className = "" }: MeterProps) {
  const safe = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  const resolvedTone = tone !== "auto" ? tone : safe >= 95 ? "red" : safe >= 80 ? "amber" : "green";
  return (
    <div
      className={`meter meter-${resolvedTone} ${active ? "is-active" : ""} ${className}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safe)}
    >
      <span className="meter-fill" style={{ width: `${safe}%` }} />
    </div>
  );
}
