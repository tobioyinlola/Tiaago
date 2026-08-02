"use client";

import {
  ArrowRight,
  Shield,
  Globe,
  Check,
  Star,
  Clock,
  Gift,
  Users,
  Zap,
  Target,
  Award,
  TrendingUp,
  DollarSign,
  Code,
  Palette,
  Brain,
  Briefcase,
  MessageSquare,
  Sparkles,
  CloudLightning as Lightning,
  Rocket,
  Crown,
  ChevronDown,
  Play,
  CheckCircle,
  Calendar,
  Filter,
  UserPlus,
  Atom,
  Hexagon,
  Triangle,
  Square,
  Circle,
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";

import Button from "@/app/common/components/CustomButton";
import Footer from "@/app/common/components/Layout/Footer";
import { CustomAuthButton } from "@/app/common/components/AuthButton";

// Enhanced role categories with more details
const roleCategories = [
  {
    title: "Software Engineering",
    description: "Full-stack, frontend, backend, and mobile developers",
    icon: <Code className='w-8 h-8' />,
    color: "from-primary to-primary-dark",
    roles: [
      "Full Stack Developer",
      "Frontend Engineer",
      "Backend Engineer",
      "Mobile Developer",
      "DevOps Engineer",
    ],
    averageRate: "$65-120/hr",
    availableTalent: "2,847",
    image:
      "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    skills: ["React", "Node.js", "Python", "AWS", "Docker", "Kubernetes"],
  },
  {
    title: "Product & Design",
    description: "Product managers, UI/UX designers, and design specialists",
    icon: <Palette className='w-8 h-8' />,
    color: "from-primary to-primary-dark",
    roles: [
      "Product Manager",
      "UI/UX Designer",
      "Product Designer",
      "Design Lead",
      "User Researcher",
    ],
    averageRate: "$55-95/hr",
    availableTalent: "1,234",
    image:
      "https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    skills: [
      "Figma",
      "Adobe Creative Suite",
      "User Research",
      "Prototyping",
      "Design Systems",
      "Product Strategy",
    ],
  },
  {
    title: "Data & AI",
    description: "Data scientists, ML engineers, and AI specialists",
    icon: <Brain className='w-8 h-8' />,
    color: "from-primary to-primary-dark",
    roles: [
      "Data Scientist",
      "ML Engineer",
      "Data Engineer",
      "AI Researcher",
      "Analytics Lead",
    ],
    averageRate: "$75-130/hr",
    availableTalent: "892",
    image:
      "https://images.pexels.com/photos/3183183/pexels-photo-3183183.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    skills: [
      "Python",
      "TensorFlow",
      "PyTorch",
      "SQL",
      "Machine Learning",
      "Deep Learning",
    ],
  },
  {
    title: "Marketing & Growth",
    description:
      "Growth marketers, content creators, and marketing specialists",
    icon: <TrendingUp className='w-8 h-8' />,
    color: "from-primary to-primary-dark",
    roles: [
      "Growth Marketer",
      "Content Creator",
      "SEO Specialist",
      "Social Media Manager",
      "Marketing Lead",
    ],
    averageRate: "$45-85/hr",
    availableTalent: "1,567",
    image:
      "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    skills: [
      "Google Analytics",
      "SEO",
      "Content Marketing",
      "Social Media",
      "Email Marketing",
      "Growth Hacking",
    ],
  },
];

// Process steps with enhanced details
const processSteps = [
  {
    step: "01",
    title: "Create Account & Post Requirements",
    description:
      "Sign up and tell us about your project needs, tech stack, team culture, and timeline. Our AI matches you with the perfect candidates.",
    icon: <UserPlus className='w-6 h-6' />,
    details: [
      "Project scope & timeline",
      "Required skills & experience",
      "Team culture fit",
      "Budget & expectations",
    ],
    duration: "5 minutes",
  },
  {
    step: "02",
    title: "AI Vetting & Talent Filtering",
    description:
      "Browse our pre-vetted talent pool or let our AI recommend candidates. Filter by skills, experience, timezone, and availability.",
    icon: <Brain className='w-6 h-6' />,
    details: [
      "AI-powered matching",
      "Skill-based filtering",
      "Availability check",
      "Cultural fit assessment",
    ],
    duration: "24-48 hours",
  },
  {
    step: "03",
    title: "Schedule Calls & Interviews",
    description:
      "Connect directly with shortlisted candidates through our platform. Conduct interviews and assess technical and cultural fit.",
    icon: <Calendar className='w-6 h-6' />,
    details: [
      "Direct communication",
      "Video interviews",
      "Technical assessments",
      "Reference checks",
    ],
    duration: "1-2 weeks",
  },
  {
    step: "04",
    title: "Activate Contract & Start Trial",
    description:
      "Begin with a 2-week free trial. We handle contracts, payments, and administrative work so you can focus on building.",
    icon: <Rocket className='w-6 h-6' />,
    details: [
      "2-week free trial",
      "Contract management",
      "Monthly salary processing",
      "Ongoing support",
    ],
    duration: "Ongoing",
  },
];

