import * as Yup from "yup";

import { FormField } from "@/app/common/types";

export const paymentInfoValidationSchema = Yup.object().shape({
  account_name: Yup.string().required().label("Account Name"),
  account_number: Yup.string().required().label("Account Number"),
  bank_name: Yup.string().required().label("Bank Name"),
});

type PaymentInfoFormValues = Yup.InferType<typeof paymentInfoValidationSchema>;

export const paymentInfoFormFields: FormField<PaymentInfoFormValues>[] = [
  {
    name: "account_name",
    label: "Account Name",
    placeholder: "Enter account name",
    type: "text",
  },
  {
    name: "account_number",
    label: "Account Number",
    placeholder: "Enter account number",
    type: "text",
  },
  {
    name: "bank_name",
    label: "Bank Name",
    placeholder: "Enter bank name",
    type: "text",
  },
];
