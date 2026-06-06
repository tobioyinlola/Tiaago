import {
  FileText,
  Scale,
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  Mail,
  Gavel,
  DollarSign,
  UserCheck,
  Eye,
  Lock,
  Building,
  Brain,
  Globe,
} from "lucide-react";

import { SUPPORT_EMAIL } from "@/app/common/constants";
import Footer from "@/app/common/components/Layout/Footer";

const Terms: React.FC = () => {
  return (
    <>
      <main className='pt-24'>
        {/* Hero Section */}
        <section className='py-16 bg-gradient-to-br from-secondary-2/5 to-primary/5'>
          <div className='md:container mx-auto px-4'>
            <div className='max-w-4xl mx-auto text-center'>
              <div className='inline-flex items-center bg-white rounded-full px-4 py-2 mb-6 shadow-sm'>
                <Scale className='w-5 h-5 text-secondary-2 mr-2' />
                <span className='text-sm font-medium text-gray-700'>
                  Legal Terms
                </span>
              </div>
              <h1 className='text-4xl md:text-5xl font-bold text-gray-900 mb-6'>
                Terms of Service
              </h1>
              <p className='text-xl text-gray-600 mb-8'>
                These terms govern your use of TIAAGO&apos;s platform and
                services. Please read them carefully.
              </p>
              <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                <div className='bg-white rounded-lg p-4 shadow-sm'>
                  <span className='text-sm text-gray-600'>
                    Effective Date: June 1, 2025
                  </span>
                </div>
                <div className='bg-white rounded-lg p-4 shadow-sm'>
                  <span className='text-sm text-gray-600'>
                    Company: TIAAGO Technologies LLC
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Summary */}
        <section className='py-16 bg-white'>
          <div className='md:container mx-auto px-4'>
            <div className='max-w-4xl mx-auto'>
              <h2 className='text-2xl font-bold text-gray-900 mb-8 text-center'>
                Service Overview
              </h2>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-8 mb-16'>
                <div className='text-center p-6 bg-gray-50 rounded-xl'>
                  <div className='w-16 h-16 bg-secondary-2/10 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <Users className='w-8 h-8 text-secondary-2' />
                  </div>
                  <h3 className='font-semibold text-gray-900 mb-2'>
                    For Talents
                  </h3>
                  <p className='text-gray-600 text-sm'>
                    Profile creation, skill assessments, interview scheduling,
                    and application tracking.
                  </p>
                </div>
                <div className='text-center p-6 bg-gray-50 rounded-xl'>
                  <div className='w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <Building className='w-8 h-8 text-primary' />
                  </div>
                  <h3 className='font-semibold text-gray-900 mb-2'>
                    For Recruiters & Startups
                  </h3>
                  <p className='text-gray-600 text-sm'>
                    Job postings, talent discovery, AI-powered screening, and
                    communication tools.
                  </p>
                </div>
                <div className='text-center p-6 bg-gray-50 rounded-xl'>
                  <div className='w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <Brain className='w-8 h-8 text-success' />
                  </div>
                  <h3 className='font-semibold text-gray-900 mb-2'>
                    AI-Powered Platform
                  </h3>
                  <p className='text-gray-600 text-sm'>
                    Smart hiring operating system with Jane, our AI agent for
                    screening and interviews.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Terms */}
        <section className='py-16 bg-gray-50'>
          <div className='md:container mx-auto px-4'>
            <div className='max-w-4xl mx-auto'>
              <div className='bg-white rounded-2xl shadow-lg overflow-hidden'>
                <div className='p-8 md:p-12'>
                  {/* Introduction */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-4'>
                        <FileText className='w-6 h-6 text-primary' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        Welcome to TIAAGO
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        Welcome to TIAAGO, a smart hiring operating system
                        powered by AI to help recruiters, HR teams, and startups
                        automate the process of screening, assessing, and
                        interviewing candidates. These Terms of Service
                        (&quot;Terms&quot;) govern your use of our platform
                        (&quot;Service&quot;) operated by TIAAGO Technologies
                        LLC (&quot;TIAAGO,&quot; &quot;we,&quot; &quot;us,&quot;
                        or &quot;our&quot;).
                      </p>

                      <div className='bg-blue-50 border-l-4 border-blue-400 p-6'>
                        <p className='text-gray-700'>
                          <strong>
                            By accessing or using TIAAGO, whether as a talent,
                            recruiter, HR professional, or startup, you agree to
                            be bound by these Terms. If you do not agree, please
                            do not use our Services.
                          </strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 1 - Eligibility */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-secondary-2/10 rounded-lg flex items-center justify-center mr-4'>
                        <UserCheck className='w-6 h-6 text-secondary-2' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        1. Eligibility
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600'>
                        To use TIAAGO, you must be at least 18 years old and
                        capable of forming a binding contract. If you are using
                        TIAAGO on behalf of an organization, you represent and
                        warrant that you have the authority to bind the
                        organization to these Terms.
                      </p>
                    </div>
                  </div>

                  {/* Section 2 - Accounts and Registration */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center mr-4'>
                        <Users className='w-6 h-6 text-success' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        2. Accounts and Registration
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        You must create an account to access certain features.
                        During registration, you agree to provide accurate,
                        current, and complete information. You are responsible
                        for maintaining the confidentiality of your account
                        credentials and for all activity under your account.
                      </p>

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-6'>
                        <div className='bg-gray-50 rounded-lg p-6'>
                          <h4 className='font-semibold text-gray-900 mb-3'>
                            For Talents:
                          </h4>
                          <ul className='space-y-2 text-sm text-gray-600'>
                            <li>• Undergo skill assessments</li>
                            <li>• Upload your resume</li>
                            <li>• Complete profile verification</li>
                          </ul>
                        </div>
                        <div className='bg-gray-50 rounded-lg p-6'>
                          <h4 className='font-semibold text-gray-900 mb-3'>
                            For Recruiters & Startups:
                          </h4>
                          <ul className='space-y-2 text-sm text-gray-600'>
                            <li>• Post jobs and invite talents</li>
                            <li>• Schedule interviews</li>
                            <li>• Use AI-powered screening tools</li>
                          </ul>
                        </div>
                      </div>

                      <div className='bg-yellow-50 border-l-4 border-yellow-400 p-6'>
                        <div className='flex items-start'>
                          <AlertTriangle className='w-6 h-6 text-yellow-600 mr-3 mt-1' />
                          <p className='text-gray-700'>
                            We reserve the right to suspend or terminate your
                            account if any information provided during
                            registration is inaccurate, false, or misleading.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3 - Use of the Service */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center mr-4'>
                        <Shield className='w-6 h-6 text-warning' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        3. Use of the Service
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        TIAAGO provides tools and features for:
                      </p>

                      <div className='space-y-6 mb-6'>
                        <div className='bg-blue-50 rounded-lg p-6'>
                          <h4 className='font-semibold text-gray-900 mb-3'>
                            Talents:
                          </h4>
                          <p className='text-gray-700'>
                            Profile creation, resume upload, skill assessments,
                            interview scheduling, and application tracking.
                          </p>
                        </div>

                        <div className='bg-green-50 rounded-lg p-6'>
                          <h4 className='font-semibold text-gray-900 mb-3'>
                            Recruiters/Startups:
                          </h4>
                          <p className='text-gray-700'>
                            Job postings, talent discovery, resume screening,
                            skill-based assessments, pre-screening interviews
                            (via Jane, our AI agent), and communication tools.
                          </p>
                        </div>
                      </div>

                      <p className='text-gray-600'>
                        You agree to use the Service only for its intended
                        purpose and in compliance with applicable laws and
                        regulations. Any unauthorized, abusive, or harmful
                        activity is strictly prohibited.
                      </p>
                    </div>
                  </div>

                  {/* Section 4 - User Responsibilities */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-error/10 rounded-lg flex items-center justify-center mr-4'>
                        <Gavel className='w-6 h-6 text-error' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        4. User Responsibilities
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-6'>
                        <div className='border border-gray-200 rounded-lg p-6'>
                          <h4 className='font-semibold text-gray-900 mb-3'>
                            For Talents:
                          </h4>
                          <ul className='space-y-2 text-sm text-gray-600'>
                            <li>
                              • Provide honest and accurate information about
                              your skills, experience, and availability
                            </li>
                            <li>
                              • Participate in assessments and interviews fairly
                            </li>
                            <li>• Respect recruiters and hiring processes</li>
                          </ul>
                        </div>
                        <div className='border border-gray-200 rounded-lg p-6'>
                          <h4 className='font-semibold text-gray-900 mb-3'>
                            For Recruiters & Startups:
                          </h4>
                          <ul className='space-y-2 text-sm text-gray-600'>
                            <li>• Use candidate data responsibly</li>
                            <li>
                              • Avoid discriminatory or unethical hiring
                              practices
                            </li>
                            <li>• Respect candidates&apos; privacy and time</li>
                          </ul>
                        </div>
                      </div>

                      <p className='text-gray-600'>
                        TIAAGO may monitor platform activity to ensure
                        compliance and quality assurance.
                      </p>
                    </div>
                  </div>

                  {/* Section 5 - Subscription and Billing */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-4'>
                        <DollarSign className='w-6 h-6 text-primary' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        5. Subscription and Billing
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        TIAAGO offers a usage-based pricing model for recruiters
                        and startups. You will be billed monthly based on
                        metered usage of AI services such as resume screening,
                        assessment delivery, and pre-screening interviews.
                      </p>

                      <div className='bg-green-50 border border-green-200 rounded-lg p-6'>
                        <h4 className='font-semibold text-gray-900 mb-4'>
                          Billing Details:
                        </h4>
                        <div className='space-y-2'>
                          <div className='flex items-start'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-3 mt-0.5' />
                            <span className='text-gray-700'>
                              <strong>Pricing Transparency:</strong> Fees are
                              clearly stated in your dashboard
                            </span>
                          </div>
                          <div className='flex items-start'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-3 mt-0.5' />
                            <span className='text-gray-700'>
                              <strong>Free Tier:</strong> Some services may be
                              available under a free tier with limited access
                            </span>
                          </div>
                          <div className='flex items-start'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-3 mt-0.5' />
                            <span className='text-gray-700'>
                              <strong>Refunds:</strong> All fees are
                              non-refundable unless otherwise stated
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className='text-gray-600 mt-6'>
                        TIAAGO reserves the right to change its pricing plans
                        with reasonable notice.
                      </p>
                    </div>
                  </div>

                  {/* Section 6 - Marketplace and Hiring */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-secondary-2/10 rounded-lg flex items-center justify-center mr-4'>
                        <Building className='w-6 h-6 text-secondary-2' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        6. Marketplace and Hiring Transactions
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        Our platform facilitates talent discovery and hiring.
                        TIAAGO is not a party to employment contracts between
                        talents and recruiters/startups.
                      </p>

                      <div className='space-y-4 mb-6'>
                        <div className='bg-blue-50 rounded-lg p-4'>
                          <h4 className='font-semibold text-gray-900 mb-2'>
                            For Talents:
                          </h4>
                          <p className='text-gray-700 text-sm'>
                            You acknowledge that job offers and interviews are
                            managed by third parties.
                          </p>
                        </div>

                        <div className='bg-green-50 rounded-lg p-4'>
                          <h4 className='font-semibold text-gray-900 mb-2'>
                            For Recruiters/Startups:
                          </h4>
                          <p className='text-gray-700 text-sm'>
                            You are responsible for due diligence, compliance,
                            and payment for any employment engagement.
                          </p>
                        </div>
                      </div>

                      <p className='text-gray-600'>
                        TIAAGO may offer support services but is not responsible
                        for disputes or outcomes of hiring decisions.
                      </p>
                    </div>
                  </div>

                  {/* Section 7 - AI Usage Disclaimer */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center mr-4'>
                        <Brain className='w-6 h-6 text-warning' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        7. AI Usage Disclaimer
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        Our AI agent, Jane, assists in screening resumes,
                        administering assessments, and conducting pre-screening
                        interviews. While we strive for accuracy and fairness:
                      </p>

                      <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-6'>
                        <h4 className='font-semibold text-gray-900 mb-3'>
                          Important AI Disclaimers:
                        </h4>
                        <ul className='space-y-2 text-sm text-gray-700'>
                          <li>
                            • AI decisions are suggestions and must be reviewed
                            by human recruiters
                          </li>
                          <li>
                            • TIAAGO is not liable for hiring decisions based
                            solely on AI output
                          </li>
                          <li>
                            • You agree to use AI features ethically and within
                            the scope of your local labor laws
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Section 8 - Content Ownership */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center mr-4'>
                        <Lock className='w-6 h-6 text-success' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        8. Content Ownership and License
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        You retain ownership of any content you submit,
                        including resumes, job descriptions, and assessments.
                      </p>

                      <p className='text-gray-600 mb-6'>
                        By using TIAAGO, you grant us a non-exclusive,
                        worldwide, royalty-free license to use, display, and
                        process your content to provide the Service.
                      </p>

                      <div className='bg-red-50 border border-red-200 rounded-lg p-6'>
                        <h4 className='font-semibold text-gray-900 mb-3'>
                          You may not upload content that:
                        </h4>
                        <ul className='space-y-2 text-sm text-gray-700'>
                          <li>• Infringes on intellectual property</li>
                          <li>• Is defamatory, offensive, or illegal</li>
                          <li>• Contains malware or harmful code</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Section 9 - Data Privacy */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-4'>
                        <Shield className='w-6 h-6 text-primary' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        9. Data Privacy
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        Your privacy is important to us. TIAAGO collects and
                        processes data as described in our Privacy Policy.
                      </p>

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <div className='bg-gray-50 rounded-lg p-6'>
                          <h4 className='font-semibold text-gray-900 mb-3'>
                            Our Commitments:
                          </h4>
                          <ul className='space-y-2 text-sm text-gray-600'>
                            <li>
                              • We implement appropriate security measures
                            </li>
                            <li>• We do not sell your personal data</li>
                            <li>• We use data to improve the Service</li>
                          </ul>
                        </div>
                        <div className='bg-gray-50 rounded-lg p-6'>
                          <h4 className='font-semibold text-gray-900 mb-3'>
                            Your Responsibility:
                          </h4>
                          <p className='text-sm text-gray-600'>
                            You are responsible for complying with applicable
                            privacy laws when using our Service.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 10 - Termination */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-error/10 rounded-lg flex items-center justify-center mr-4'>
                        <AlertTriangle className='w-6 h-6 text-error' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        10. Termination
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        TIAAGO may suspend or terminate your account if you
                        violate these Terms or engage in prohibited behavior.
                        You may cancel your account at any time through your
                        settings.
                      </p>

                      <div className='bg-gray-50 rounded-lg p-6'>
                        <h4 className='font-semibold text-gray-900 mb-3'>
                          Upon termination:
                        </h4>
                        <ul className='space-y-2 text-sm text-gray-600'>
                          <li>• Your access to the Service will end</li>
                          <li>
                            • Your data may be retained for legal or compliance
                            reasons
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Section 11 - Disclaimers */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center mr-4'>
                        <Eye className='w-6 h-6 text-warning' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        11. Disclaimers
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        TIAAGO provides the Service &quot;as is&quot; and
                        &quot;as available.&quot; We make no warranties
                        regarding:
                      </p>

                      <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-6'>
                        <ul className='space-y-2 text-sm text-gray-700'>
                          <li>• Uptime or availability</li>
                          <li>• Accuracy of AI assessments</li>
                          <li>• Outcomes of hiring decisions</li>
                        </ul>
                        <p className='text-gray-700 mt-4 font-medium'>
                          You use the Service at your own risk.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 12 - Limitation of Liability */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-error/10 rounded-lg flex items-center justify-center mr-4'>
                        <Scale className='w-6 h-6 text-error' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        12. Limitation of Liability
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        To the fullest extent permitted by law, TIAAGO and its
                        affiliates shall not be liable for:
                      </p>

                      <div className='bg-red-50 border border-red-200 rounded-lg p-6'>
                        <ul className='space-y-2 text-sm text-gray-700'>
                          <li>
                            • Indirect, incidental, or consequential damages
                          </li>
                          <li>• Loss of profits, revenue, or data</li>
                          <li>• Any hiring disputes between users</li>
                        </ul>
                        <p className='text-gray-700 mt-4 font-medium'>
                          Our total liability shall not exceed the fees paid by
                          you in the last 6 months.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 13 - Indemnification */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-secondary-2/10 rounded-lg flex items-center justify-center mr-4'>
                        <Shield className='w-6 h-6 text-secondary-2' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        13. Indemnification
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        You agree to indemnify and hold harmless TIAAGO, its
                        affiliates, and staff from any claims, damages, or
                        liabilities arising from:
                      </p>

                      <div className='bg-blue-50 rounded-lg p-6'>
                        <ul className='space-y-2 text-sm text-gray-700'>
                          <li>• Your use of the Service</li>
                          <li>• Your content</li>
                          <li>
                            • Your violation of these Terms or applicable laws
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Section 14 - Changes to Terms */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-4'>
                        <FileText className='w-6 h-6 text-primary' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        14. Changes to Terms
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600'>
                        TIAAGO may update these Terms from time to time. We will
                        notify users through the platform or by email. Continued
                        use of the Service after changes means you accept the
                        new Terms.
                      </p>
                    </div>
                  </div>

                  {/* Section 15 - Governing Law */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center mr-4'>
                        <Globe className='w-6 h-6 text-success' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        15. Governing Law
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600'>
                        These Terms are governed by the laws of the State of
                        Delaware, United States, where TIAAGO Technologies LLC
                        is registered. Any disputes will be resolved in the
                        appropriate courts of jurisdiction.
                      </p>
                    </div>
                  </div>

                  {/* Section 16 - Contact Us */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-secondary-2/10 rounded-lg flex items-center justify-center mr-4'>
                        <Mail className='w-6 h-6 text-secondary-2' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        16. Contact Us
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        For any questions or concerns, contact:
                      </p>

                      <div className='bg-gray-50 rounded-lg p-6'>
                        <div className='space-y-4'>
                          <div>
                            <h4 className='font-semibold text-gray-900 mb-2'>
                              TIAAGO Technologies LLC
                            </h4>
                            <div className='space-y-2'>
                              <div className='flex items-center'>
                                <Mail className='w-4 h-4 text-gray-500 mr-2' />
                                <a
                                  href={`mailto:${SUPPORT_EMAIL}`}
                                  className='text-primary hover:text-primary-dark'
                                >
                                  {SUPPORT_EMAIL}
                                </a>
                              </div>
                              <div className='flex items-center'>
                                <Building className='w-4 h-4 text-gray-500 mr-2' />
                                <span className='text-gray-600'>
                                  1942 Broadway St, Suite 314C Boulder CO, US
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Closing Message */}
                  <div className='bg-gradient-to-r from-primary/5 to-secondary-2/5 border border-primary/20 rounded-lg p-6 text-center'>
                    <h3 className='font-semibold text-gray-900 mb-2'>
                      Thank you for choosing TIAAGO
                    </h3>
                    <p className='text-gray-600'>
                      We&apos;re excited to help you build the future of hiring.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Terms;
