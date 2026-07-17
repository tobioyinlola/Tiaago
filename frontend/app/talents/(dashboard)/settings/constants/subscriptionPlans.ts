export const subscriptionPlans = [
  {
    name: "Pro Plan",
    details: "Our most popular plan for talents",
    price: "$9.99",
    benefits: [
      "Connect with up to 25 recruiters per month",
      "Skill assessments and personalized recommendations",
      "Access to curated learning materials and tutorials",
      "Exclusive career coaching sessions",
    ],
    period: "Monthly" as const,
  },
  {
    name: "Enterprise Plan",
    details: "Our recommended plan for talents",
    price: "$19.99",
    benefits: [
      "Priority job application visibility",
      "FAll Direct contact with recruiter representatives",
      "Participation in exclusive industry events and networking groups",
      "Personalized career development plan with dedicated coach",
    ],
    period: "Monthly" as const,
  },
];
