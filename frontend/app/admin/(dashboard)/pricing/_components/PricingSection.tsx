"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

import { PricingConfigRow, updatePricingConfigValue } from "@/app/common/services/pricing";

const formatExact = (value: string) => format(new Date(value), "MMM dd, yyyy hh:mm a");

type Field = {
  key: string;
  label: string;
  suffix: string;
  row?: PricingConfigRow;
};

const PricingField = ({
  field,
  currencySymbol,
  canManage,
}: {
  field: Field;
  currencySymbol: string;
  canManage: boolean;
}) => {
  const router = useRouter();
  const [value, setValue] = useState(field.row?.value ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value || Number(value) < 0 || Number.isNaN(Number(value))) {
      toast.error("Enter a valid positive number.");
      return;
    }
    setSaving(true);
    const result = await updatePricingConfigValue(field.key, value);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Pricing updated");
    router.refresh();
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-3 py-4 border-b border-gray-100 last:border-b-0">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
        <div className="relative max-w-full sm:max-w-[220px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            {currencySymbol}
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={e => setValue(e.target.value)}
            disabled={!canManage}
            className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
        {field.suffix && <span className="block text-xs text-gray-500 mt-1">{field.suffix}</span>}
        {field.row && (
          <p className="text-xs text-gray-400 mt-1">
            Last updated {formatExact(field.row.updated_at)}
            {field.row.updated_by_admin ? ` by ${field.row.updated_by_admin}` : ""}
          </p>
        )}
      </div>
      {canManage && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      )}
    </div>
  );
};

const PricingSection = ({
  title,
  currencySymbol,
  fields,
  canManage,
}: {
  title: string;
  currencySymbol: string;
  fields: Field[];
  canManage: boolean;
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
      <div>
        {fields.map(field => (
          <PricingField key={field.key} field={field} currencySymbol={currencySymbol} canManage={canManage} />
        ))}
      </div>
    </div>
  );
};

export default PricingSection;
