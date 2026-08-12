"use client";

import { MultiSelectInput, SelectInput } from "@/app/common/components/dashboard/SelectInput";
import {
  ROLE_CATEGORY_OPTIONS,
  INDUSTRY_OPTIONS,
  YEARS_EXPERIENCE_OPTIONS,
  WORK_TYPE_OPTIONS,
} from "@/app/common/constants/talent-network";
import { TalentNetworkAudienceFilter } from "@/app/common/types/campaigns.type";

const TalentNetworkAudiencePicker = ({
  value,
  onChange,
}: {
  value: TalentNetworkAudienceFilter;
  onChange: (value: TalentNetworkAudienceFilter) => void;
}) => (
  <div className="flex flex-col gap-3">
    <p className="text-xs text-[#9E9E9E]">
      Leave a filter empty to include every active, opted-in Talent Network member for that dimension.
    </p>
    <div>
      <label className="mb-1 block text-xs font-medium text-[#444444]">Role category</label>
      <MultiSelectInput
        placeholder="Any role..."
        options={ROLE_CATEGORY_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
        value={value.tn_role_categories}
        onChange={tn_role_categories => onChange({ ...value, tn_role_categories })}
      />
    </div>
    <div>
      <label className="mb-1 block text-xs font-medium text-[#444444]">Industry</label>
      <MultiSelectInput
        placeholder="Any industry..."
        options={INDUSTRY_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
        value={value.tn_industries}
        onChange={tn_industries => onChange({ ...value, tn_industries })}
      />
    </div>
    <div>
      <label className="mb-1 block text-xs font-medium text-[#444444]">Years of experience</label>
      <MultiSelectInput
        placeholder="Any experience level..."
        options={YEARS_EXPERIENCE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
        value={value.tn_years_experience}
        onChange={tn_years_experience => onChange({ ...value, tn_years_experience })}
      />
    </div>
    <div>
      <label className="mb-1 block text-xs font-medium text-[#444444]">Preferred work type</label>
      <SelectInput
        placeholder="Any work type..."
        options={WORK_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
        value={value.tn_work_type || null}
        onChange={v => onChange({ ...value, tn_work_type: v ?? "" })}
      />
    </div>
  </div>
);

export default TalentNetworkAudiencePicker;
