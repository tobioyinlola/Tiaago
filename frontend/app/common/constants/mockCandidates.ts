import { Candidate, EmailTemplate } from "../types";

export const mockCandidates: Candidate[] = [
  {
    id: "1",
    name: "Olivia Rhye",
    email: "olivia@untitledui.com",
    phone: "+1 (555) 123-4567",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    role: "Product Designer",
    location: "San Francisco, CA",
    country: "United States",
    experience: "5+ years",
    skills: [
      "UI/UX Design",
      "Figma",
      "User Research",
      "Prototyping",
      "Design Systems",
    ],
    technicalScore: 37,
    culturalScore: 52,
    overallScore: 89,
    linkedIn: "linkedin.com/in/oliviarhye",
    summary:
      "Senior Product Designer with 6 years of experience creating user-centered digital products. Led design teams at Fortune 500 companies and startups alike.",
    currentCompany: "Airbnb",
    workExperience: [
      {
        company: "Airbnb",
        role: "Senior Product Designer",
        duration: "2021 - Present",
      },
      { company: "Dropbox", role: "Product Designer", duration: "2018 - 2021" },
      { company: "IDEO", role: "Design Intern", duration: "2017 - 2018" },
    ],
    education: "Stanford University - M.S. HCI",
    status: "new",
  },
  {
    id: "2",
    name: "Phoenix Baker",
    email: "phoenix@untitledui.com",
    phone: "+1 (555) 234-5678",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    role: "Backend Developer",
    location: "New York, NY",
    country: "United States",
    experience: "7+ years",
    skills: ["Node.js", "Python", "AWS", "PostgreSQL", "Microservices"],
    technicalScore: 33,
    culturalScore: 40,
    overallScore: 85,
    linkedIn: "linkedin.com/in/phoenixbaker",
    summary:
      "Experienced backend engineer specializing in distributed systems and cloud architecture. Built scalable platforms serving millions of users.",
    currentCompany: "Stripe",
    workExperience: [
      { company: "Stripe", role: "Staff Engineer", duration: "2020 - Present" },
      {
        company: "Netflix",
        role: "Senior Backend Engineer",
        duration: "2017 - 2020",
      },
      {
        company: "Twitter",
        role: "Software Engineer",
        duration: "2015 - 2017",
      },
    ],
    education: "MIT - B.S. Computer Science",
    status: "new",
  },
  {
    id: "3",
    name: "Lana Steiner",
    email: "lana@untitledui.com",
    phone: "+44 (20) 7123-4567",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    role: "UI Designer",
    location: "London, UK",
    country: "United Kingdom",
    experience: "4+ years",
    skills: ["UI Design", "Sketch", "Adobe XD", "Illustration", "Animation"],
    technicalScore: 33,
    culturalScore: 30,
    overallScore: 82,
    linkedIn: "linkedin.com/in/lanasteiner",
    summary:
      "Creative UI designer with a passion for beautiful interfaces and micro-interactions. Previously at Spotify designing their mobile experience.",
    currentCompany: "Spotify",
    workExperience: [
      {
        company: "Spotify",
        role: "Senior UI Designer",
        duration: "2020 - Present",
      },
      { company: "Revolut", role: "UI Designer", duration: "2018 - 2020" },
      { company: "Freelance", role: "UI/UX Designer", duration: "2016 - 2018" },
    ],
    education: "Royal College of Art - MA Design",
    status: "new",
  },
  {
    id: "4",
    name: "Demi Wilkinson",
    email: "demi@untitledui.com",
    phone: "+1 (555) 345-6789",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    role: "Project Manager",
    location: "Austin, TX",
    country: "United States",
    experience: "6+ years",
    skills: [
      "Agile",
      "Scrum",
      "JIRA",
      "Stakeholder Management",
      "Risk Analysis",
    ],
    technicalScore: 30,
    culturalScore: 30,
    overallScore: 78,
    linkedIn: "linkedin.com/in/demiwilkinson",
    summary:
      "PMP-certified project manager with experience leading cross-functional teams. Successfully delivered 50+ projects on time and under budget.",
    currentCompany: "Google",
    education: "UT Austin - MBA",
    status: "contacted",
  },
  {
    id: "5",
    name: "Candice Wu",
    email: "candice@untitledui.com",
    phone: "+1 (555) 456-7890",
    avatar:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
    role: "Frontend Developer",
    location: "Seattle, WA",
    country: "United States",
    experience: "4+ years",
    skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Testing"],
    technicalScore: 30,
    culturalScore: 30,
    overallScore: 77,
    linkedIn: "linkedin.com/in/candicewu",
    summary:
      "Frontend specialist focused on performance and accessibility. Core contributor to several open-source React libraries.",
    currentCompany: "Amazon",
    education: "University of Washington - B.S. CS",
    status: "new",
  },
  {
    id: "6",
    name: "Natali Craig",
    email: "natali@untitledui.com",
    phone: "+49 30 12345678",
    avatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face",
    role: "Full Stack Developer",
    location: "Berlin, Germany",
    country: "Germany",
    experience: "5+ years",
    skills: ["React", "Node.js", "GraphQL", "Docker", "Kubernetes"],
    technicalScore: 35,
    culturalScore: 45,
    overallScore: 84,
    linkedIn: "linkedin.com/in/natalicraig",
    summary:
      "Versatile full-stack developer comfortable working across the entire stack. Passionate about DevOps and CI/CD automation.",
    currentCompany: "Zalando",
    education: "TU Berlin - M.S. Software Engineering",
    status: "interested",
  },
  {
    id: "7",
    name: "Drew Cano",
    email: "drew@untitledui.com",
    phone: "+1 (555) 567-8901",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    role: "DevOps Engineer",
    location: "Denver, CO",
    country: "United States",
    experience: "6+ years",
    skills: ["AWS", "Terraform", "Kubernetes", "CI/CD", "Python"],
    technicalScore: 38,
    culturalScore: 48,
    overallScore: 90,
    linkedIn: "linkedin.com/in/drewcano",
    summary:
      "Infrastructure expert with deep AWS knowledge. Built and maintained platforms handling petabytes of data.",
    currentCompany: "Netflix",
    education: "CU Boulder - B.S. Computer Science",
    status: "new",
  },
  {
    id: "8",
    name: "Orlando Diggs",
    email: "orlando@untitledui.com",
    phone: "+1 (555) 678-9012",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    role: "Data Scientist",
    location: "Chicago, IL",
    country: "United States",
    experience: "4+ years",
    skills: ["Python", "Machine Learning", "TensorFlow", "SQL", "Statistics"],
    technicalScore: 36,
    culturalScore: 42,
    overallScore: 86,
    linkedIn: "linkedin.com/in/orlandodiggs",
    summary:
      "Data scientist specializing in NLP and recommendation systems. Published researcher with papers at top ML conferences.",
    currentCompany: "Meta",
    education: "Northwestern - Ph.D. Data Science",
    status: "new",
  },
  {
    id: "9",
    name: "Sarah Chen",
    email: "sarah.chen@email.com",
    phone: "+1 (555) 789-0123",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
    role: "Marketing Manager",
    location: "Los Angeles, CA",
    country: "United States",
    experience: "8+ years",
    skills: [
      "Brand Strategy",
      "Digital Marketing",
      "Content Marketing",
      "Team Leadership",
      "Analytics",
    ],
    technicalScore: 28,
    culturalScore: 55,
    overallScore: 88,
    linkedIn: "linkedin.com/in/sarahchen",
    summary:
      "Award-winning marketing leader with expertise in brand building and digital transformation. Grew startup from 0 to 1M users.",
    currentCompany: "HubSpot",
    education: "UCLA - MBA Marketing",
    status: "new",
  },
  {
    id: "10",
    name: "Marcus Johnson",
    email: "marcus.j@email.com",
    phone: "+1 (555) 890-1234",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    role: "Sales Director",
    location: "Miami, FL",
    country: "United States",
    experience: "10+ years",
    skills: [
      "B2B Sales",
      "Negotiation",
      "CRM",
      "Team Management",
      "Strategic Planning",
    ],
    technicalScore: 25,
    culturalScore: 58,
    overallScore: 91,
    linkedIn: "linkedin.com/in/marcusjohnson",
    summary:
      "Top-performing sales leader who has consistently exceeded quota by 150%+. Built and scaled sales teams from 5 to 50+ reps.",
    currentCompany: "Salesforce",
    education: "University of Miami - BBA",
    status: "new",
  },
  {
    id: "11",
    name: "Emma Rodriguez",
    email: "emma.r@email.com",
    phone: "+34 612 345 678",
    avatar:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face",
    role: "HR Business Partner",
    location: "Barcelona, Spain",
    country: "Spain",
    experience: "6+ years",
    skills: [
      "Talent Acquisition",
      "Employee Relations",
      "Performance Management",
      "HRIS",
      "Coaching",
    ],
    technicalScore: 22,
    culturalScore: 60,
    overallScore: 85,
    linkedIn: "linkedin.com/in/emmarodriguez",
    summary:
      "Strategic HR partner focused on building high-performance cultures. Implemented DEI programs that increased diversity by 40%.",
    currentCompany: "Booking.com",
    education: "ESADE - Master HR Management",
    status: "new",
  },
  {
    id: "12",
    name: "Alex Kim",
    email: "alex.kim@email.com",
    phone: "+82 10 1234 5678",
    avatar:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=face",
    role: "Product Manager",
    location: "Seoul, South Korea",
    country: "South Korea",
    experience: "5+ years",
    skills: [
      "Product Strategy",
      "Roadmapping",
      "User Research",
      "Data Analysis",
      "Cross-functional Leadership",
    ],
    technicalScore: 32,
    culturalScore: 50,
    overallScore: 87,
    linkedIn: "linkedin.com/in/alexkim",
    summary:
      "Product leader with a track record of launching 0-to-1 products. Passionate about mobile-first experiences and emerging markets.",
    currentCompany: "Coupang",
    education: "KAIST - MBA",
    status: "new",
  },
];

