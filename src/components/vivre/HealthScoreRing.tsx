import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

const colorFor = (s: number) => {
  if (s < 40) return { stroke: "#EF4444", glow: "#EF4444", band: "Critical" };
  if (s < 60) return { stroke: "#F59E0B", glow: "#F59E0B", band: "Poor" };
  if (s < 75) return { stroke: "#3B82F6", glow: "#3B82F6", band: "Fair" };
  if (s < 90) return { stroke: "#10B981", glow: "#10B981", band: "Good" };
  return { stroke: "#06B6D4", glow: "#06B6D4", band: "Excellent" };
};

export function HealthScoreRing({ score, size = 120, strokeWidth = 8 }: { score: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const { stroke, glow, band } = colorFor(score);

  const mv = useMotionValue(0);
  const offset = useTransform(mv, (v) => c - (v / 100) * c);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(mv, score, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return controls.stop;
  }, [score, mv]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#162035" strokeWidth={strokeWidth} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          style={{ strokeDashoffset: offset, filter: `drop-shadow(0 0 8px ${glow})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-bold tabular-nums text-text-primary" style={{ fontSize: size * 0.28, textShadow: `0 0 10px ${glow}55` }}>
          {display}
        </span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-text-secondary">{band}</span>
      </div>
    </div>
  );
}
