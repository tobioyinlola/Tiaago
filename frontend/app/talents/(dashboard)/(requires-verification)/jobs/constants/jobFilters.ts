export const jobFilters = [
  {
    name: "Location" as const,
    options: [
      {
        name: "Remote",
        value: "remote",
      },
      {
        name: "Current Location",
        value: "current-location",
      },
    ],
  },
  {
    name: "Salary" as const,
    options: [
      {
        name: "0 - 20,000",
        value: "0-20000",
      },
      {
        name: "20,000 - 40,000",
        value: "20000-40000",
      },
      {
        name: "40,000 - 60,000",
        value: "40000-60000",
      },
      {
        name: "60,000 - 80,000",
        value: "60000-80000",
      },
      {
        name: "80,000 - 100,000",
        value: "80000-100000",
      },
      {
        name: "100,000 - 120,000",
        value: "100000-120000",
      },
      {
        name: "120,000 - 140,000",
        value: "120000-140000",
      },
      {
        name: "140,000 - 160,000",
        value: "140000-160000",
      },
      {
        name: "160,000 - 180,000",
        value: "160000-180000",
      },
      {
        name: "180,000 - 200,000",
        value: "180000-200000",
      },
      {
        name: "200,000+",
        value: "200000+",
      },
    ],
  },
  {
    name: "Date Posted" as const,
    options: [
      {
        name: "All time",
        value: "all-time",
      },
      {
        name: "Last 24 hours",
        value: "24h",
      },
      {
        name: "Last 3 days",
        value: "3d",
      },
      {
        name: "Last 7 days",
        value: "7d",
      },
      {
        name: "Last 14 days",
        value: "14d",
      },
      {
        name: "Last 30 days",
        value: "30d",
      },
    ],
  },
  {
    name: "Work Experience" as const,
    options: [
      {
        name: "0 - 2 years",
        value: "0-2",
      },
      {
        name: "2 - 5 years",
        value: "2-5",
      },
      {
        name: "5 - 10 years",
        value: "5-10",
      },
      {
        name: "10+ years",
        value: "10+",
      },
    ],
  },
  {
    name: "Type of Employment" as const,
    options: [
      {
        name: "Full Time",
        value: "full-time",
      },
      {
        name: "Part Time",
        value: "part-time",
      },
      {
        name: "Contract",
        value: "contract",
      },
      {
        name: "Internship",
        value: "internship",
      },
    ],
    inputType: "checkbox" as const,
  },
];
