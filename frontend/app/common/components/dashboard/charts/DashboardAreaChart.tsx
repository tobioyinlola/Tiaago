"use client";

import { Line } from "react-chartjs-2";

const DashboardAreaChart = ({
  data = [65, 59, 80, 81, 56, 55, 40],
  fill = "#12B76A",
  areaFill = "#ECFDF3",
}) => {
  return (
    <Line
      data={{
        labels: data,
        datasets: [
          {
            data,
            fill: {
              target: "origin",
              above: areaFill,
            },
            borderColor: fill,
            tension: 0.5,
            pointBackgroundColor: "transparent",
            pointBorderColor: "transparent",
          },
        ],
      }}
      options={{
        scales: {
          x: {
            display: false,
          },
          y: {
            display: false,
          },
        },
        responsive: true,
      }}
    />
  );
};

export default DashboardAreaChart;
