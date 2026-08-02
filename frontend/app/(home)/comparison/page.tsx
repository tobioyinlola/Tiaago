import { Check, X, Star, ArrowRight } from "lucide-react";

import Footer from "@/app/common/components/Layout/Footer";
import { Fragment } from "react";
import { CustomAuthButton } from "@/app/common/components/AuthButton";

export const metadata = {
  title: "Comparison",
};

const features = [
  {
    category: "Core Features",
    items: [
      {
        feature: "AI Resume Screening",
        tiaago: true,
        traditional: false,
        competitors: "Basic",
      },
      {
        feature: "Automated Skill Assessment",
        tiaago: true,
        traditional: false,
        competitors: "Limited",
      },
      {
        feature: "AI-Powered Interviews",
        tiaago: true,
        traditional: false,
        competitors: false,
      },
      {
        feature: "Real-time Candidate Scoring",
        tiaago: true,
        traditional: false,
        competitors: "Basic",
      },
      {
        feature: "Bias-Free Evaluation",
        tiaago: true,
        traditional: false,
        competitors: "Limited",
      },
    ],
  },
  {
    category: "Efficiency & Speed",
    items: [
      {
        feature: "Time-to-Hire Reduction",
        tiaago: "70%",
        traditional: "0%",
        competitors: "15-25%",
      },
      {
        feature: "Automated Screening",
        tiaago: true,
        traditional: false,
        competitors: "Limited",
      },
      {
        feature: "Bulk Candidate Processing",
        tiaago: true,
        traditional: false,
        competitors: "Limited",
      },
      {
        feature: "Instant Candidate Ranking",
        tiaago: true,
        traditional: false,
        competitors: false,
      },
    ],
  },
  {
    category: "Analytics & Insights",
    items: [
      {
        feature: "AI-Powered Analytics",
        tiaago: true,
        traditional: false,
        competitors: "Limited",
      },
      {
        feature: "Predictive Hiring Insights",
        tiaago: true,
        traditional: false,
        competitors: false,
      },
      {
        feature: "Performance Tracking",
        tiaago: true,
        traditional: "Manual",
        competitors: "Basic",
      },
      {
        feature: "Custom Reporting",
        tiaago: true,
        traditional: false,
        competitors: "Basic",
      },
    ],
  },
  {
    category: "Cost & Pricing",
    items: [
      {
        feature: "Usage-Based Pricing",
        tiaago: true,
        traditional: false,
        competitors: false,
      },
      {
        feature: "No Setup Fees",
        tiaago: true,
        traditional: false,
        competitors: "Limited",
      },
      {
        feature: "Transparent Pricing",
        tiaago: true,
        traditional: false,
        competitors: "Basic",
      },
      {
        feature: "ROI Tracking",
        tiaago: true,
        traditional: false,
        competitors: false,
      },
    ],
  },
];

const renderValue = (value: any) => {
  if (typeof value === "boolean") {
    return value ? (
      <Check className='w-5 h-5 text-green-500 mx-auto' />
    ) : (
      <X className='w-5 h-5 text-red-500 mx-auto' />
    );
  }

  if (
    value === "Limited" ||
    value === "Basic" ||
    value === "Partial" ||
    value === "Manual" ||
    value === "Varies"
  ) {
    return <span className='text-yellow-600 text-sm font-medium'>{value}</span>;
  }

  return <span className='text-gray-900 text-sm font-medium'>{value}</span>;
};

