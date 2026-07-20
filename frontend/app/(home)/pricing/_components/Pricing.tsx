"use client";

import Image from "next/image";
import { useState } from "react";
import { Gift, ArrowRight } from "lucide-react";

import {
  pricingTiers,
  currencyRates,
  type Currency,
} from "../constants";

import { formatPrice as formatPriceUtil } from "@/app/common/utils";

import Testimonials from "../../_components/Testimonials";
import { CustomAuthButton } from "@/app/common/components/AuthButton";

const Pricing = () => {
  const [usage, setUsage] = useState<{ [key: string]: number }>({
    "Resume Screening": 100,
    "Non-Technical Assessment": 30,
    "Technical Assessment": 30,
    "Pre-screening Interview": 15,
  });

  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("USD");

  const convertPrice = (priceUSD: number) => {
    const convertedPrice = priceUSD * currencyRates[selectedCurrency];
    return selectedCurrency === "NGN"
      ? convertedPrice.toFixed(0)
      : convertedPrice.toFixed(3);
  };

  const formatPrice = (price: string | number) => {
    return formatPriceUtil({
      price: +price,
      currencyCode: selectedCurrency,
      noOfDigits: selectedCurrency === "NGN" ? 0 : 2,
    });
  };

  const getTotalCandidates = () => {
    return Object.values(usage).reduce((total, count) => total + count, 0);
  };

  const getFreeCandidates = () => {
    const totalCandidates = getTotalCandidates();
    return Math.min(totalCandidates, 10);
  };

  const getPaidCandidates = () => {
    const totalCandidates = getTotalCandidates();
    return Math.max(totalCandidates - 10, 0);
  };

  const calculatePaidCost = () => {
    const paidCandidates = getPaidCandidates();
    if (paidCandidates === 0) return "0.00";

    const totalCandidates = getTotalCandidates();
    const totalCostUSD = Object.entries(usage).reduce(
      (total, [tierName, count]) => {
        const tier = pricingTiers.find(t => t.name === tierName);
        const paidCount = Math.max(count - (10 * count) / totalCandidates, 0);
        return total + (tier?.pricePerUnit || 0) * paidCount;
      },
      0
    );

    const converted = totalCostUSD * currencyRates[selectedCurrency];
    return selectedCurrency === "NGN"
      ? converted.toFixed(0)
      : converted.toFixed(2);
  };

  const handleUsageChange = (tierName: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setUsage(prev => ({
      ...prev,
      [tierName]: numValue,
    }));
  };

  return (
    <main className='pb-[112px] md:mb-[84px]'>
      <section className='pt-16 md:pt-[85px] relative pb-14 md:pb-20 bg-[radial-gradient(100%_100%_at_50%_0%,#FFFFFF_70%,#EEEFFF_100%)]'>
        <div className='relative pt-16 md:pt-[102px]'>
          <Image
            src='/assets/images/Pricing Background pattern.png'
            alt='Bg pattern'
            className='object-cover'
            fill
          />
          <div className='md:container mx-auto px-4 relative'>
            <div className='max-w-3xl mx-auto text-center'>
              <h1 className='text-4xl md:text-[60px] font-medium text-black font-onest mb-3 md:leading-[70px]'>
                Choose the plan that fits your workflow
              </h1>
              <p className='text-sm md:text-lg text-[#5F6264] font-onest mb-6'>
                Flexible pricing designed to scale with your needs. Whether
                you’re a recruiter agency or a recuiter, find the right plan to
                unlock all the features you need.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className='max-w-lg mx-auto text-center mt-16 md:mt-24'>
        <p className='text-sm text-primary font-jetbrains-mono'>
          PRICING PLANS
        </p>
        <h1 className='text-2xl md:text-[40px] font-semibold text-[#1D1D1D] font-onest my-2 leading-[52x]'>
          Usage-Based Pricing
        </h1>
        <p className='text-sm md:text-base text-[#0A0A0AB2]'>
          Pay only for what you use. Our AI-powered platform scales with your needs.
        </p>
      </div>

      <section className='mt-9'>
          <div className='md:container mx-auto px-4 lg:px-6 xl:px-8'>
            <div className='bg-[#0A0A0A05] rounded-xl border border-[#DEE1E3] p-4 max-md:py-6 md:p-12 max-w-6xl mx-auto'>
              <div className='grid gap-16 sm:gap-8 lg:grid-cols-2 items-center'>
                <div>
                  <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center'>
                    <h3 className='text-xl md:text-[26px] font-onest font-semibold text-black mb-2 sm:mb-0'>
                      Calculate Your Cost
                    </h3>
                    <select
                      value={selectedCurrency}
                      onChange={e =>
                        setSelectedCurrency(e.target.value as Currency)
                      }
                      className='w-full sm:w-auto px-5 py-2.5 bg-white border focus-visible:outline-none border-primary/20 rounded-[6px] cursor-pointer font-onest font-bold text-sm md:text-base text-primary'
                    >
                      <option value='USD'>USD</option>
                      <option value='EUR'>EUR</option>
                      <option value='GBP'>GBP</option>
                      <option value='NGN'>NGN</option>
                    </select>
                  </div>
                  <div className='space-y-6 mt-10'>
                    {pricingTiers.map(tier => (
                      <div key={tier.name} className='p-4 bg-white rounded-lg'>
                        <div className='flex items-center justify-between mb-2'>
                          <label className='flex items-center text-sm md:text-base font-semibold font-onest mb-2 sm:mb-0'>
                            {tier.name}
                            {/* <div className='group relative ml-2'>
                              <HelpCircle className='w-4 h-4 text-gray-400' />
                              <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded hidden group-hover:block z-10'>
                                {tier.description}
                              </div>
                            </div> */}
                          </label>
                          <span className='text-xs md:text-sm text-primary/50 font-onest bg-[#EEEFFF] py-0.5 px-2 rounded-full w-fit'>
                            {formatPrice(convertPrice(tier.pricePerUnit))}{" "}
                            /candidate
                          </span>
                        </div>
                        <input
                          type='number'
                          min='0'
                          value={usage[tier.name]}
                          onChange={e =>
                            handleUsageChange(tier.name, e.target.value)
                          }
                          className='w-full sm:flex-1 px-5 py-2 h-12 border border-[#D0D5DD] rounded-[6px] focus-visible:outline-none focus:border-primary text-sm'
                          placeholder='Enter quantity'
                        />
                        {!!usage[tier.name] && (
                          <p className='text-base font-onest font-semibold mt-3'>
                            <span className='text-sm text-gray-500 font-normal'>
                              Costs:{" "}
                            </span>
                            {usage[tier.name]} ×{" "}
                            {formatPrice(convertPrice(tier.pricePerUnit))} ={" "}
                            {formatPrice(
                              tier.pricePerUnit *
                                usage[tier.name] *
                                currencyRates[selectedCurrency]
                            )}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className='bg-[radial-gradient(100%_100%_at_50%_0%,#FFFFFF_70%,#F4F5FF_100%)] border integrations-shadow p-4 sm:p-6 md:p-8 rounded-xl h-fit'>
                  <h3 className='text-xl md:text-[26px] font-onest font-semibold text-[#1D1D1D] mb-3'>
                    Estimated Cost
                  </h3>

                  {/* Free Trial Section */}
                  <div className='bg-[linear-gradient(270deg,#FFC28C_0%,#A1708B_32.93%,#5465FF_100%)] text-white border-[1.5px] border-[#027A4826] rounded-lg p-3 mb-8'>
                    <div className='flex items-center mb-2'>
                      <Gift className='w-5 h-5 mr-2' />
                      <span className='text-sm font-onest font-bold'>
                        Free Trial
                      </span>
                    </div>
                    <div className='text-xs font-onest font-bold'>
                      First {getFreeCandidates()} candidates:{" "}
                      <span className='font-semibold'>FREE</span>
                    </div>
                  </div>

                  <div className='space-y-1'>
                    {pricingTiers.map(tier => (
                      <div
                        key={tier.name}
                        className='flex flex-col py-3 sm:flex-row sm:justify-between space-y-1 sm:space-y-0 text-[#0A0A0AB2] font-bold text-sm font-onest'
                      >
                        <h6 className='truncate pr-2'>{tier.name}</h6>
                        <span className='sm:text-right max-sm:opacity-75'>
                          {usage[tier.name]} ×{" "}
                          {formatPrice(convertPrice(tier.pricePerUnit))} ={" "}
                          {formatPrice(
                            tier.pricePerUnit *
                              usage[tier.name] *
                              currencyRates[selectedCurrency]
                          )}
                        </span>
                      </div>
                    ))}

                    <div className='border-y border-[#0A0A0A1A] pt-6 text-sm text-[#0A0A0AB2] font-bold font-onest space-y-1'>
                      <div className='flex justify-between items-center py-3'>
                        <span>Total candidates:</span>
                        <span>{getTotalCandidates()}</span>
                      </div>
                      <div className='flex justify-between items-center py-3 text-primary'>
                        <span>Free candidates:</span>
                        <span>{getFreeCandidates()}</span>
                      </div>
                      <div className='flex justify-between items-center py-3'>
                        <span>Paid candidates:</span>
                        <span>{getPaidCandidates()}</span>
                      </div>

                      <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 space-y-2 sm:space-y-0'>
                        <span className='font-semibold'>You Pay</span>
                        <span className='text-xl text-primary'>
                          {formatPrice(calculatePaidCost())}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className='mt-6 sm:mt-8'>
                    <CustomAuthButton fullWidth size='lg'>
                      Start for free <ArrowRight className='w-5 ml-2.5' />
                    </CustomAuthButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      <Testimonials />
    </main>
  );
};

export default Pricing;
