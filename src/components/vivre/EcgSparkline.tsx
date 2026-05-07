import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type Props = {
  data: number[];
  color: string;
  width?: number;
  height?: number;
  loading?: boolean;
};

function buildSmoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x} ${points[0].y}`;
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function EcgSparkline({ data, color, width = 280, height = 36, loading = false }: Props) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const [pathLen, setPathLen] = useState(0);

  if (loading) {
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
        <line
          x1={0} y1={height / 2} x2={width} y2={height / 2}
          stroke={color} strokeOpacity={0.25} strokeWidth={1.25} strokeDasharray="4 6"
          className="ecg-shimmer"
        />
      </svg>
    );
  }

  if (!data || data.length < 3) {
    return (
      <div className="flex h-9 items-center justify-center text-[10px] text-text-secondary/50">
        Awaiting signal…
      </div>
    );
  }

  const slice = data.slice(-20);
  const min = Math.min(...slice);
  const max = Math.max(...slice);
  const range = max - min || 1;
  const pad = 4;
  const innerH = height - pad * 2;
  const points = slice.map((v, i) => ({
    x: (i / (slice.length - 1)) * width,
    y: pad + innerH - ((v - min) / range) * innerH,
  }));
  const d = buildSmoothPath(points);
  const last = points[points.length - 1];

  // Recompute total length when data changes
  useEffect(() => {
    if (pathRef.current) setPathLen(pathRef.current.getTotalLength());
  }, [d]);

  return (
    <svg
      width="100%" height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: "visible", display: "block" }}
      aria-hidden
    >
      <motion.path
        ref={pathRef}
        key={`${slice.length}-${last.y.toFixed(2)}`}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ strokeDasharray: pathLen || 1000, strokeDashoffset: pathLen || 1000, opacity: 0 }}
        animate={{ strokeDashoffset: 0, opacity: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{ filter: `drop-shadow(0 0 3px ${color}88)` }}
      />
      <motion.circle
        cx={last.x} cy={last.y} r={3}
        fill={color}
        animate={{ scale: [1, 1.6, 1], opacity: [0.9, 0.5, 0.9] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: `${last.x}px ${last.y}px`, filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}