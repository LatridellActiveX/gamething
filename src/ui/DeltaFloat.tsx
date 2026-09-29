import { useEffect, useRef, useState } from "react";

type Floater = { id: number; text: string; positive: boolean };

type DeltaFloatProps = {
  value: number;
  format: (delta: number) => string;
  /** Minimum absolute change before a floater is emitted. */
  threshold?: number;
  /** Throttle window: at most one floater per interval, showing the accumulated change. */
  intervalMs?: number;
  disabled?: boolean;
};

let floaterSeq = 0;

/** Emits throttled "+$120" style floating numbers when a watched value changes. */
export function DeltaFloat({ value, format, threshold = 0.5, intervalMs = 3000, disabled = false }: DeltaFloatProps) {
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const valueRef = useRef(value);
  const baselineRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (disabled) {
      setFloaters([]);
      return;
    }
    baselineRef.current = valueRef.current;
    const timers = new Set<number>();
    const interval = window.setInterval(() => {
      const delta = valueRef.current - baselineRef.current;
      baselineRef.current = valueRef.current;
      if (!Number.isFinite(delta) || Math.abs(delta) < threshold) return;
      const floater = { id: ++floaterSeq, text: format(delta), positive: delta >= 0 };
      setFloaters((current) => [...current.slice(-2), floater]);
      const timer = window.setTimeout(() => {
        setFloaters((current) => current.filter((item) => item.id !== floater.id));
        timers.delete(timer);
      }, 1600);
      timers.add(timer);
    }, intervalMs);
    return () => {
      window.clearInterval(interval);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
    // format is intentionally excluded: callers pass inline functions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, intervalMs, threshold]);

  return (
    <span className="delta-float-layer" aria-hidden="true">
      {floaters.map((floater) => (
        <span key={floater.id} className={`delta-float ${floater.positive ? "up" : "down"}`}>{floater.text}</span>
      ))}
    </span>
  );
}