const Comparison = () => {
  return (
    <>
      <main className='pt-24'>
        {/* Hero Section */}
        <section className='py-16 bg-gradient-to-br from-primary/5 to-secondary-2/5'>
          <div className='container mx-auto px-4'>
            <div className='max-w-4xl mx-auto text-center'>
              <div className='inline-flex items-center bg-white rounded-full px-4 py-2 mb-6 shadow-sm'>
                <Star className='w-5 h-5 text-primary mr-2' />
                <span className='text-sm font-medium text-gray-700'>
                  Platform Comparison
                </span>
              </div>
              <h1 className='text-4xl md:text-5xl font-bold text-gray-900 mb-6'>
                Why Choose Tiaago?
              </h1>
              <p className='text-xl text-gray-600 mb-8'>
                See how Tiaago compares to traditional hiring methods and
                leading platforms like Greenhouse, Lever, Zoho, BambooHR, and
                Workday.
              </p>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className='py-16 bg-white'>
          <div className='container mx-auto px-4'>
            <div className='max-w-6xl mx-auto'>
              <div className='bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden'>
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead>
                      <tr className='bg-gray-50 border-b border-gray-200'>
                        <th className='px-6 py-4 text-left text-sm font-semibold text-gray-900 min-w-[200px]'>
                          Features
                        </th>
                        <th className='px-6 py-4 text-center text-sm font-semibold text-primary min-w-[150px]'>
                          <div className='flex flex-col items-center'>
                            <span className='text-lg font-bold'>Tiaago</span>
                            <span className='text-xs text-gray-500'>
                              AI-Powered
                            </span>
                          </div>
                        </th>
                        <th className='px-6 py-4 text-center text-sm font-semibold text-gray-700 min-w-[150px]'>
                          <div className='flex flex-col items-center'>
                            <span>Traditional</span>
                            <span className='text-xs text-gray-500'>
                              Manual Process
                            </span>
                          </div>
                        </th>
                        <th className='px-6 py-4 text-center text-sm font-semibold text-gray-700 min-w-[180px]'>
                          <div className='flex flex-col items-center'>
                            <span>Other Platforms</span>
                            <span className='text-xs text-gray-500'>
                              Greenhouse, Lever, Zoho, BambooHR, Workday
                            </span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {features.map((category, categoryIndex) => (
                        <Fragment key={categoryIndex}>
                          <tr className='bg-gray-25'>
                            <td colSpan={4} className='px-6 py-3 bg-gray-100'>
                              <h3 className='text-sm font-semibold text-gray-900'>
                                {category.category}
                              </h3>
                            </td>
                          </tr>
                          {category.items.map((item, itemIndex) => (
                            <tr
                              key={itemIndex}
                              className='border-b border-gray-100 hover:bg-gray-50'
                            >
                              <td className='px-6 py-4 text-sm text-gray-900'>
                                {item.feature}
                              </td>
                              <td className='px-6 py-4 text-center'>
                                {renderValue(item.tiaago)}
                              </td>
                              <td className='px-6 py-4 text-center'>
                                {renderValue(item.traditional)}
                              </td>
                              <td className='px-6 py-4 text-center'>
                                {renderValue(item.competitors)}
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Advantages */}
        <section className='py-16 bg-gray-50'>
          <div className='container mx-auto px-4'>
            <div className='max-w-4xl mx-auto'>
              <h2 className='text-3xl font-bold text-gray-900 mb-12 text-center'>
                Tiaago&apos;s Key Advantages
              </h2>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                <div className='bg-white rounded-xl p-6 shadow-sm border border-gray-200'>
                  <div className='w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4'>
                    <Check className='w-6 h-6 text-primary' />
                  </div>
                  <h3 className='text-xl font-semibold text-gray-900 mb-3'>
                    70% Faster Hiring
                  </h3>
                  <p className='text-gray-600'>
                    Our AI-powered platform reduces time-to-hire from weeks to
                    days, helping you secure top talent before competitors.
                  </p>
                </div>

                <div className='bg-white rounded-xl p-6 shadow-sm border border-gray-200'>
                  <div className='w-12 h-12 bg-secondary-2/10 rounded-lg flex items-center justify-center mb-4'>
                    <Star className='w-6 h-6 text-secondary-2' />
                  </div>
                  <h3 className='text-xl font-semibold text-gray-900 mb-3'>
                    95% Accuracy Rate
                  </h3>
                  <p className='text-gray-600'>
                    Advanced AI algorithms ensure precise candidate matching,
                    significantly improving hire quality and retention rates.
                  </p>
                </div>

                <div className='bg-white rounded-xl p-6 shadow-sm border border-gray-200'>
                  <div className='w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4'>
                    <ArrowRight className='w-6 h-6 text-success' />
                  </div>
                  <h3 className='text-xl font-semibold text-gray-900 mb-3'>
                    Bias-Free Evaluation
                  </h3>
                  <p className='text-gray-600'>
                    Eliminate unconscious bias with objective, skill-based
                    assessments that focus on merit and potential.
                  </p>
                </div>

                <div className='bg-white rounded-xl p-6 shadow-sm border border-gray-200'>
                  <div className='w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-4'>
                    <Check className='w-6 h-6 text-warning' />
                  </div>
                  <h3 className='text-xl font-semibold text-gray-900 mb-3'>
                    Cost-Effective Solution
                  </h3>
                  <p className='text-gray-600'>
                    Pay only for what you use with transparent, usage-based
                    pricing. No hidden fees or long-term contracts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className='py-16 bg-primary bg-opacity-5'>
          <div className='container mx-auto px-4'>
            <div className='max-w-3xl mx-auto text-center'>
              <h2 className='text-3xl font-bold text-gray-900 mb-6'>
                Ready to Experience the Difference?
              </h2>
              <p className='text-xl text-gray-600 mb-8'>
                Join thousands of companies that have transformed their hiring
                process with Tiaago.
              </p>
              <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                <CustomAuthButton size='lg' className='!rounded-full font-semibold'>
                  Start Free Trial
                  <ArrowRight className='ml-2 h-5 w-5' />
                </CustomAuthButton>
                <CustomAuthButton variant='outline' size='lg' className='!rounded-full font-semibold'>
                  Schedule Demo
                </CustomAuthButton>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Comparison;
