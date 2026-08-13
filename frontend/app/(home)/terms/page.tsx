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
                These Terms govern your access to and use of the Tiaago
                platform and all related services. Please read them
                carefully.
              </p>
              <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                <div className='bg-white rounded-lg p-4 shadow-sm'>
                  <span className='text-sm text-gray-600'>
                    Effective Date: 1 August 2026
                  </span>
                </div>
                <div className='bg-white rounded-lg p-4 shadow-sm'>
                  <span className='text-sm text-gray-600'>
                    Last Updated: 1 August 2026
                  </span>
                </div>
                <div className='bg-white rounded-lg p-4 shadow-sm'>
                  <span className='text-sm text-gray-600'>
                    Company: Tiaago Technologies Ltd
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
                  <div className='w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <Building className='w-8 h-8 text-primary' />
                  </div>
                  <h3 className='font-semibold text-gray-900 mb-2'>
                    Recruiters and Hiring Teams
                  </h3>
                  <p className='text-gray-600 text-sm'>
                    Post roles, screen candidates, run assessments, conduct
                    interviews, and manage hiring pipelines.
                  </p>
                </div>
                <div className='text-center p-6 bg-gray-50 rounded-xl'>
                  <div className='w-16 h-16 bg-secondary-2/10 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <Users className='w-8 h-8 text-secondary-2' />
                  </div>
                  <h3 className='font-semibold text-gray-900 mb-2'>
                    Candidates
                  </h3>
                  <p className='text-gray-600 text-sm'>
                    Apply for roles, complete assessments, and participate in
                    AI-conducted or human-led interviews arranged through
                    the platform.
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
                    Usage-based AI hiring infrastructure for resume
                    screening, assessments, and interviews.
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
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        These Terms of Service (&quot;Terms&quot;) govern
                        your access to and use of the Tiaago platform and
                        all related services (&quot;Service&quot;) operated
                        by Tiaago Technologies Ltd (&quot;Tiaago,&quot;
                        &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
                        By creating an account or using the Service in any
                        way, you confirm that you have read, understood,
                        and agreed to these Terms. If you do not agree, you
                        must not use the Service.
                      </p>
                    </div>
                  </div>

                  {/* Section 1 - Who These Terms Apply To */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-4'>
                        <Users className='w-6 h-6 text-primary' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        1. Who These Terms Apply To
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        Tiaago serves two categories of users:
                      </p>

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-6'>
                        <div className='bg-blue-50 rounded-lg p-6'>
                          <h4 className='font-semibold text-gray-900 mb-3'>
                            Recruiters and Hiring Teams:
                          </h4>
                          <p className='text-gray-700 text-sm'>
                            Individuals or organisations using Tiaago to
                            post roles, screen candidates, run assessments,
                            conduct interviews, and manage hiring pipelines.
                          </p>
                        </div>

                        <div className='bg-green-50 rounded-lg p-6'>
                          <h4 className='font-semibold text-gray-900 mb-3'>
                            Candidates:
                          </h4>
                          <p className='text-gray-700 text-sm'>
                            Individuals who apply for roles through
                            Tiaago-powered job links, complete assessments,
                            and participate in AI-conducted or human-led
                            interviews arranged through the platform.
                          </p>
                        </div>
                      </div>

                      <p className='text-gray-600'>
                        These Terms apply to both categories. Where specific
                        obligations apply to only one category, this is
                        stated clearly.
                      </p>
                    </div>
                  </div>

                  {/* Section 2 - Eligibility */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-secondary-2/10 rounded-lg flex items-center justify-center mr-4'>
                        <UserCheck className='w-6 h-6 text-secondary-2' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        2. Eligibility
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        You must be at least 18 years old to create an
                        account or use the Service. By using Tiaago, you
                        represent and warrant that you meet this
                        requirement.
                      </p>
                      <p className='text-gray-600'>
                        If you are using Tiaago on behalf of an
                        organisation, you represent and warrant that you
                        have the legal authority to bind that organisation
                        to these Terms, and that the organisation agrees to
                        be bound by them.
                      </p>
                    </div>
                  </div>

                  {/* Section 3 - Accounts and Registration */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center mr-4'>
                        <Lock className='w-6 h-6 text-success' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        3. Accounts and Registration
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <div className='space-y-6 mb-6'>
                        <div>
                          <h4 className='font-semibold text-gray-900 mb-2'>
                            3.1 Account Creation
                          </h4>
                          <p className='text-gray-600 text-sm'>
                            To access certain features, you must register
                            for an account. You agree to provide accurate,
                            current, and complete information at the time
                            of registration and to keep that information
                            updated.
                          </p>
                        </div>
                        <div>
                          <h4 className='font-semibold text-gray-900 mb-2'>
                            3.2 Account Security
                          </h4>
                          <p className='text-gray-600 text-sm'>
                            You are solely responsible for maintaining the
                            confidentiality of your login credentials and
                            for all activity that occurs under your
                            account. You must notify us immediately at{" "}
                            <a
                              href={`mailto:${SUPPORT_EMAIL}`}
                              className='text-primary hover:text-primary-dark'
                            >
                              {SUPPORT_EMAIL}
                            </a>{" "}
                            if you suspect any unauthorised access to your
                            account.
                          </p>
                        </div>
                        <div>
                          <h4 className='font-semibold text-gray-900 mb-2'>
                            3.3 One Account Per User
                          </h4>
                          <p className='text-gray-600 text-sm'>
                            You may not create multiple accounts for the
                            same individual or organisation without our
                            prior written consent. Accounts are
                            non-transferable.
                          </p>
                        </div>
                      </div>

                      <div className='bg-yellow-50 border-l-4 border-yellow-400 p-6'>
                        <div className='flex items-start'>
                          <AlertTriangle className='w-6 h-6 text-yellow-600 mr-3 mt-1' />
                          <p className='text-gray-700'>
                            <strong>3.4 Account Suspension:</strong> We
                            reserve the right to suspend or terminate your
                            account without notice if we determine that any
                            information provided during registration is
                            inaccurate, false, or misleading, or if you
                            violate any part of these Terms.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 4 - The Service */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center mr-4'>
                        <Building className='w-6 h-6 text-warning' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        4. The Service
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        <strong>4.1 What Tiaago Provides.</strong> Tiaago is
                        a usage-based AI hiring infrastructure platform. The
                        Service includes but is not limited to:
                      </p>

                      <div className='space-y-6 mb-6'>
                        <div className='bg-blue-50 rounded-lg p-6'>
                          <h4 className='font-semibold text-gray-900 mb-3'>
                            For Recruiters and Hiring Teams:
                          </h4>
                          <ul className='space-y-1.5 text-sm text-gray-700'>
                            <li>• Job creation and management</li>
                            <li>
                              • AI-powered resume screening and ranking
                            </li>
                            <li>• AI-generated role-specific assessments</li>
                            <li>• Assessment delivery and auto-grading</li>
                            <li>• Candidate pipeline management</li>
                            <li>
                              • Interview scheduling and coordination
                            </li>
                            <li>• AI-conducted screening interviews</li>
                            <li>
                              • Human interview support with AI Copilot
                              features including live transcription,
                              competency tracking, and post-interview
                              summary generation
                            </li>
                            <li>
                              • Talent pipeline and candidate database
                            </li>
                            <li>• Analytics and hiring reports</li>
                            <li>• Wallet-based billing management</li>
                            <li>• ATS integrations</li>
                          </ul>
                        </div>

                        <div className='bg-green-50 rounded-lg p-6'>
                          <h4 className='font-semibold text-gray-900 mb-3'>
                            For Candidates:
                          </h4>
                          <ul className='space-y-1.5 text-sm text-gray-700'>
                            <li>• Applying for roles via unique job links</li>
                            <li>• Completing AI-generated assessments</li>
                            <li>
                              • Participating in AI-conducted screening
                              interviews
                            </li>
                            <li>
                              • Participating in human-led interviews
                              conducted through the platform
                            </li>
                            <li>• Receiving interview feedback</li>
                          </ul>
                        </div>
                      </div>

                      <p className='text-gray-600 mb-4'>
                        <strong>4.2 Service Availability.</strong> We aim to
                        provide a reliable and available Service but do not
                        guarantee uninterrupted access. The Service is
                        provided &quot;as is&quot; and &quot;as
                        available.&quot; Scheduled maintenance, technical
                        issues, or events outside our control may cause
                        temporary unavailability.
                      </p>

                      <p className='text-gray-600'>
                        <strong>4.3 Changes to the Service.</strong> We may
                        add, modify, or discontinue features of the Service
                        at any time. Where a change materially affects your
                        use of the Service, we will provide reasonable
                        advance notice where possible.
                      </p>
                    </div>
                  </div>

                  {/* Section 5 - Acceptable Use */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-error/10 rounded-lg flex items-center justify-center mr-4'>
                        <Shield className='w-6 h-6 text-error' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        5. Acceptable Use
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        You agree to use the Service only for lawful
                        purposes and in accordance with these Terms. You
                        must not:
                      </p>

                      <div className='bg-red-50 border border-red-200 rounded-lg p-6 mb-6'>
                        <ul className='space-y-2 text-sm text-gray-700'>
                          <li>
                            (a) Use the Service to discriminate against
                            candidates on the basis of race, gender, age,
                            religion, disability, nationality, or any other
                            characteristic protected under applicable law.
                          </li>
                          <li>
                            (b) Submit false, misleading, or fraudulent
                            information, whether as a recruiter or a
                            candidate.
                          </li>
                          <li>
                            (c) Attempt to access, interfere with, or
                            disrupt the Service, its servers, or any
                            systems connected to it.
                          </li>
                          <li>
                            (d) Scrape, copy, or extract data from the
                            platform without our prior written consent.
                          </li>
                          <li>
                            (e) Use the Service to transmit any content
                            that is unlawful, harmful, threatening,
                            abusive, defamatory, obscene, or otherwise
                            objectionable.
                          </li>
                          <li>
                            (f) Use automated scripts, bots, or any
                            non-human means to interact with the Service
                            without our explicit written consent.
                          </li>
                          <li>
                            (g) Share your account credentials with any
                            third party or allow any other person to
                            access the Service using your credentials.
                          </li>
                          <li>
                            (h) Use candidate data obtained through the
                            platform for any purpose other than evaluating
                            that candidate for the specific role for which
                            they applied.
                          </li>
                        </ul>
                      </div>

                      <p className='text-gray-600'>
                        Tiaago reserves the right to monitor platform
                        activity for compliance purposes and to take action
                        where violations are identified.
                      </p>
                    </div>
                  </div>

                  {/* Section 6 - Usage-Based Pricing and Billing */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-4'>
                        <DollarSign className='w-6 h-6 text-primary' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        6. Usage-Based Pricing and Billing
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        <strong>6.1 Pricing Model.</strong> Tiaago operates
                        a usage-based pricing model. You are charged only
                        for the actions you take on the platform. There are
                        no mandatory monthly subscriptions or seat fees.
                        Current pricing is displayed on the Tiaago pricing
                        page and in your dashboard.
                      </p>

                      <div className='bg-green-50 border border-green-200 rounded-lg p-6 mb-6'>
                        <div className='space-y-2'>
                          <div className='flex items-start'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-3 mt-0.5' />
                            <span className='text-gray-700'>
                              <strong>6.2 Free Tier:</strong> New
                              organisations receive a free allowance of
                              candidate processings at the start of their
                              account. The specific allowance is detailed
                              in your dashboard. Once the free allowance is
                              exhausted, standard usage pricing applies.
                            </span>
                          </div>
                          <div className='flex items-start'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-3 mt-0.5' />
                            <span className='text-gray-700'>
                              <strong>6.3 Wallet System:</strong> Recruiters
                              and hiring teams fund a Tiaago wallet in
                              advance. Wallet funds are deducted
                              automatically as billable actions are taken,
                              including resume screenings, assessment
                              deliveries, and interview sessions. You are
                              responsible for maintaining a sufficient
                              wallet balance to continue using the Service.
                            </span>
                          </div>
                          <div className='flex items-start'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-3 mt-0.5' />
                            <span className='text-gray-700'>
                              <strong>6.4 Low Balance Alerts:</strong> You
                              may configure a low balance alert threshold
                              in your account settings. Tiaago will notify
                              you when your wallet balance falls below the
                              threshold you set. Tiaago is not responsible
                              for service interruptions caused by an
                              insufficient wallet balance.
                            </span>
                          </div>
                          <div className='flex items-start'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-3 mt-0.5' />
                            <span className='text-gray-700'>
                              <strong>6.5 Payment Processing:</strong>{" "}
                              Payments are processed through third-party
                              payment providers including Bachs and
                              Paystack. By making a payment, you agree to
                              the terms and conditions of the relevant
                              payment provider. Tiaago does not store your
                              full card or bank account details.
                            </span>
                          </div>
                          <div className='flex items-start'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-3 mt-0.5' />
                            <span className='text-gray-700'>
                              <strong>6.6 Refunds:</strong> All wallet
                              top-up payments are non-refundable except
                              where required by applicable law or where
                              Tiaago determines at its sole discretion that
                              a refund is warranted. Unused wallet balances
                              may be eligible for withdrawal subject to our
                              withdrawal policy.
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className='text-gray-600'>
                        <strong>6.7 Pricing Changes.</strong> Tiaago
                        reserves the right to change its pricing at any
                        time. We will provide at least 14 days&apos;
                        advance notice of any price changes via email or
                        in-platform notification. Continued use of the
                        Service after a price change constitutes
                        acceptance of the new pricing.
                      </p>
                    </div>
                  </div>

                  {/* Section 7 - AI Features and Limitations */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-secondary-2/10 rounded-lg flex items-center justify-center mr-4'>
                        <Brain className='w-6 h-6 text-secondary-2' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        7. AI Features and Limitations
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        <strong>7.1 AI-Assisted Hiring Tools.</strong>{" "}
                        Tiaago uses artificial intelligence across several
                        features including resume screening, assessment
                        generation and grading, AI-conducted screening
                        interviews, and post-interview analysis and
                        summaries.
                      </p>

                      <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6'>
                        <h4 className='font-semibold text-gray-900 mb-3'>
                          7.2 AI as a Support Tool
                        </h4>
                        <p className='text-gray-700 text-sm mb-3'>
                          All AI outputs — including screening scores,
                          assessment results, interview transcripts,
                          summaries, and hiring recommendations — are
                          provided as a support tool. They are intended to
                          assist human decision-makers, not to replace
                          them.
                        </p>
                        <p className='text-gray-700 text-sm font-medium'>
                          Tiaago operates on the principle that AI
                          recommends and humans decide. No hiring decision
                          should be made solely on the basis of AI output
                          without human review and judgment.
                        </p>
                      </div>

                      <p className='text-gray-600 mb-4'>
                        <strong>7.3 Accuracy and Reliability.</strong> While
                        we work to ensure that AI outputs are accurate and
                        relevant, we do not guarantee the accuracy,
                        completeness, or fitness for purpose of any
                        AI-generated content. AI systems can produce
                        errors, inconsistencies, or outputs that are not
                        appropriate for a given candidate or role.
                      </p>

                      <p className='text-gray-600 mb-4'>
                        <strong>7.4 Recruiter Responsibility.</strong>{" "}
                        Recruiters are solely responsible for all final
                        hiring decisions made using the Service. Tiaago is
                        not liable for any hiring outcome, employment
                        decision, or resulting dispute arising from the use
                        of AI-generated recommendations.
                      </p>

                      <p className='text-gray-600 mb-4'>
                        <strong>7.5 Compliance with Employment Law.</strong>{" "}
                        You are responsible for ensuring that your use of
                        AI-assisted hiring tools complies with all
                        applicable employment, anti-discrimination, and
                        data protection laws in your jurisdiction,
                        including but not limited to laws in Nigeria, the
                        United Kingdom, and the United States where
                        relevant.
                      </p>

                      <p className='text-gray-600'>
                        <strong>7.6 AI Interview Recording.</strong> Where
                        AI-conducted or human-led interviews are recorded
                        on the platform, candidate consent is required
                        before recording begins. Recruiters must not
                        attempt to enable recording without obtaining the
                        candidate&apos;s informed consent through the
                        Tiaago consent flow. Recordings are stored securely
                        and subject to the retention periods set in the
                        recruiter&apos;s account settings.
                      </p>
                    </div>
                  </div>

                  {/* Section 8 - Candidate Data and Responsibility */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center mr-4'>
                        <Eye className='w-6 h-6 text-success' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        8. Candidate Data and Responsibility
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        <strong>8.1 Recruiter as Data Controller.</strong>{" "}
                        Where recruiters collect and process candidate
                        personal data through the platform, they do so as
                        independent data controllers under applicable data
                        protection law. Recruiters are responsible for
                        having a lawful basis for processing candidate data
                        and for complying with their obligations under
                        applicable law including the Nigeria Data
                        Protection Act 2023, the UK GDPR, and the EU GDPR
                        as applicable.
                      </p>

                      <p className='text-gray-600 mb-6'>
                        <strong>8.2 Permitted Use of Candidate Data.</strong>{" "}
                        Candidate data obtained through Tiaago may only be
                        used for the purpose of evaluating that candidate
                        for the specific role for which they applied, or
                        with the candidate&apos;s explicit consent for
                        other purposes. Selling, sharing, or otherwise
                        distributing candidate data to third parties not
                        involved in the hiring process is strictly
                        prohibited.
                      </p>

                      <div className='bg-gray-50 rounded-lg p-6'>
                        <h4 className='font-semibold text-gray-900 mb-2'>
                          8.3 Candidate Rights
                        </h4>
                        <p className='text-gray-600 text-sm'>
                          Candidates have the right to request access to,
                          correction of, or deletion of their personal data
                          held on the platform. Requests should be directed
                          to{" "}
                          <a
                            href={`mailto:${SUPPORT_EMAIL}`}
                            className='text-primary hover:text-primary-dark'
                          >
                            {SUPPORT_EMAIL}
                          </a>
                          . Recruiters must cooperate with any legitimate
                          data subject request involving candidate data
                          they control.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 9 - Content Ownership and Licensing */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center mr-4'>
                        <FileText className='w-6 h-6 text-warning' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        9. Content Ownership and Licensing
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        <strong>9.1 Your Content.</strong> You retain
                        ownership of all content you submit to the
                        platform, including job descriptions, candidate
                        data, assessment questions you create, resumes, and
                        any other materials you upload (&quot;Your
                        Content&quot;).
                      </p>

                      <p className='text-gray-600 mb-6'>
                        <strong>9.2 License to Tiaago.</strong> By
                        submitting content to the platform, you grant
                        Tiaago a non-exclusive, worldwide, royalty-free
                        licence to use, store, process, display, and
                        transmit Your Content solely to the extent
                        necessary to provide and improve the Service.
                      </p>

                      <div className='bg-red-50 border border-red-200 rounded-lg p-6 mb-6'>
                        <h4 className='font-semibold text-gray-900 mb-3'>
                          9.3 Prohibited Content — you must not upload or
                          submit content that:
                        </h4>
                        <ul className='space-y-2 text-sm text-gray-700'>
                          <li>
                            • Infringes any intellectual property rights of
                            a third party
                          </li>
                          <li>• Is defamatory, fraudulent, or unlawful</li>
                          <li>• Contains malware or any harmful code</li>
                          <li>
                            • Violates any applicable law or regulation
                          </li>
                        </ul>
                      </div>

                      <p className='text-gray-600'>
                        <strong>9.4 Tiaago Intellectual Property.</strong>{" "}
                        All intellectual property in the Tiaago platform,
                        including its technology, design, software, AI
                        models, brand, and documentation, belongs to Tiaago
                        Technologies Ltd or its licensors. You are granted
                        a limited, non-exclusive, non-transferable licence
                        to use the Service for its intended purpose during
                        the term of your account. You may not copy, modify,
                        distribute, or create derivative works from any
                        part of the Service without our prior written
                        consent.
                      </p>
                    </div>
                  </div>

                  {/* Section 10 - Integrations and Third-Party Services */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-secondary-2/10 rounded-lg flex items-center justify-center mr-4'>
                        <Globe className='w-6 h-6 text-secondary-2' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        10. Integrations and Third-Party Services
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600'>
                        The Service may integrate with third-party
                        platforms including applicant tracking systems,
                        calendar services, video conferencing tools, and
                        payment providers. These integrations are provided
                        for your convenience. Tiaago is not responsible for
                        the availability, security, or conduct of any
                        third-party service. Your use of third-party
                        services is governed by their respective terms and
                        privacy policies.
                      </p>
                    </div>
                  </div>

                  {/* Section 11 - Termination */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-4'>
                        <AlertTriangle className='w-6 h-6 text-primary' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        11. Termination
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        <strong>11.1 By You.</strong> You may close your
                        account at any time by contacting{" "}
                        <a
                          href={`mailto:${SUPPORT_EMAIL}`}
                          className='text-primary hover:text-primary-dark'
                        >
                          {SUPPORT_EMAIL}
                        </a>{" "}
                        or using the account settings in your dashboard.
                        Closing your account does not entitle you to a
                        refund of any unused wallet balance except where
                        required by applicable law.
                      </p>

                      <p className='text-gray-600 mb-6'>
                        <strong>11.2 By Tiaago.</strong> We may suspend or
                        terminate your access to the Service immediately
                        and without notice if you violate these Terms,
                        engage in fraudulent or abusive activity, or if we
                        are required to do so by law.
                      </p>

                      <div className='bg-gray-50 rounded-lg p-6'>
                        <h4 className='font-semibold text-gray-900 mb-2'>
                          11.3 Effect of Termination
                        </h4>
                        <p className='text-gray-600 text-sm'>
                          Upon termination, your right to access the
                          Service ends immediately. We may retain your data
                          for a period following termination as required
                          by applicable law or for legitimate business
                          purposes including dispute resolution and fraud
                          prevention. Our Privacy Policy describes how we
                          handle your data after termination.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 12 - Disclaimers */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center mr-4'>
                        <CheckCircle className='w-6 h-6 text-warning' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        12. Disclaimers
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-6'>
                        <p className='text-gray-700 text-sm mb-4 uppercase'>
                          The Service is provided &quot;as is&quot; and
                          &quot;as available&quot; without warranty of any
                          kind, express or implied. To the fullest extent
                          permitted by applicable law, Tiaago disclaims all
                          warranties including but not limited to
                          warranties of merchantability, fitness for a
                          particular purpose, and non-infringement.
                        </p>
                        <p className='text-gray-700 text-sm uppercase'>
                          Tiaago does not warrant that the Service will be
                          uninterrupted, error-free, or free of harmful
                          components. We do not guarantee the accuracy or
                          completeness of any AI-generated output or any
                          hiring outcome resulting from use of the Service.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 13 - Limitation of Liability */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-error/10 rounded-lg flex items-center justify-center mr-4'>
                        <Gavel className='w-6 h-6 text-error' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        13. Limitation of Liability
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <div className='bg-red-50 border border-red-200 rounded-lg p-6 mb-6'>
                        <p className='text-gray-700 text-sm mb-3'>
                          <strong>13.1</strong> To the fullest extent
                          permitted by applicable law, Tiaago and its
                          directors, employees, agents, and affiliates
                          shall not be liable for any indirect, incidental,
                          special, consequential, or punitive damages,
                          including but not limited to loss of profits,
                          loss of data, loss of goodwill, or business
                          interruption, arising from or related to your use
                          of or inability to use the Service.
                        </p>
                        <p className='text-gray-700 text-sm font-medium'>
                          <strong>13.2</strong> Our total aggregate
                          liability to you for any claims arising under or
                          related to these Terms shall not exceed the total
                          fees paid by you to Tiaago in the six months
                          preceding the event giving rise to the claim.
                        </p>
                      </div>

                      <p className='text-gray-600'>
                        <strong>13.3</strong> Nothing in these Terms limits
                        or excludes our liability for death or personal
                        injury caused by our negligence, fraud or
                        fraudulent misrepresentation, or any other
                        liability that cannot be limited or excluded by
                        applicable law.
                      </p>
                    </div>
                  </div>

                  {/* Section 14 - Indemnification */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-secondary-2/10 rounded-lg flex items-center justify-center mr-4'>
                        <Shield className='w-6 h-6 text-secondary-2' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        14. Indemnification
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600'>
                        You agree to indemnify, defend, and hold harmless
                        Tiaago and its directors, employees, and agents
                        from and against any claims, liabilities, damages,
                        losses, and expenses, including reasonable legal
                        fees, arising out of or in connection with your use
                        of the Service, your violation of these Terms, your
                        violation of any applicable law, or your
                        infringement of any rights of a third party.
                      </p>
                    </div>
                  </div>

                  {/* Section 15 - Governing Law and Dispute Resolution */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center mr-4'>
                        <Scale className='w-6 h-6 text-success' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        15. Governing Law and Dispute Resolution
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        <strong>15.1 Governing Law.</strong> These Terms are
                        governed by and construed in accordance with the
                        laws of Nigeria. Where Tiaago serves users in the
                        United Kingdom or European Union, applicable local
                        consumer protection and data protection laws also
                        apply to the extent required.
                      </p>
                      <p className='text-gray-600'>
                        <strong>15.2 Dispute Resolution.</strong> In the
                        event of any dispute arising out of or relating to
                        these Terms or the Service, the parties agree to
                        first attempt to resolve the dispute informally by
                        contacting{" "}
                        <a
                          href={`mailto:${SUPPORT_EMAIL}`}
                          className='text-primary hover:text-primary-dark'
                        >
                          {SUPPORT_EMAIL}
                        </a>
                        . If the dispute is not resolved within 30 days,
                        either party may pursue formal legal proceedings in
                        the appropriate courts of jurisdiction.
                      </p>
                    </div>
                  </div>

                  {/* Section 16 - Changes to These Terms */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-4'>
                        <FileText className='w-6 h-6 text-primary' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        16. Changes to These Terms
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600'>
                        We may update these Terms from time to time. When
                        we do, we will update the &quot;Last Updated&quot;
                        date at the top of this page and notify you by
                        email or in-platform notification where the
                        changes are material. Your continued use of the
                        Service after the effective date of any changes
                        constitutes your acceptance of the updated Terms.
                      </p>
                    </div>
                  </div>

                  {/* Section 17 - Contact */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-secondary-2/10 rounded-lg flex items-center justify-center mr-4'>
                        <Mail className='w-6 h-6 text-secondary-2' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        17. Contact
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        For questions or concerns about these Terms, please
                        contact us at:
                      </p>

                      <div className='bg-gray-50 rounded-lg p-6'>
                        <div className='space-y-4'>
                          <div>
                            <h4 className='font-semibold text-gray-900 mb-2'>
                              Tiaago Technologies Ltd
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
                                <Globe className='w-4 h-4 text-gray-500 mr-2' />
                                <span className='text-gray-600'>
                                  www.tiaago.com
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
                      Thank you for choosing Tiaago
                    </h3>
                    <p className='text-gray-600'>
                      We&apos;re excited to help you build the future of
                      hiring.
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
