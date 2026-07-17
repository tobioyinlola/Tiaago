"use client";

import { Doughnut } from "react-chartjs-2";

export type DashboardDonutChartProps = {
  labels: string[];
  data: number[];
  colors?: string[];
};

const DEFAULT_COLORS = ["#7367F0", "#12B76A", "#F79009", "#F04438", "#0BA5EC", "#EE46BC"];

const DashboardDonutChart = ({ labels, data, colors = DEFAULT_COLORS }: DashboardDonutChartProps) => {
  return (
    <Doughnut
      data={{
        labels,
        datasets: [
          {
            data,
            backgroundColor: labels.map((_, i) => colors[i % colors.length]),
            borderWidth: 0,
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: {
          legend: { position: "bottom" as const },
        },
      }}
    />
  );
};

export default DashboardDonutChart;