export const emailTemplates: EmailTemplate[] = [
  {
    id: "1",
    name: "Initial Outreach",
    subject: "{{jobTitle}} at {{company}}",
    body: `Hi {{candidateName}},

I came across your profile and was impressed by your background. We have an open {{jobTitle}} position at {{company}} that I think would be a great fit for you.

Here are some highlights:
- Role: {{jobTitle}} ({{jobLevel}})
- Company: {{company}}

View the role and apply here: {{jobLink}}

If this sounds interesting, I would love to set up a quick chat to tell you more about the role and our team.

Looking forward to hearing from you.

Best,
{{recruiterName}}
{{company}}`,
  },
  {
    id: "2",
    name: "Follow Up",
    subject: "Following up on {{jobTitle}} at {{company}}",
    body: `Hi {{candidateName}},

I wanted to follow up on my previous message about the {{jobTitle}} position at {{company}}.

We are still looking for the right person and your experience as a {{role}} makes you a strong candidate. Would you be available for a brief chat this week?

You can view the full role details here: {{jobLink}}

Best,
{{recruiterName}}
{{company}}`,
  },
  {
    id: "3",
    name: "Re-engagement",
    subject: "New role: {{jobTitle}} at {{company}}",
    body: `Hi {{candidateName}},

We have a new {{jobTitle}} opening at {{company}} and your profile stood out to us.

I would love to share more details about the role and what we are building. Would you be interested in learning more?

Check out the role here: {{jobLink}}

Best,
{{recruiterName}}
{{company}}`,
  },
];