// Vetting process details
const vettingProcess = [
  {
    title: "Technical Skills Assessment",
    description:
      "Comprehensive coding challenges and real-world problem solving",
    icon: <Code className='w-6 h-6' />,
    color: "from-primary to-primary-dark",
    details: [
      "Live coding sessions",
      "System design challenges",
      "Code review exercises",
      "Technical interviews",
    ],
    passRate: "15%",
  },
  {
    title: "Non-Technical Evaluation",
    description: "Communication, problem-solving, and cultural fit assessment",
    icon: <MessageSquare className='w-6 h-6' />,
    color: "from-primary to-primary-dark",
    details: [
      "Communication skills",
      "Problem-solving approach",
      "Team collaboration",
      "Cultural alignment",
    ],
    passRate: "25%",
  },
  {
    title: "Portfolio & Experience Review",
    description:
      "In-depth analysis of past projects and professional experience",
    icon: <Briefcase className='w-6 h-6' />,
    color: "from-primary to-primary-dark",
    details: [
      "Project portfolio review",
      "Client testimonials",
      "Work quality assessment",
      "Professional references",
    ],
    passRate: "30%",
  },
];

// Testimonials with enhanced details
const testimonials = [
  {
    name: "Alex Chen",
    role: "CTO",
    company: "TechFlow",
    image:
      "https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&dpr=2",
    quote:
      "Tiaago helped us scale from 5 to 25 engineers in just 3 months. The quality of talent is exceptional, and the process is incredibly smooth.",
    rating: 5,
    results: "5x team growth in 3 months",
    savings: "Saved $200K in recruitment costs",
  },
  {
    name: "Sarah Johnson",
    role: "Founder",
    company: "DataViz Pro",
    image:
      "https://images.pexels.com/photos/3586798/pexels-photo-3586798.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&dpr=2",
    quote:
      "The AI matching is incredible. We found our lead designer in 2 days, and she's been instrumental in our product success.",
    rating: 5,
    results: "Found perfect match in 2 days",
    savings: "Reduced hiring time by 90%",
  },
  {
    name: "Michael Rodriguez",
    role: "VP Engineering",
    company: "CloudScale",
    image:
      "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&dpr=2",
    quote:
      "Working with Tiaago talent feels like having an extended team. The communication is seamless, and the work quality is outstanding.",
    rating: 5,
    results: "98% project success rate",
    savings: "40% cost reduction vs local hires",
  },
];

// Floating talent nodes for the 3D visualization
const talentNodes = [
  {
    id: 1,
    name: "Alex",
    role: "React Dev",
    x: 20,
    y: 30,
    z: 0,
    skills: ["React", "TypeScript"],
    rating: 5,
  },
  {
    id: 2,
    name: "Maria",
    role: "Designer",
    x: 80,
    y: 20,
    z: 20,
    skills: ["Figma", "UI/UX"],
    rating: 5,
  },
  {
    id: 3,
    name: "David",
    role: "Backend",
    x: 15,
    y: 70,
    z: -10,
    skills: ["Node.js", "AWS"],
    rating: 4,
  },
  {
    id: 4,
    name: "Sophie",
    role: "DevOps",
    x: 85,
    y: 75,
    z: 15,
    skills: ["Docker", "K8s"],
    rating: 5,
  },
  {
    id: 5,
    name: "James",
    role: "Full Stack",
    x: 50,
    y: 15,
    z: -20,
    skills: ["Python", "React"],
    rating: 5,
  },
  {
    id: 6,
    name: "Lisa",
    role: "Data Sci",
    x: 70,
    y: 85,
    z: 10,
    skills: ["ML", "Python"],
    rating: 4,
  },
  {
    id: 7,
    name: "Carlos",
    role: "Mobile",
    x: 10,
    y: 50,
    z: 25,
    skills: ["React Native", "iOS"],
    rating: 5,
  },
  {
    id: 8,
    name: "Emma",
    role: "Product",
    x: 90,
    y: 45,
    z: -15,
    skills: ["Strategy", "Analytics"],
    rating: 5,
  },
];

