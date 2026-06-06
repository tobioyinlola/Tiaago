import * as yup from "yup";

export const couponFormFields = [
  {
    name: "community_id",
    type: "select",
    label: "Community",
    required: true,
    selectFieldProps: {
      options: [], // Will be populated with communities
    },
  },
  {
    name: "discount_percent",
    type: "number",
    label: "Discount Percent",
    min: 0,
    max: 100,
  },
  {
    name: "max_usage",
    type: "number",
    label: "Max Usage",
    min: 1,
  },
  {
    name: "discount_amount_ngn",
    type: "number",
    label: "Discount Amount (NGN)",
    min: 0,
  },
  {
    name: "discount_amount_usd",
    type: "number",
    label: "Discount Amount (USD)",
    min: 0,
  },
  {
    name: "expires_at",
    type: "datetime-local",
    label: "Expiry Date & Time",
    required: true,
  },
];

export const couponFormValidationSchema = yup.object({
  community_id: yup.number().required("Community is required"),
  discount_percent: yup
    .number()
    .min(0, "Discount percent must be at least 0")
    .max(100, "Discount percent cannot exceed 100")
    .nullable(),
  max_usage: yup.number().min(1, "Max usage must be at least 1").nullable(),
  discount_amount_ngn: yup
    .number()
    .min(0, "Amount cannot be negative")
    .nullable(),
  discount_amount_usd: yup
    .number()
    .min(0, "Amount cannot be negative")
    .nullable(),
  expires_at: yup.string().required("Expiry date is required"),
});
