import {
  Shield,
  Lock,
  Eye,
  Users,
  Database,
  FileText,
  CheckCircle,
  Mail,
  Phone,
} from "lucide-react";

import Footer from "@/app/common/components/Layout/Footer";

const Privacy: React.FC = () => {
  return (
    <>
      <main className='pt-24'>
        {/* Hero Section */}
        <section className='py-16 bg-gradient-to-br from-primary/5 to-secondary-2/5'>
          <div className='md:container mx-auto px-4'>
            <div className='max-w-4xl mx-auto text-center'>
              <div className='inline-flex items-center bg-white rounded-full px-4 py-2 mb-6 shadow-sm'>
                <Shield className='w-5 h-5 text-primary mr-2' />
                <span className='text-sm font-medium text-gray-700'>
                  Your Privacy Matters
                </span>
              </div>
              <h1 className='text-4xl md:text-5xl font-bold text-gray-900 mb-6'>
                Privacy Policy
              </h1>
              <p className='text-xl text-gray-600 mb-8'>
                We&apos;re committed to protecting your privacy and being
                transparent about how we collect, use, and share your
                information.
              </p>
              <div className='bg-white rounded-lg p-4 inline-flex items-center shadow-sm'>
                <span className='text-sm text-gray-600'>
                  Last updated: March 15, 2025
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Overview */}
        <section className='py-16 bg-white'>
          <div className='md:container mx-auto px-4'>
            <div className='max-w-4xl mx-auto'>
              <h2 className='text-2xl font-bold text-gray-900 mb-8 text-center'>
                Privacy at a Glance
              </h2>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-8 mb-16'>
                <div className='text-center p-6 bg-gray-50 rounded-xl'>
                  <div className='w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <Lock className='w-8 h-8 text-primary' />
                  </div>
                  <h3 className='font-semibold text-gray-900 mb-2'>
                    Data Protection
                  </h3>
                  <p className='text-gray-600 text-sm'>
                    We use industry-standard encryption and security measures to
                    protect your data.
                  </p>
                </div>
                <div className='text-center p-6 bg-gray-50 rounded-xl'>
                  <div className='w-16 h-16 bg-secondary-2/10 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <Eye className='w-8 h-8 text-secondary-2' />
                  </div>
                  <h3 className='font-semibold text-gray-900 mb-2'>
                    Transparency
                  </h3>
                  <p className='text-gray-600 text-sm'>
                    We&apos;re clear about what data we collect and how we use
                    it for our services.
                  </p>
                </div>
                <div className='text-center p-6 bg-gray-50 rounded-xl'>
                  <div className='w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <Users className='w-8 h-8 text-success' />
                  </div>
                  <h3 className='font-semibold text-gray-900 mb-2'>
                    Your Control
                  </h3>
                  <p className='text-gray-600 text-sm'>
                    You have full control over your data with options to access,
                    update, or delete it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Policy */}
        <section className='py-16 bg-gray-50'>
          <div className='md:container mx-auto px-4'>
            <div className='max-w-4xl mx-auto'>
              <div className='bg-white rounded-2xl shadow-lg overflow-hidden'>
                <div className='p-8 md:p-12'>
                  {/* Section 1 */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-4'>
                        <Database className='w-6 h-6 text-primary' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        1. Information We Collect
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        We collect information that you provide directly to us,
                        as well as information we gather automatically when you
                        use our services.
                      </p>

                      <div className='bg-blue-50 border-l-4 border-blue-400 p-6 mb-6'>
                        <h4 className='font-semibold text-gray-900 mb-3'>
                          Information you provide to us:
                        </h4>
                        <ul className='space-y-2'>
                          <li className='flex items-start'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0' />
                            <span className='text-gray-700'>
                              Account information (name, email address,
                              password)
                            </span>
                          </li>
                          <li className='flex items-start'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0' />
                            <span className='text-gray-700'>
                              Profile information (company details, job
                              preferences)
                            </span>
                          </li>
                          <li className='flex items-start'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0' />
                            <span className='text-gray-700'>
                              Communication data (messages, support requests)
                            </span>
                          </li>
                          <li className='flex items-start'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0' />
                            <span className='text-gray-700'>
                              Payment information (processed securely by
                              third-party providers)
                            </span>
                          </li>
                        </ul>
                      </div>

                      <div className='bg-yellow-50 border-l-4 border-yellow-400 p-6'>
                        <h4 className='font-semibold text-gray-900 mb-3'>
                          Information we collect automatically:
                        </h4>
                        <ul className='space-y-2'>
                          <li className='flex items-start'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0' />
                            <span className='text-gray-700'>
                              Usage data (how you interact with our platform)
                            </span>
                          </li>
                          <li className='flex items-start'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0' />
                            <span className='text-gray-700'>
                              Device information (IP address, browser type,
                              operating system)
                            </span>
                          </li>
                          <li className='flex items-start'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0' />
                            <span className='text-gray-700'>
                              Cookies and similar tracking technologies
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Section 2 */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-secondary-2/10 rounded-lg flex items-center justify-center mr-4'>
                        <FileText className='w-6 h-6 text-secondary-2' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        2. How We Use Your Information
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        We use the information we collect to provide, maintain,
                        and improve our services, as well as to communicate with
                        you.
                      </p>

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <div className='bg-gray-50 rounded-lg p-6'>
                          <h4 className='font-semibold text-gray-900 mb-3'>
                            Service Provision
                          </h4>
                          <ul className='space-y-2 text-sm text-gray-600'>
                            <li>
                              • Matching candidates with job opportunities
                            </li>
                            <li>• Processing payments and transactions</li>
                            <li>• Providing customer support</li>
                            <li>• Personalizing your experience</li>
                          </ul>
                        </div>
                        <div className='bg-gray-50 rounded-lg p-6'>
                          <h4 className='font-semibold text-gray-900 mb-3'>
                            Communication & Improvement
                          </h4>
                          <ul className='space-y-2 text-sm text-gray-600'>
                            <li>• Sending service updates and notifications</li>
                            <li>• Analyzing usage patterns</li>
                            <li>• Improving our AI algorithms</li>
                            <li>• Ensuring platform security</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3 */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center mr-4'>
                        <Lock className='w-6 h-6 text-success' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        3. Data Security & Protection
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        We implement comprehensive security measures to protect
                        your personal information against unauthorized access,
                        alteration, disclosure, or destruction.
                      </p>

                      <div className='bg-green-50 border border-green-200 rounded-lg p-6'>
                        <h4 className='font-semibold text-gray-900 mb-4'>
                          Our Security Measures Include:
                        </h4>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                          <div className='flex items-center'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-3' />
                            <span className='text-gray-700'>
                              256-bit SSL encryption
                            </span>
                          </div>
                          <div className='flex items-center'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-3' />
                            <span className='text-gray-700'>
                              Regular security audits
                            </span>
                          </div>
                          <div className='flex items-center'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-3' />
                            <span className='text-gray-700'>
                              Access controls and monitoring
                            </span>
                          </div>
                          <div className='flex items-center'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-3' />
                            <span className='text-gray-700'>
                              Data backup and recovery
                            </span>
                          </div>
                          <div className='flex items-center'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-3' />
                            <span className='text-gray-700'>
                              Employee training programs
                            </span>
                          </div>
                          <div className='flex items-center'>
                            <CheckCircle className='w-5 h-5 text-green-500 mr-3' />
                            <span className='text-gray-700'>
                              Compliance with industry standards
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 4 */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center mr-4'>
                        <Users className='w-6 h-6 text-warning' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        4. Your Rights & Choices
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        You have several rights regarding your personal
                        information. We&apos;re committed to helping you
                        exercise these rights.
                      </p>

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <div className='border border-gray-200 rounded-lg p-6'>
                          <h4 className='font-semibold text-gray-900 mb-3'>
                            Access & Portability
                          </h4>
                          <p className='text-gray-600 text-sm mb-3'>
                            Request a copy of your personal data in a portable
                            format.
                          </p>
                          <button className='text-primary hover:text-primary-dark text-sm font-medium'>
                            Request Data →
                          </button>
                        </div>
                        <div className='border border-gray-200 rounded-lg p-6'>
                          <h4 className='font-semibold text-gray-900 mb-3'>
                            Correction & Updates
                          </h4>
                          <p className='text-gray-600 text-sm mb-3'>
                            Update or correct any inaccurate personal
                            information.
                          </p>
                          <button className='text-primary hover:text-primary-dark text-sm font-medium'>
                            Update Profile →
                          </button>
                        </div>
                        <div className='border border-gray-200 rounded-lg p-6'>
                          <h4 className='font-semibold text-gray-900 mb-3'>
                            Deletion
                          </h4>
                          <p className='text-gray-600 text-sm mb-3'>
                            Request deletion of your personal data (subject to
                            legal requirements).
                          </p>
                          <button className='text-primary hover:text-primary-dark text-sm font-medium'>
                            Delete Account →
                          </button>
                        </div>
                        <div className='border border-gray-200 rounded-lg p-6'>
                          <h4 className='font-semibold text-gray-900 mb-3'>
                            Communication Preferences
                          </h4>
                          <p className='text-gray-600 text-sm mb-3'>
                            Control what communications you receive from us.
                          </p>
                          <button className='text-primary hover:text-primary-dark text-sm font-medium'>
                            Manage Preferences →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 5 */}
                  <div className='mb-12'>
                    <div className='flex items-center mb-6'>
                      <div className='w-10 h-10 bg-error/10 rounded-lg flex items-center justify-center mr-4'>
                        <Mail className='w-6 h-6 text-error' />
                      </div>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        5. Contact Us
                      </h2>
                    </div>
                    <div className='prose prose-lg max-w-none'>
                      <p className='text-gray-600 mb-6'>
                        If you have any questions about this Privacy Policy or
                        our data practices, please don&apos;t hesitate to
                        contact us.
                      </p>

                      <div className='bg-gray-50 rounded-lg p-6'>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                          <div>
                            <h4 className='font-semibold text-gray-900 mb-3'>
                              Privacy Officer
                            </h4>
                            <div className='space-y-2'>
                              <div className='flex items-center'>
                                <Mail className='w-4 h-4 text-gray-500 mr-2' />
                                <a
                                  href='mailto:privacy@tiaago.com'
                                  className='text-primary hover:text-primary-dark'
                                >
                                  privacy@tiaago.com
                                </a>
                              </div>
                              <div className='flex items-center'>
                                <Phone className='w-4 h-4 text-gray-500 mr-2' />
                                <a
                                  href='tel:+15551234567'
                                  className='text-primary hover:text-primary-dark'
                                >
                                  +1 (555) 123-4567
                                </a>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className='font-semibold text-gray-900 mb-3'>
                              Mailing Address
                            </h4>
                            <div className='text-gray-600'>
                              <p>1942 Broadway St,</p>
                              <p>Suite 314C Boulder CO, US</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Updates Notice */}
                  <div className='bg-blue-50 border border-blue-200 rounded-lg p-6'>
                    <h3 className='font-semibold text-gray-900 mb-2'>
                      Policy Updates
                    </h3>
                    <p className='text-gray-600 text-sm'>
                      We may update this Privacy Policy from time to time.
                      We&apos;ll notify you of any material changes by email or
                      through our platform. Your continued use of our services
                      after such modifications constitutes acceptance of the
                      updated Privacy Policy.
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

export default Privacy;