// Hardcoded subset for sourcing mock UI (full list lazy-loaded from /data/countries.json)
export const countries = [
  "Algeria",
  "Angola",
  "Argentina",
  "Australia",
  "Austria",
  "Bangladesh",
  "Belgium",
  "Brazil",
  "Cameroon",
  "Canada",
  "China",
  "Colombia",
  "Czech Republic",
  "Denmark",
  "Egypt",
  "Ethiopia",
  "Finland",
  "France",
  "Germany",
  "Ghana",
  "India",
  "Indonesia",
  "Ireland",
  "Israel",
  "Italy",
  "Japan",
  "Kenya",
  "Malaysia",
  "Mexico",
  "Morocco",
  "Netherlands",
  "New Zealand",
  "Nigeria",
  "Norway",
  "Pakistan",
  "Philippines",
  "Poland",
  "Portugal",
  "Rwanda",
  "Saudi Arabia",
  "Senegal",
  "Singapore",
  "South Africa",
  "South Korea",
  "Spain",
  "Sweden",
  "Switzerland",
  "Tanzania",
  "Thailand",
  "Turkey",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Vietnam",
];

export const experienceLevels = [
  "Entry",
  "Manager",
  "Senior",
  "Director",
  "Partner",
];

export interface SkillCategory {
  name: string;
  type: "technical" | "non-technical";
  skills: string[];
}

