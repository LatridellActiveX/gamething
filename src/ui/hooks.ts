import { useEffect, useRef, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Tracks the user's prefers-reduced-motion setting and updates live when it changes. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION_QUERY).matches);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReduced(query.matches);
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * Smoothly eases a displayed number towards its target value (purely visual).
 * Falls back to the raw value when reduced motion is requested.
 */
export function useTweenedNumber(target: number, durationMs = 650, disabled = false): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);

  useEffect(() => {
    if (disabled || !Number.isFinite(target)) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }
    const from = displayRef.current;
    const delta = target - from;
    if (Math.abs(delta) < 0.005) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + delta * eased;
      displayRef.current = value;
      setDisplay(value);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, disabled]);

  return display;
}