const Companies = () => {
  const [heroRef, heroInView] = useInView({ triggerOnce: true });
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeNode, setActiveNode] = useState(0);

  // Auto-rotate testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Auto-rotate talent nodes
  useEffect(() => {
    const nodeTimer = setInterval(() => {
      setActiveNode(prev => (prev + 1) % talentNodes.length);
    }, 2000);
    return () => clearInterval(nodeTimer);
  }, []);

  // Mouse tracking for parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const geometricRandoms = useMemo(
    () =>
      Array.from({ length: 50 }).map((_, i) => ({
        left: (i * 21) % 100,
        top: (i * 37) % 100,
        duration: 10 + (i % 10),
        delay: i % 5,
      })),
    []
  );

  const particleRandoms = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, i) => ({
        left: (i * 13) % 100,
        top: (i * 17) % 100,
        duration: 3 + (i % 2),
        delay: i % 3,
      })),
    []
  );

  const ctaParticleRandoms = useMemo(
    () =>
      Array.from({ length: 20 }).map((_, i) => ({
        left: (i * 19) % 100,
        top: (i * 23) % 100,
        duration: 3 + (i % 2),
        delay: i % 2,
      })),
    []
  );

  return (
    <>
      <main>
        {/* Revolutionary 3D Hero Section */}
        <section className='relative min-h-screen flex items-center pt-24 overflow-hidden'>
          {/* Dynamic Background */}
          <div className='absolute inset-0'>
            <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-white to-secondary-2/5'></div>
            <div
              className='absolute inset-0 opacity-20'
              style={{
                background: `
                  radial-gradient(circle at ${50 + mousePosition.x * 10}% ${
                    50 + mousePosition.y * 10
                  }%, rgba(84,101,255,0.1) 0%, transparent 50%),
                  radial-gradient(circle at ${30 - mousePosition.x * 5}% ${
                    70 - mousePosition.y * 5
                  }%, rgba(62,146,204,0.1) 0%, transparent 50%),
                  radial-gradient(circle at ${70 + mousePosition.x * 8}% ${
                    30 + mousePosition.y * 8
                  }%, rgba(84,101,255,0.05) 0%, transparent 50%)
                `,
              }}
            ></div>

            {/* Geometric patterns */}
            <div className='absolute inset-0'>
              {geometricRandoms.map((rand, i) => (
                <m.div
                  key={i}
                  className='absolute'
                  style={{
                    left: `${rand.left}%`,
                    top: `${rand.top}%`,
                  }}
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.2, 1],
                    opacity: [0.05, 0.15, 0.05],
                  }}
                  transition={{
                    duration: rand.duration,
                    repeat: Infinity,
                    delay: rand.delay,
                  }}
                >
                  {i % 4 === 0 && (
                    <Hexagon className='w-4 h-4 text-primary/30' />
                  )}
                  {i % 4 === 1 && (
                    <Triangle className='w-3 h-3 text-secondary-2/30' />
                  )}
                  {i % 4 === 2 && (
                    <Square className='w-3 h-3 text-primary/20' />
                  )}
                  {i % 4 === 3 && (
                    <Circle className='w-2 h-2 text-secondary-2/20' />
                  )}
                </m.div>
              ))}
            </div>

            {/* Neural network lines */}
            <svg className='absolute inset-0 w-full h-full'>
              <defs>
                <linearGradient
                  id='lineGradient'
                  x1='0%'
                  y1='0%'
                  x2='100%'
                  y2='100%'
                >
                  <stop offset='0%' stopColor='rgba(84,101,255,0.1)' />
                  <stop offset='50%' stopColor='rgba(62,146,204,0.1)' />
                  <stop offset='100%' stopColor='rgba(84,101,255,0.05)' />
                </linearGradient>
              </defs>
              {talentNodes.map((node, index) =>
                talentNodes.slice(index + 1).map((targetNode, targetIndex) => (
                  <m.line
                    key={`${index}-${targetIndex}`}
                    x1={`${node.x}%`}
                    y1={`${node.y}%`}
                    x2={`${targetNode.x}%`}
                    y2={`${targetNode.y}%`}
                    stroke='url(#lineGradient)'
                    strokeWidth='1'
                    opacity='0.1'
                    animate={{
                      opacity: [0.05, 0.2, 0.05],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: (index + targetIndex) % 2,
                    }}
                  />
                ))
              )}
            </svg>
          </div>

          <m.div
            ref={heroRef}
            initial='hidden'
            animate={heroInView ? "visible" : "hidden"}
            variants={staggerChildren}
            className='md:container mx-auto px-4 relative z-10'
          >
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
              {/* Left Content */}
              <m.div variants={fadeIn} className='text-center lg:text-left'>
                <m.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8 }}
                >
                  <div className='inline-flex items-center bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 mb-8 border border-primary/20'>
                    <m.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Sparkles className='w-5 h-5 text-primary mr-3' />
                    </m.div>
                    <span className='text-primary font-medium'>
                      Join 500+ Recruiters Building with Top 2% Talent
                    </span>
                  </div>

                  <h1 className='text-5xl md:text-6xl lg:text-7xl font-bold mb-8 leading-[1.1]'>
                    <span className='text-gray-900'>Build</span>
                    <br />
                    <span className='bg-gradient-to-r from-primary to-secondary-2 bg-clip-text text-transparent'>
                      Tomorrow&apos;s
                    </span>
                    <br />
                    <span className='text-gray-900'>Team</span>
                    <br />
                    <span className='bg-gradient-to-r from-secondary-2 to-primary bg-clip-text text-transparent'>
                      Today
                    </span>
                  </h1>
                </m.div>

                <m.p
                  variants={fadeIn}
                  className='text-xl md:text-2xl text-gray-600 mb-10 max-w-lg'
                >
                  Access the world&apos;s top 2% of verified talent.
                  <span className='text-gray-900 font-semibold'>
                    {" "}
                    AI-matched. Instantly available.{" "}
                  </span>
                  Ready to transform your recruiter.
                </m.p>

                <m.div
                  variants={fadeIn}
                  className='flex flex-col sm:flex-row gap-6 justify-center lg:justify-start mb-12'
                >
                  <CustomAuthButton
                    size='lg'
                    className='!bg-primary hover:!bg-primary-dark !rounded-full text-white font-semibold border-0 shadow-xl group transform hover:scale-105 transition-all duration-300'
                  >
                    <m.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Rocket className='mr-3 h-6 w-6' />
                    </m.div>
                    Start Building Now
                    <ArrowRight className='ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform' />
                  </CustomAuthButton>
                  <Button
                    variant='outline'
                    size='lg'
                    className='!rounded-full border-primary/30 text-primary hover:bg-primary/5 shadow-lg'
                  >
                    <Play className='mr-3 h-5 w-5' />
                    Watch Demo
                  </Button>
                </m.div>

                {/* Live metrics */}
                <m.div
                  variants={fadeIn}
                  className='grid grid-cols-2 md:grid-cols-4 gap-4'
                >
                  {[
                    {
                      label: "Active Talents",
                      value: "50K+",
                      icon: <Users className='w-5 h-5' />,
                    },
                    {
                      label: "Avg. Match Time",
                      value: "2hrs",
                      icon: <Zap className='w-5 h-5' />,
                    },
                    {
                      label: "Success Rate",
                      value: "98%",
                      icon: <Target className='w-5 h-5' />,
                    },
                    {
                      label: "Countries",
                      value: "120+",
                      icon: <Globe className='w-5 h-5' />,
                    },
                  ].map((metric, index) => (
                    <m.div
                      key={index}
                      className='bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-100'
                      whileHover={{
                        scale: 1.05,
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className='text-primary mb-2'>{metric.icon}</div>
                      <div className='text-2xl font-bold text-gray-900'>
                        {metric.value}
                      </div>
                      <div className='text-xs text-gray-600'>
                        {metric.label}
                      </div>
                    </m.div>
                  ))}
                </m.div>
              </m.div>

              {/* Right - 3D Talent Visualization */}
              <m.div
                variants={fadeIn}
                className='relative h-[600px] lg:h-[700px]'
              >
                {/* Central hub */}
                <div className='absolute inset-0 flex items-center justify-center'>
                  <m.div
                    animate={{
                      rotate: 360,
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      rotate: {
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear",
                      },
                      scale: { duration: 4, repeat: Infinity },
                    }}
                    className='relative'
                  >
                    {/* Central orb */}
                    <div className='w-32 h-32 bg-gradient-to-r from-primary to-secondary-2 rounded-full flex items-center justify-center shadow-2xl'>
                      <m.div
                        animate={{ rotate: -360 }}
                        transition={{
                          duration: 20,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className='text-white'
                      >
                        <Atom className='w-16 h-16' />
                      </m.div>
                    </div>

                    {/* Orbital rings */}
                    {[1, 2, 3].map(ring => (
                      <m.div
                        key={ring}
                        className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-primary/20 rounded-full'
                        style={{
                          width: `${128 + ring * 80}px`,
                          height: `${128 + ring * 80}px`,
                        }}
                        animate={{
                          rotate: ring % 2 === 0 ? 360 : -360,
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          rotate: {
                            duration: 15 + ring * 5,
                            repeat: Infinity,
                            ease: "linear",
                          },
                          scale: {
                            duration: 3,
                            repeat: Infinity,
                            delay: ring * 0.5,
                          },
                        }}
                      />
                    ))}
                  </m.div>
                </div>

                {/* Floating talent nodes */}
                {talentNodes.map((node, index) => (
                  <m.div
                    key={node.id}
                    className='absolute'
                    style={{
                      left: `${node.x}%`,
                      top: `${node.y}%`,
                      transform: `translateZ(${node.z}px)`,
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                      scale: activeNode === index ? 1.3 : 1,
                      opacity: 1,
                      y: [0, -20, 0],
                      rotateY: [0, 360],
                    }}
                    transition={{
                      delay: index * 0.2,
                      y: { duration: 3 + index * 0.5, repeat: Infinity },
                      rotateY: {
                        duration: 10,
                        repeat: Infinity,
                        ease: "linear",
                      },
                      scale: { duration: 0.3 },
                    }}
                    whileHover={{ scale: 1.4, z: 50 }}
                  >
                    <div
                      className={`relative transform -translate-x-1/2 -translate-y-1/2 ${
                        activeNode === index ? "z-20" : "z-10"
                      }`}
                    >
                      {/* Talent card */}
                      <m.div
                        className={`bg-white rounded-2xl p-4 shadow-xl border-2 min-w-[180px] ${
                          activeNode === index
                            ? "border-primary shadow-primary/30"
                            : "border-gray-200"
                        }`}
                        animate={{
                          boxShadow:
                            activeNode === index
                              ? "0 20px 40px rgba(84,101,255,0.3)"
                              : "0 10px 20px rgba(0,0,0,0.1)",
                        }}
                      >
                        <div className='flex items-center space-x-3 mb-3'>
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              activeNode === index
                                ? "bg-gradient-to-r from-primary to-secondary-2"
                                : "bg-gradient-to-r from-gray-400 to-gray-500"
                            }`}
                          >
                            <span className='text-white font-bold text-sm'>
                              {node.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className='font-bold text-gray-900 text-sm'>
                              {node.name}
                            </div>
                            <div className='text-xs text-primary font-medium'>
                              {node.role}
                            </div>
                          </div>
                        </div>

                        <div className='flex flex-wrap gap-1 mb-3'>
                          {node.skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className='px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium'
                            >
                              {skill}
                            </span>
                          ))}
                        </div>

                        <div className='flex items-center justify-between'>
                          <div className='flex'>
                            {Array.from({ length: node.rating }).map((_, i) => (
                              <Star
                                key={i}
                                className='w-3 h-3 text-primary fill-primary'
                              />
                            ))}
                          </div>
                          <div
                            className={`w-3 h-3 rounded-full ${
                              activeNode === index
                                ? "bg-primary"
                                : "bg-gray-300"
                            }`}
                          />
                        </div>

                        {/* Floating badge */}
                        {activeNode === index && (
                          <m.div
                            initial={{ opacity: 0, scale: 0, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0, y: 10 }}
                            className='absolute -top-8 left-1/2 transform -translate-x-1/2'
                          >
                            <div className='bg-gradient-to-r from-primary to-secondary-2 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap flex items-center'>
                              <Crown className='w-3 h-3 mr-1' />
                              Top 1% Talent
                            </div>
                          </m.div>
                        )}
                      </m.div>

                      {/* Connection beam to center */}
                      {activeNode === index && (
                        <m.div
                          className='absolute top-1/2 left-1/2 w-1 bg-gradient-to-r from-primary to-transparent opacity-60'
                          style={{
                            height: `${
                              Math.sqrt(
                                Math.pow(50 - node.x, 2) +
                                  Math.pow(50 - node.y, 2)
                              ) * 6
                            }px`,
                            transformOrigin: "top",
                            transform: `rotate(${
                              (Math.atan2(50 - node.y, 50 - node.x) * 180) /
                                Math.PI +
                              90
                            }deg)`,
                          }}
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          exit={{ scaleY: 0 }}
                        />
                      )}
                    </div>
                  </m.div>
                ))}

                {/* Floating achievement indicators */}
                <m.div
                  className='absolute top-20 right-20'
                  animate={{
                    y: [0, -15, 0],
                    rotate: [0, 5, 0],
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <div className='bg-white rounded-xl p-4 shadow-xl border border-gray-200'>
                    <div className='flex items-center space-x-2'>
                      <Lightning className='w-6 h-6 text-primary' />
                      <div>
                        <div className='text-lg font-bold text-gray-900'>
                          2.3M+
                        </div>
                        <div className='text-xs text-gray-600'>
                          Projects Completed
                        </div>
                      </div>
                    </div>
                  </div>
                </m.div>

                <m.div
                  className='absolute bottom-20 left-20'
                  animate={{
                    y: [0, -15, 0],
                    rotate: [0, -5, 0],
                  }}
                  transition={{ duration: 4, repeat: Infinity, delay: 2 }}
                >
                  <div className='bg-white rounded-xl p-4 shadow-xl border border-gray-200'>
                    <div className='flex items-center space-x-2'>
                      <Shield className='w-6 h-6 text-primary' />
                      <div>
                        <div className='text-lg font-bold text-gray-900'>
                          99.8%
                        </div>
                        <div className='text-xs text-gray-600'>
                          Success Rate
                        </div>
                      </div>
                    </div>
                  </div>
                </m.div>

                <m.div
                  className='absolute top-1/2 right-8'
                  animate={{
                    y: [0, -15, 0],
                    rotate: [0, 3, 0],
                  }}
                  transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                >
                  <div className='bg-white rounded-xl p-4 shadow-xl border border-gray-200'>
                    <div className='flex items-center space-x-2'>
                      <Clock className='w-6 h-6 text-secondary-2' />
                      <div>
                        <div className='text-lg font-bold text-gray-900'>
                          24hrs
                        </div>
                        <div className='text-xs text-gray-600'>
                          Avg. Response
                        </div>
                      </div>
                    </div>
                  </div>
                </m.div>

                {/* Particle effects */}
                {particleRandoms.map((rand, i) => (
                  <m.div
                    key={i}
                    className='absolute w-1 h-1 bg-primary/40 rounded-full'
                    style={{
                      left: `${rand.left}%`,
                      top: `${rand.top}%`,
                    }}
                    animate={{
                      y: [0, -100, 0],
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0],
                    }}
                    transition={{
                      duration: rand.duration,
                      repeat: Infinity,
                      delay: rand.delay,
                    }}
                  />
                ))}
              </m.div>
            </div>
          </m.div>

          {/* Scroll indicator */}
          <m.div
            className='absolute bottom-8 left-1/2 transform -translate-x-1/2'
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className='flex flex-col items-center text-gray-500'>
              <span className='text-sm mb-2'>Scroll to explore</span>
              <ChevronDown className='w-6 h-6' />
            </div>
          </m.div>
        </section>

        {/* Enhanced Role Categories */}
        <section className='py-20 bg-gray-50'>
          <div className='md:container mx-auto px-4'>
            <div className='text-center max-w-3xl mx-auto mb-16'>
              <h2 className='text-3xl lg:text-4xl font-bold text-gray-900 mb-6'>
                Find Talent Across All Disciplines
              </h2>
              <p className='text-xl text-gray-600'>
                From technical roles to creative positions, we have the
                expertise you need to scale your recruiter.
              </p>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto'>
              {roleCategories.map((category, index) => (
                <m.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer ${
                    activeCategory === index ? "scale-105" : ""
                  }`}
                  onMouseEnter={() => setActiveCategory(index)}
                >
                  <div className='absolute inset-0'>
                    <Image
                      src={category.image}
                      alt={category.title}
                      className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110'
                      width={1260}
                      height={750}
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-90`}
                    ></div>
                  </div>

                  <div className='relative p-8 h-full flex flex-col justify-between min-h-[400px] text-white'>
                    <div>
                      <div className='bg-white/20 rounded-full w-16 h-16 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform'>
                        {category.icon}
                      </div>
                      <h3 className='text-2xl font-bold mb-3'>
                        {category.title}
                      </h3>
                      <p className='text-white/90 mb-6'>
                        {category.description}
                      </p>

                      <div className='grid grid-cols-2 gap-4 mb-6'>
                        <div>
                          <div className='text-white/70 text-sm'>
                            Available Talent
                          </div>
                          <div className='font-bold text-lg'>
                            {category.availableTalent}
                          </div>
                        </div>
                        <div>
                          <div className='text-white/70 text-sm'>
                            Average Rate
                          </div>
                          <div className='font-bold text-lg'>
                            {category.averageRate}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className='mb-4'>
                        <div className='text-white/70 text-sm mb-2'>
                          Popular Roles:
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          {category.roles.slice(0, 3).map((role, idx) => (
                            <span
                              key={idx}
                              className='px-2 py-1 bg-white/20 rounded-full text-xs'
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className='mb-6'>
                        <div className='text-white/70 text-sm mb-2'>
                          Top Skills:
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          {category.skills.slice(0, 4).map((skill, idx) => (
                            <span
                              key={idx}
                              className='px-2 py-1 bg-white/20 rounded-full text-xs'
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <Button
                        variant='outline'
                        className='text-white border-white hover:bg-white hover:text-gray-900 group-hover:scale-105 transition-all'
                      >
                        Explore Talent
                        <ArrowRight className='ml-2 h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                </m.div>
              ))}
            </div>
          </div>
        </section>

        {/* Talent Vetting Process */}
        <section className='py-20 bg-white'>
          <div className='md:container mx-auto px-4'>
            <div className='text-center max-w-3xl mx-auto mb-16'>
              <h2 className='text-3xl lg:text-4xl font-bold text-gray-900 mb-6'>
                How We Vet Our Talent
              </h2>
              <p className='text-xl text-gray-600'>
                Our rigorous 3-step vetting process ensures you work with only
                the top 2% of global talent.
              </p>
            </div>

            <div className='max-w-6xl mx-auto'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-8 mb-16'>
                {vettingProcess.map((process, index) => (
                  <m.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.2 }}
                    className='relative group'
                  >
                    <div className='bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group-hover:scale-105 h-full'>
                      <div
                        className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${process.color} text-white mb-6 group-hover:scale-110 transition-transform`}
                      >
                        {process.icon}
                      </div>

                      <h3 className='text-xl font-bold text-gray-900 mb-3'>
                        {process.title}
                      </h3>
                      <p className='text-gray-600 mb-6'>
                        {process.description}
                      </p>

                      <div className='mb-6'>
                        <div className='flex justify-between items-center mb-2'>
                          <span className='text-sm font-medium text-gray-700'>
                            Pass Rate
                          </span>
                          <span className='text-sm font-bold text-gray-900'>
                            {process.passRate}
                          </span>
                        </div>
                        <div className='h-2 bg-gray-200 rounded-full overflow-hidden'>
                          <div
                            className={`h-full bg-gradient-to-r ${process.color} rounded-full transition-all duration-1000`}
                            style={{ width: process.passRate }}
                          ></div>
                        </div>
                      </div>

                      <ul className='space-y-2'>
                        {process.details.map((detail, idx) => (
                          <li
                            key={idx}
                            className='text-sm text-gray-600 flex items-center'
                          >
                            <Check className='w-4 h-4 text-primary mr-2 flex-shrink-0' />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </m.div>
                ))}
              </div>

              {/* Vetting Stats */}
              <div className='bg-gradient-to-r from-primary/5 to-secondary-2/5 rounded-2xl p-8'>
                <div className='text-center mb-8'>
                  <h3 className='text-2xl font-bold text-gray-900 mb-4'>
                    Vetting by the Numbers
                  </h3>
                  <p className='text-gray-600'>
                    Our comprehensive screening process ensures exceptional
                    quality
                  </p>
                </div>

                <div className='grid grid-cols-2 md:grid-cols-4 gap-8'>
                  {[
                    {
                      label: "Applications Received",
                      value: "100K+",
                      icon: <Users className='w-6 h-6' />,
                    },
                    {
                      label: "Pass Initial Screening",
                      value: "15%",
                      icon: <Filter className='w-6 h-6' />,
                    },
                    {
                      label: "Complete Full Process",
                      value: "2%",
                      icon: <Award className='w-6 h-6' />,
                    },
                    {
                      label: "Average Vetting Time",
                      value: "2 weeks",
                      icon: <Clock className='w-6 h-6' />,
                    },
                  ].map((stat, index) => (
                    <div key={index} className='text-center'>
                      <div className='bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm'>
                        <div className='text-primary'>{stat.icon}</div>
                      </div>
                      <div className='text-2xl font-bold text-gray-900 mb-2'>
                        {stat.value}
                      </div>
                      <div className='text-sm text-gray-600'>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced How It Works */}
        <section className='py-20 bg-gray-50'>
          <div className='md:container mx-auto px-4'>
            <div className='text-center max-w-3xl mx-auto mb-16'>
              <h2 className='text-3xl lg:text-4xl font-bold text-gray-900 mb-6'>
                From Idea to Team in 4 Simple Steps
              </h2>
              <p className='text-xl text-gray-600'>
                Our streamlined process gets you working with world-class talent
                faster than traditional hiring.
              </p>
            </div>

            <div className='max-w-6xl mx-auto'>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>
                {processSteps.map((step, index) => (
                  <m.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.2 }}
                    className='relative group'
                  >
                    {/* Connection line */}
                    {index < processSteps.length - 1 && (
                      <div className='hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-primary to-secondary-2 opacity-30 z-0'></div>
                    )}

                    <div className='relative bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group-hover:scale-105'>
                      <div className='absolute -top-4 left-8'>
                        <div className='bg-gradient-to-r from-primary to-secondary-2 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm'>
                          {step.step}
                        </div>
                      </div>

                      <div className='bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform'>
                        <div className='text-primary'>{step.icon}</div>
                      </div>

                      <h3 className='text-xl font-bold text-gray-900 mb-3'>
                        {step.title}
                      </h3>
                      <p className='text-gray-600 mb-4'>{step.description}</p>

                      <div className='mb-4'>
                        <div className='text-sm font-medium text-primary mb-2'>
                          Duration: {step.duration}
                        </div>
                        <ul className='space-y-1'>
                          {step.details.map((detail, idx) => (
                            <li
                              key={idx}
                              className='text-sm text-gray-500 flex items-center'
                            >
                              <Check className='w-3 h-3 text-primary mr-2 flex-shrink-0' />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </m.div>
                ))}
              </div>

              {/* Free Trial Highlight */}
              <div className='mt-16 bg-gradient-to-r from-primary to-secondary-2 rounded-2xl p-8 text-white text-center'>
                <div className='max-w-2xl mx-auto'>
                  <div className='inline-flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6'>
                    <Gift className='w-5 h-5 mr-2' />
                    <span className='text-sm font-medium'>
                      Limited Time Offer
                    </span>
                  </div>
                  <h3 className='text-2xl font-bold mb-4'>
                    Start with a 2-Week Free Trial
                  </h3>
                  <p className='text-xl mb-6 text-white/90'>
                    Test drive our platform and work with top talent risk-free.
                    No contracts, no commitments.
                  </p>
                  <CustomAuthButton
                    className='!rounded-full bg-white !text-primary font-semibold hover:bg-gray-100'
                    size='lg'
                  >
                    Start Free Trial
                    <ArrowRight className='ml-2 h-5 w-5' />
                  </CustomAuthButton>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced Testimonials */}
        <section className='py-20 bg-white'>
          <div className='md:container mx-auto px-4'>
            <div className='text-center max-w-3xl mx-auto mb-16'>
              <h2 className='text-3xl lg:text-4xl font-bold text-gray-900 mb-6'>
                Trusted by 500+ Recruiters Worldwide
              </h2>
              <p className='text-xl text-gray-600'>
                See how recruiters are scaling their teams and accelerating growth
                with Tiaago.
              </p>
            </div>

            <div className='max-w-4xl mx-auto'>
              <div className='relative'>
                <AnimatePresence mode='wait'>
                  <m.div
                    key={activeTestimonial}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.5 }}
                    className='bg-white rounded-2xl p-8 shadow-xl border border-gray-100'
                  >
                    <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 items-center'>
                      <div className='lg:col-span-2'>
                        <div className='flex mb-6'>
                          {Array.from({
                            length: testimonials[activeTestimonial].rating,
                          }).map((_, i) => (
                            <Star
                              key={i}
                              className='w-6 h-6 text-primary fill-primary'
                            />
                          ))}
                        </div>

                        <blockquote className='text-xl text-gray-700 mb-6 leading-relaxed'>
                          &quot;{testimonials[activeTestimonial].quote}&quot;
                        </blockquote>

                        <div className='flex items-center space-x-4 mb-6'>
                          <Image
                            src={testimonials[activeTestimonial].image}
                            alt={testimonials[activeTestimonial].name}
                            className='w-16 h-16 rounded-full object-cover'
                            width={64}
                            height={64}
                          />
                          <div>
                            <div className='font-bold text-gray-900'>
                              {testimonials[activeTestimonial].name}
                            </div>
                            <div className='text-primary font-medium'>
                              {testimonials[activeTestimonial].role}
                            </div>
                            <div className='text-gray-500'>
                              {testimonials[activeTestimonial].company}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className='space-y-4'>
                        <div className='bg-primary/5 rounded-lg p-4 border border-primary/10'>
                          <div className='flex items-center text-primary mb-2'>
                            <TrendingUp className='w-5 h-5 mr-2' />
                            <span className='font-medium'>Results</span>
                          </div>
                          <div className='text-primary-dark font-bold'>
                            {testimonials[activeTestimonial].results}
                          </div>
                        </div>

                        <div className='bg-primary/5 rounded-lg p-4 border border-primary/10'>
                          <div className='flex items-center text-primary mb-2'>
                            <DollarSign className='w-5 h-5 mr-2' />
                            <span className='font-medium'>Savings</span>
                          </div>
                          <div className='text-primary-dark font-bold'>
                            {testimonials[activeTestimonial].savings}
                          </div>
                        </div>
                      </div>
                    </div>
                  </m.div>
                </AnimatePresence>

                {/* Navigation dots */}
                <div className='flex justify-center mt-8 space-x-2'>
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveTestimonial(index)}
                      className={`w-3 h-3 rounded-full transition-all ${
                        index === activeTestimonial
                          ? "bg-primary"
                          : "bg-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced CTA Section */}
        <section className='py-20 bg-gradient-to-br from-primary to-secondary-2 text-white relative overflow-hidden'>
          <div className='absolute inset-0'>
            {ctaParticleRandoms.map((rand, i) => (
              <m.div
                key={i}
                className='absolute w-1 h-1 bg-white/20 rounded-full'
                style={{
                  left: `${rand.left}%`,
                  top: `${rand.top}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  opacity: [0.2, 1, 0.2],
                }}
                transition={{
                  duration: rand.duration,
                  repeat: Infinity,
                  delay: rand.delay,
                }}
              />
            ))}
          </div>

          <div className='md:container mx-auto px-4 relative'>
            <div className='max-w-4xl mx-auto text-center'>
              <m.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className='inline-flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6'>
                  <Sparkles className='w-5 h-5 mr-2' />
                  <span className='text-sm font-medium'>
                    Limited Time: 2 Weeks Free Trial
                  </span>
                </div>

                <h2 className='text-4xl md:text-5xl font-bold mb-8'>
                  Ready to Build Your Dream Team?
                </h2>

                <p className='text-xl mb-8 text-white/90 max-w-2xl mx-auto'>
                  Join hundreds of successful recruiters who have scaled their
                  teams with Tiaago. Start your free trial today and experience
                  the difference.
                </p>

                <div className='grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10'>
                  <div className='bg-white/10 backdrop-blur-sm rounded-lg p-6'>
                    <div className='text-3xl font-bold mb-2'>48hrs</div>
                    <div className='text-white/80'>Average hire time</div>
                  </div>
                  <div className='bg-white/10 backdrop-blur-sm rounded-lg p-6'>
                    <div className='text-3xl font-bold mb-2'>98%</div>
                    <div className='text-white/80'>Client satisfaction</div>
                  </div>
                  <div className='bg-white/10 backdrop-blur-sm rounded-lg p-6'>
                    <div className='text-3xl font-bold mb-2'>60%</div>
                    <div className='text-white/80'>Cost savings</div>
                  </div>
                </div>

                <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                  <CustomAuthButton
                    size='lg'
                    className='!rounded-full bg-white !text-primary font-semibold hover:bg-gray-100 shadow-lg group'
                  >
                    Start Free Trial
                    <ArrowRight className='ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform' />
                  </CustomAuthButton>
                  <Button
                    variant='outline'
                    size='lg'
                    className='!rounded-full border-white text-white hover:bg-white/10 shadow-lg'
                  >
                    <a
                      href='https://cal.com/tiaago/book-a-demo-tiaago-ai-hiring-platform'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex items-center'
                    >
                      Schedule Demo
                    </a>
                  </Button>
                </div>

                <div className='mt-8 flex items-center justify-center space-x-8 text-white/70'>
                  <div className='flex items-center'>
                    <Shield className='w-5 h-5 mr-2' />
                    <span className='text-sm'>No credit card required</span>
                  </div>
                  <div className='flex items-center'>
                    <Clock className='w-5 h-5 mr-2' />
                    <span className='text-sm'>2-week free trial</span>
                  </div>
                  <div className='flex items-center'>
                    <CheckCircle className='w-5 h-5 mr-2' />
                    <span className='text-sm'>Cancel anytime</span>
                  </div>
                </div>
              </m.div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Companies;