export const skillCategories: SkillCategory[] = [
  {
    name: "Frontend Development",
    type: "technical",
    skills: [
      "React",
      "TypeScript",
      "Vue.js",
      "Angular",
      "Next.js",
      "Tailwind CSS",
      "JavaScript",
      "HTML/CSS",
    ],
  },
  {
    name: "Backend Development",
    type: "technical",
    skills: ["Node.js", "Python", "Java", "Go", "Ruby", "PHP", "C#", ".NET"],
  },
  {
    name: "Data & AI",
    type: "technical",
    skills: [
      "Machine Learning",
      "TensorFlow",
      "PyTorch",
      "Data Science",
      "SQL",
      "Python",
      "R",
      "Statistics",
    ],
  },
  {
    name: "Cloud & DevOps",
    type: "technical",
    skills: [
      "AWS",
      "Azure",
      "GCP",
      "Kubernetes",
      "Docker",
      "Terraform",
      "CI/CD",
      "Linux",
    ],
  },
  {
    name: "Design",
    type: "technical",
    skills: [
      "UI/UX Design",
      "Figma",
      "Sketch",
      "Adobe XD",
      "Prototyping",
      "Design Systems",
      "User Research",
    ],
  },
  {
    name: "Leadership & Management",
    type: "non-technical",
    skills: [
      "Team Leadership",
      "Strategic Planning",
      "Change Management",
      "Coaching",
      "Decision Making",
    ],
  },
  {
    name: "Communication",
    type: "non-technical",
    skills: [
      "Public Speaking",
      "Written Communication",
      "Presentation Skills",
      "Storytelling",
      "Active Listening",
    ],
  },
  {
    name: "Business & Strategy",
    type: "non-technical",
    skills: [
      "Business Development",
      "Market Analysis",
      "Financial Planning",
      "Negotiation",
      "Problem Solving",
    ],
  },
  {
    name: "Project Management",
    type: "non-technical",
    skills: [
      "Agile",
      "Scrum",
      "JIRA",
      "Risk Management",
      "Stakeholder Management",
      "PMP",
    ],
  },
  {
    name: "Sales & Marketing",
    type: "non-technical",
    skills: [
      "B2B Sales",
      "Digital Marketing",
      "Content Marketing",
      "SEO",
      "Brand Strategy",
      "CRM",
    ],
  },
  {
    name: "HR & People",
    type: "non-technical",
    skills: [
      "Talent Acquisition",
      "Employee Relations",
      "Performance Management",
      "DEI",
      "Compensation",
    ],
  },
];

export const allSkills = skillCategories.flatMap(cat => cat.skills);

export const technicalSkills = skillCategories
  .filter(cat => cat.type === "technical")
  .flatMap(cat => cat.skills);

export const nonTechnicalSkills = skillCategories
  .filter(cat => cat.type === "non-technical")
  .flatMap(cat => cat.skills);

// Role categories with stacks for engineers
export interface RoleCategory {
  name: string;
  hasStacks?: boolean;
  stacks?: string[];
}

export const roleCategories: RoleCategory[] = [
  {
    name: "Software Engineer",
    hasStacks: true,
    stacks: [
      "Frontend",
      "Backend",
      "Full Stack",
      "Mobile",
      "DevOps",
      "Data Engineering",
      "Machine Learning",
      "Security",
    ],
  },
  {
    name: "Product Designer",
    hasStacks: true,
    stacks: [
      "UI Design",
      "UX Design",
      "Product Design",
      "Visual Design",
      "Interaction Design",
      "Motion Design",
    ],
  },
  {
    name: "Product Manager",
  },
  {
    name: "Data Scientist",
    hasStacks: true,
    stacks: [
      "Machine Learning",
      "Data Analytics",
      "NLP",
      "Computer Vision",
      "Deep Learning",
    ],
  },
  {
    name: "Project Manager",
  },
  {
    name: "Marketing",
    hasStacks: true,
    stacks: [
      "Digital Marketing",
      "Content Marketing",
      "Growth Marketing",
      "Brand Marketing",
      "SEO/SEM",
    ],
  },
  {
    name: "Sales",
    hasStacks: true,
    stacks: [
      "B2B Sales",
      "Enterprise Sales",
      "Inside Sales",
      "Account Executive",
      "Business Development",
    ],
  },
  {
    name: "Human Resources",
    hasStacks: true,
    stacks: [
      "Talent Acquisition",
      // "HR Business Partner",
      "People Operations",
      // "Compensation & Benefits",
    ],
  },
  {
    name: "Finance",
    hasStacks: true,
    stacks: ["Financial Analyst", "Accounting", "FP&A", "Controller", "CFO"],
  },
  {
    name: "Operations",
  },
  {
    name: "Customer Success",
  },
  {
    name: "Executive",
    hasStacks: true,
    stacks: ["CEO", "CTO", "CPO", "CMO", "COO", "VP Engineering", "VP Product"],
  },
];
