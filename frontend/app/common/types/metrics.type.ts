type RecruiterMetrics = [
  {
    title: "Open Positions";
    valueLastMonth: number; // open positions last month
    valueThisMonth: number; // open positions this month
    currentVal: number; // total open positions
  },
  {
    title: "Applications Received";
    valueLastMonth: number; // job applications recieved last month
    valueThisMonth: number; // job applications recieved this month
    currentVal: number; // total job applications recieved
  },
  {
    title: "Talents Hired";
    valueLastMonth: number; // talents hired last month
    valueThisMonth: number; // talents hired this month
    currentVal: number; // total talents hired
  }
];

type TalentMetrics = [
  {
    title: "Jobs Applied";
    valueLastMonth: number; // job applications sent last month
    valueThisMonth: number; // job applications sent this month
    currentVal: number; // total job applications sent
  },
  {
    title: "Active Contracts";
    valueLastMonth: number; // contracts created last month
    valueThisMonth: number; // contracts created this month
    currentVal: number; // total monetary value of active contracts
  },
  {
    title: "Jobs Matched";
    valueLastMonth: number; // contracts created last month
    valueThisMonth: number; // contracts created this month
    currentVal: number; // total active contracts
  }
];

type AdminMetrics = {
  "User Details": AdminUserMetrics;
  "Talent Details": AdminTalentMetrics;
  "Recruiter Details": AdminRecruiterMetrics;
  Contracts: AdminContractMetrics;
  "Registrations this month": AdminRegistrationMetrics;
};

type AdminUserMetrics = [
  {
    title: "Total Users";
    valueLastMonth: number; // accounts created last month
    valueThisMonth: number; // accounts created this month
    currentVal: number; // total accounts created
  },
  {
    title: "Talents";
    valueLastMonth: number; // talent accounts created last month
    valueThisMonth: number; // talent accounts created this month
    currentVal: number; // total talent accounts created
  },
  {
    title: "Recruiters";
    valueLastMonth: number; // recruiter accounts created last month
    valueThisMonth: number; // recruiter accounts created this month
    currentVal: number; // total recruiter accounts created
  }
];

type AdminTalentMetrics = [
  {
    title: "Free Talents";
    valueLastMonth: number; // free talent accounts created last month
    valueThisMonth: number; // free talent accounts created this month
    currentVal: number; // total free talent accounts created
  },
  {
    title: "Basic Talents";
    valueLastMonth: number; // basic talent accounts created last month
    valueThisMonth: number; // basic talent accounts created this month
    currentVal: number; // total basic talent accounts created
  },
  {
    title: "Pro Talents";
    valueLastMonth: number; // premium talent accounts created last month
    valueThisMonth: number; // premium talent accounts created this month
    currentVal: number; // total premium talent accounts created
  }
];

type AdminRecruiterMetrics = [
  {
    title: "Free Recruiters";
    valueLastMonth: number; // free recruiter accounts created last month
    valueThisMonth: number; // free recruiter accounts created this month
    currentVal: number; // total free recruiter accounts created
  },
  {
    title: "Basic Recruiters";
    valueLastMonth: number; // basic recruiter accounts created last month
    valueThisMonth: number; // basic recruiter accounts created this month
    currentVal: number; // total basic recruiter accounts created
  },
  {
    title: "Pro Recruiters";
    valueLastMonth: number; // premium recruiter accounts created last month
    valueThisMonth: number; // premium recruiter accounts created this month
    currentVal: number; // total premium recruiter accounts created
  }
];

type AdminContractMetrics = [
  {
    title: "Active Contracts";
    valueLastMonth: number; // active contracts last month
    valueThisMonth: number; // active contracts this month
    currentVal: number; // total monetary value of active contracts
  },
  {
    title: "Completed Contracts";
    valueLastMonth: number; // contracts completed last month
    valueThisMonth: number; // contracts completed ( or expires ) this month
    currentVal: number; // total monetary value of completed contracts
  }
];

type AdminRegistrationMetrics = [
    {
      title: "Total Registrations";
      valueLastMonth: number; // talent and recruiter accounts created last month
      valueThisMonth: number; // talent and recruiter accounts created this month
      currentVal: number; // talent and recruiter accounts created this month
    },
    {
      title: "Talent Registrations";
      valueLastMonth: number; // talent accounts created last month
      valueThisMonth: number; // talent accounts created this month
      currentVal: number; // talent accounts created this month
    },
    {
      title: "Recruiter Registrations";
      valueLastMonth: number; // recruiter accounts created last month
      valueThisMonth: number; // recruiter accounts created this month
      currentVal: number; // recruiter accounts created this month
    }
  ];