import * as Yup from "yup";

import { FormField } from "@/app/common/types";
import { richtextValidationSchema } from "@/app/common/constants/validationSchemas";

export const coverLetterValidationSchema = Yup.object().shape({
  cover_letter: richtextValidationSchema(3000, "Cover letter"),
});

type CoverLetterFormValues = Yup.InferType<typeof coverLetterValidationSchema>;

export const coverLetterInitialValues: CoverLetterFormValues = {
  cover_letter: "",
};

export const coverLetterFormFields: FormField<CoverLetterFormValues>[] = [
  {
    name: "cover_letter",
    label: "Write a Cover Letter",
    type: "richtext",
  },
];
