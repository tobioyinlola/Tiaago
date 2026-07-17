"use client";

import { Line } from "react-chartjs-2";

export type DashboardLineChartProps = {
  labels: string[];
  data: number[];
  fill?: string;
  areaFill?: string;
  label?: string;
};

// A labeled line chart (visible axes) for full-size 30/90-day trend charts --
// distinct from DashboardAreaChart, which is a compact axis-less sparkline
// used inside MetricItem cards.
const DashboardLineChart = ({
  labels,
  data,
  fill = "#7367F0",
  areaFill = "#EDEBFE",
  label = "",
}: DashboardLineChartProps) => {
  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            label,
            data,
            fill: { target: "origin", above: areaFill },
            borderColor: fill,
            tension: 0.35,
            pointRadius: 0,
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: { legend: { display: !!label } },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
          y: { grid: { color: "#F1F1F1" } },
        },
      }}
    />
  );
};

export default DashboardLineChart;
