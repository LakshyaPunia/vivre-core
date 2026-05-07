import { animate, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function CountUp({ value, decimals = 0, duration = 0.8 }: { value: number; decimals?: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    if (!inView && display === 0) return;
    const controls = animate(prev.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return controls.stop;
  }, [value, inView, duration]);

  return <span ref={ref} className="tabular-nums">{display.toFixed(decimals)}</span>;
}
