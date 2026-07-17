"use client";

import { Bar } from "react-chartjs-2";

export type DashboardBarChartProps = {
  labels: string[];
  data: number[];
  fill?: string;
  label?: string;
  horizontal?: boolean;
};

const DashboardBarChart = ({
  labels,
  data,
  fill = "#7367F0",
  label = "",
  horizontal = false,
}: DashboardBarChartProps) => {
  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            label,
            data,
            backgroundColor: fill,
            borderRadius: 4,
          },
        ],
      }}
      options={{
        indexAxis: horizontal ? "y" : "x",
        responsive: true,
        plugins: {
          legend: { display: !!label },
        },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { display: false } },
        },
      }}
    />
  );
};

export default DashboardBarChart;
