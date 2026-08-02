"use client";

import { useState } from "react";

import TwoPanelCompare from "./TwoPanelCompare";
import { pricingTiers } from "@/app/(home)/pricing/constants";

/** Illustrative funnel assumption for turning "open mandates" into a
 * candidate count: not a claim about any specific search, just enough to
 * make the flat-fee-vs-usage-based cost gap tangible and draggable. Real
 * per-candidate prices come from pricing/constants.tsx (kept in sync with
 * the backend's PricingConfig -- see that file's comments). */
const RESUMES_PER_MANDATE = 45;
const ASSESSMENTS_PER_MANDATE = 12;
const FLAT_FEE_MONTHLY_USD = 299;
const MAX_MANDATES = 40;
const DEFAULT_MANDATES = 8;

const resumePrice = pricingTiers.find(t => t.name === "Resume Screening")?.pricePerUnit ?? 0;
const assessmentPrice = pricingTiers.find(t => t.name === "Assessment")?.pricePerUnit ?? 0;
const costPerMandate = RESUMES_PER_MANDATE * resumePrice + ASSESSMENTS_PER_MANDATE * assessmentPrice;

const MandateCostSlider = () => {
  const [mandates, setMandates] = useState(DEFAULT_MANDATES);

  const tiaagoCost = mandates * costPerMandate;
  const maxBarValue = Math.max(FLAT_FEE_MONTHLY_USD, tiaagoCost);
  const flatFeeHeightPct = (FLAT_FEE_MONTHLY_USD / maxBarValue) * 100;
  const tiaagoHeightPct = Math.max((tiaagoCost / maxBarValue) * 100, 3);

  return (
    <div className='max-w-3xl mx-auto'>
      <div className='rounded-2xl border border-[#E4E7EC] bg-[#F8FAFC] p-6 md:p-8 mb-6'>
        <div className='flex items-center justify-between mb-3'>
          <label htmlFor='mandate-slider' className='text-sm font-onest font-semibold text-black'>
            Open clients this month
          </label>
          <span className='text-sm font-onest font-semibold text-primary bg-primary/10 rounded-full px-3 py-1'>
            {mandates}
          </span>
        </div>
        <input
          id='mandate-slider'
          type='range'
          min={1}
          max={MAX_MANDATES}
          value={mandates}
          onChange={e => setMandates(Number(e.target.value))}
          className='w-full accent-primary cursor-pointer'
        />
        <div className='flex justify-between text-[11px] font-onest text-[#98A2B3] mt-1'>
          <span>1 client</span>
          <span>{MAX_MANDATES} clients</span>
        </div>
      </div>

      <TwoPanelCompare
        leftLabel='Flat-fee tool'
        leftContent={
          <>
            <div className='h-40 flex items-end'>
              <div className='w-full rounded-t-md bg-[#CBD2D9] transition-all duration-300' style={{ height: `${flatFeeHeightPct}%` }} />
            </div>
            <p className='text-2xl font-onest font-semibold text-black mt-4'>${FLAT_FEE_MONTHLY_USD}/mo</p>
            <p className='text-xs font-onest text-[#667085] mt-1'>
              Same bill whether you run {mandates} client{mandates === 1 ? "" : "s"} or 40.
            </p>
          </>
        }
        rightLabel='Tiaago'
        rightContent={
          <>
            <div className='h-40 flex items-end'>
              <div className='w-full rounded-t-md bg-primary transition-all duration-300' style={{ height: `${tiaagoHeightPct}%` }} />
            </div>
            <p className='text-2xl font-onest font-semibold text-primary mt-4'>
              ${tiaagoCost < 10 ? tiaagoCost.toFixed(2) : tiaagoCost.toFixed(0)}/mo
            </p>
            <p className='text-xs font-onest text-[#667085] mt-1'>
              Scales with your {mandates} open client{mandates === 1 ? "" : "s"} this month.
            </p>
          </>
        }
      />
      <p className='text-center text-[11px] font-onest text-[#98A2B3] mt-4'>
        Illustrative estimate assuming ~{RESUMES_PER_MANDATE} resumes screened and {ASSESSMENTS_PER_MANDATE} assessments
        per client, at Tiaago&rsquo;s real per-candidate rates. See the pricing page for exact figures.
      </p>
    </div>
  );
};

export default MandateCostSlider;
