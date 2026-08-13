"use client";

import { m } from "framer-motion";

/** Dependency-free inline-SVG line chart -- a handful of static points per
 * series is all these sections need, so a full chart library would be
 * overkill (react-chartjs-2 is already used elsewhere in the app for real
 * data dashboards, but this is a marketing illustration with fixed
 * points). Viewbox is 0-100 on both axes; series values are 0-100. Each
 * line draws itself in on scroll-into-view via animated pathLength. */
type Series = { points: number[]; color: string; dashed?: boolean };

const toPath = (points: number[]) => {
  const step = 100 / (points.length - 1);
  return points.map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${100 - v}`).join(" ");
};

const SimpleLineGraph = ({ series, height = 180 }: { series: Series[]; height?: number }) => (
  <svg viewBox='0 0 100 100' preserveAspectRatio='none' style={{ height, width: "100%" }} aria-hidden>
    {[25, 50, 75].map(y => (
      <line key={y} x1={0} x2={100} y1={y} y2={y} stroke='#EAECF0' strokeWidth={0.5} />
    ))}
    {series.map((s, i) => (
      <m.path
        key={i}
        d={toPath(s.points)}
        fill='none'
        stroke={s.color}
        strokeWidth={2}
        strokeDasharray={s.dashed ? "4 3" : undefined}
        vectorEffect='non-scaling-stroke'
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 1.2, ease: "easeInOut", delay: i * 0.15 }}
      />
    ))}
  </svg>
);

export default SimpleLineGraph;
