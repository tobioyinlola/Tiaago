"use client";

import { useState } from "react";
import { toast } from "sonner";
import * as Yup from "yup";
import { Formik } from "formik";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

import DaisyButton from "@/app/common/components/DaisyButton";
import FormikField from "@/app/common/components/Forms/FormikField";
import FileDropzone from "@/app/common/components/dashboard/FileDropzone";
import { submitTicket } from "@/app/common/services/support";
import { TicketCategory, TicketDetail } from "@/app/common/types/support.type";

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: "BILLING", label: "Billing" },
  { value: "TECHNICAL", label: "Technical issue" },
  { value: "ACCOUNT", label: "Account and access" },
  { value: "ASSESSMENTS", label: "Assessments" },
  { value: "PIPELINE", label: "Pipeline" },
  { value: "OTHER", label: "Other" },
];

const validationSchema = Yup.object().shape({
  title: Yup.string().trim().max(120).required().label("Title"),
  category: Yup.string().required().label("Category"),
  message: Yup.string().trim().min(20, "Please describe your issue in at least 20 characters.").required().label("Message"),
});

type FormValues = { title: string; category: string; message: string };

const initialValues: FormValues = { title: "", category: "", message: "" };

const TicketSubmitForm = () => {
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submittedTicket, setSubmittedTicket] = useState<TicketDetail | null>(null);

  if (submittedTicket) {
    return (
      <div className="max-w-xl rounded-lg border border-[#EAECEE] bg-white p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mb-5">
          <CheckCircle2 className="h-7 w-7 text-success" />
        </div>
        <h2 className="text-xl font-bold text-primary-black font-space-grotesk mb-2">
          Your ticket {submittedTicket.ticket_number} has been submitted.
        </h2>
        <p className="text-secondary-black mb-6">We will get back to you by email.</p>
        <div className="flex items-center justify-center gap-3">
          <DaisyButton
            color="primary"
            className="text-white"
            onClick={() => {
              setSubmittedTicket(null);
              setAttachments([]);
            }}
          >
            Submit another ticket
          </DaisyButton>
          <Link href="/recruiter/dashboard/support/tickets">
            <DaisyButton className="border border-[#D0D5DD]">View my tickets</DaisyButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={async (values, { setSubmitting }) => {
          const result = await submitTicket({
            title: values.title.trim(),
            category: values.category as TicketCategory,
            message: values.message.trim(),
            attachments,
          });
          setSubmitting(false);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          setSubmittedTicket(result.data);
        }}
      >
        {({ handleSubmit, errors, touched, values, isSubmitting, isValid, dirty }) => (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <FormikField
                name="title"
                label="What do you need help with?"
                placeholder="Briefly summarise your issue"
                value={values.title}
                error={errors.title}
                touched={touched.title}
              />
              <p className="text-xs text-secondary-black text-right -mt-1">{values.title.length}/120</p>
            </div>

            <FormikField
              name="category"
              type="select"
              label="Category"
              placeholder="Select a category"
              value={values.category}
              error={errors.category}
              touched={touched.category}
              selectFieldProps={{
                options: CATEGORY_OPTIONS,
                value: CATEGORY_OPTIONS.find(o => o.value === values.category) ?? null,
              }}
            />

            <div>
              <FormikField
                name="message"
                type="textarea"
                label="Describe your issue"
                placeholder="Include as much detail as you can -- what happened, what you expected, and any steps to reproduce it."
                value={values.message}
                error={errors.message}
                touched={touched.message}
              />
              <p className="text-xs text-secondary-black text-right -mt-1">{values.message.length} characters (min. 20)</p>
            </div>

            <div>
              <label className="label-text text-black font-medium font-onest mb-1 block">
                Attachments (optional)
              </label>
              <FileDropzone files={attachments} onChange={setAttachments} />
            </div>

            <div className="pt-4 border-t border-gray-100">
              <DaisyButton
                type="submit"
                color="primary"
                className="text-white w-full sm:w-auto px-10"
                loading={isSubmitting}
                disabled={!isValid || !dirty || isSubmitting}
              >
                {isSubmitting ? "" : "Send ticket"}
              </DaisyButton>
            </div>
          </form>
        )}
      </Formik>
    </div>
  );
};

export default TicketSubmitForm;
