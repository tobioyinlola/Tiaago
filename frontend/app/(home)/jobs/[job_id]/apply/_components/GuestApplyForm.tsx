"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import * as Yup from "yup";
import { Formik } from "formik";
import { CheckCircle2, Paperclip, FileText } from "lucide-react";

import "react-phone-input-2/lib/style.css";

import { Job } from "@/app/common/types";
import DaisyButton from "@/app/common/components/DaisyButton";
import FormikField from "@/app/common/components/Forms/FormikField";
import { VanillaFileInput } from "@/app/common/components/Forms/FileInput";
import { submitGuestJobApplication } from "@/app/common/services/jobs";

const MAX_RESUME_SIZE = 5 * 1024 * 1024; // 5MB

const validationSchema = Yup.object().shape({
  full_name: Yup.string().trim().required().label("Full name"),
  email: Yup.string().trim().email("Enter a valid email address").required().label("Email address"),
  phone_number: Yup.string().trim().required().label("Phone number"),
  linkedin_url: Yup.string().trim().url("Enter a valid URL").required().label("LinkedIn profile URL"),
  cover_letter: Yup.string().max(3000).label("Cover letter"),
  terms_accepted: Yup.boolean().oneOf([true], "You must agree to the Terms & Conditions and Privacy Policy"),
});

type FormValues = {
  full_name: string;
  email: string;
  phone_number: string;
  linkedin_url: string;
  cover_letter: string;
  terms_accepted: boolean;
};

const initialValues: FormValues = {
  full_name: "",
  email: "",
  phone_number: "",
  linkedin_url: "",
  cover_letter: "",
  terms_accepted: false,
};

const GuestApplyForm = ({ job }: { job: Job }) => {
  const [resumeFile, setResumeFile] = useState<File>();
  const [resumeFileName, setResumeFileName] = useState<string>();
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className='min-h-screen w-full bg-white flex flex-col'>
        <div className='flex-1 flex items-center justify-center px-6 pt-28 pb-16'>
          <div className='max-w-md w-full text-center px-8 py-10'>
            <div className='mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-6'>
              <CheckCircle2 className='h-8 w-8 text-success' />
            </div>
            <h1 className='text-2xl md:text-3xl font-bold text-primary-black font-space-grotesk mb-3'>
              Application submitted!
            </h1>
            <p className='text-secondary-black mb-8'>
              Thanks for applying to <span className='font-medium text-primary-black'>{job.title}</span>{" "}
              at <span className='font-medium text-primary-black'>{job.company?.company_name}</span>. We've
              sent a confirmation to your email -- if you're shortlisted, the hiring team will follow up
              with next steps.
            </p>
            <Link href={job.detail_url || "#"}>
              <DaisyButton color='primary' className='text-white'>
                Back to job details
              </DaisyButton>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen w-full bg-white flex flex-col'>
      <div className='flex-1 flex items-start justify-center px-4 md:px-10 pt-28 pb-16'>
        <div className='w-full max-w-2xl'>
          <Link
            href={job.detail_url || "#"}
            className='text-sm text-secondary-black hover:text-primary-black transition-colors mb-4 inline-block'
          >
            ← Back to job details
          </Link>

          <div className='mb-8'>
            <h1 className='text-2xl md:text-[28px] font-bold text-primary-black font-space-grotesk'>
              Apply for {job.title}
            </h1>
            <p className='text-secondary-black text-sm mt-1'>
              {job.company?.company_name}
              {job.location ? ` · ${job.location}` : ""}
            </p>
          </div>

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={async (values, { setSubmitting }) => {
              if (!resumeFile) {
                toast.error("Please upload your CV / resume");
                setSubmitting(false);
                return;
              }
              const result = await submitGuestJobApplication(job.apply_token || "", {
                ...values,
                full_name: values.full_name.trim(),
                email: values.email.trim(),
                resume: resumeFile,
              });
              setSubmitting(false);
              if (!result.success) {
                toast.error(result.error);
                return;
              }
              setSubmitted(true);
              window.scrollTo({ top: 0 });
            }}
          >
            {({ handleSubmit, errors, touched, values, isSubmitting, setFieldValue, isValid, dirty }) => {
              const canSubmit = isValid && dirty && !!resumeFile && !isSubmitting;
              return (
                <form onSubmit={handleSubmit} className='flex flex-col gap-6'>
                  <div className='flex flex-col gap-5'>
                    <p className='text-xs font-semibold uppercase tracking-wide text-secondary-black'>
                      Your details
                    </p>

                    <FormikField
                      name='full_name'
                      label='Full Name'
                      placeholder='Your full name'
                      value={values.full_name}
                      error={errors.full_name}
                      touched={touched.full_name}
                    />

                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
                      <FormikField
                        name='email'
                        type='email'
                        label='Email Address'
                        placeholder='you@example.com'
                        value={values.email}
                        error={errors.email}
                        touched={touched.email}
                      />

                      <FormikField
                        name='phone_number'
                        type='tel'
                        label='Phone Number'
                        placeholder='Your phone number'
                        value={values.phone_number}
                        error={errors.phone_number}
                        touched={touched.phone_number}
                      />
                    </div>

                    <FormikField
                      name='linkedin_url'
                      label='LinkedIn Profile URL'
                      placeholder='https://linkedin.com/in/your-profile'
                      value={values.linkedin_url}
                      error={errors.linkedin_url}
                      touched={touched.linkedin_url}
                    />
                  </div>

                  <div className='flex flex-col gap-5 pt-6 border-t border-gray-100'>
                    <p className='text-xs font-semibold uppercase tracking-wide text-secondary-black'>
                      Resume &amp; cover letter
                    </p>

                    <div>
                      <label className='label-text text-black font-medium font-onest mb-1 flex items-center gap-1.5'>
                        <FileText className='h-3.5 w-3.5 text-secondary-black' />
                        CV / Resume <span className='text-error'>*</span>
                      </label>
                      <VanillaFileInput
                        name='resume'
                        label=''
                        value={resumeFileName}
                        accept='.pdf,.doc,.docx'
                        acceptText='PDF or Word document (max. 5MB)'
                        maxFileSize={MAX_RESUME_SIZE}
                        className='h-36'
                        setFile={file => {
                          setResumeFile(file);
                          setResumeFileName(file.name);
                        }}
                      />
                      {resumeFileName && (
                        <p className='flex items-center gap-1.5 text-sm text-primary-black mt-2'>
                          <Paperclip className='h-3.5 w-3.5' /> {resumeFileName}
                        </p>
                      )}
                    </div>

                    <FormikField
                      name='cover_letter'
                      type='textarea'
                      label='Cover Letter (optional)'
                      placeholder='Tell us why you would be a great fit...'
                      value={values.cover_letter}
                      error={errors.cover_letter}
                      touched={touched.cover_letter}
                    />
                  </div>

                  <div className='pt-6 border-t border-gray-100 flex flex-col gap-5'>
                    <label className='flex items-start gap-3 cursor-pointer'>
                      <input
                        type='checkbox'
                        checked={values.terms_accepted}
                        onChange={e => setFieldValue("terms_accepted", e.target.checked)}
                        className='mt-1 h-4 w-4 rounded border-gray-300 accent-primary'
                      />
                      <span className='text-sm text-secondary-black'>
                        I agree to the{" "}
                        <Link href='/terms' target='_blank' className='text-primary underline'>
                          Terms &amp; Conditions
                        </Link>{" "}
                        and{" "}
                        <Link href='/privacy' target='_blank' className='text-primary underline'>
                          Privacy Policy
                        </Link>
                      </span>
                    </label>
                    {touched.terms_accepted && errors.terms_accepted && (
                      <p className='text-xs text-error -mt-3'>{errors.terms_accepted}</p>
                    )}

                    <DaisyButton
                      type='submit'
                      color='primary'
                      className='text-white w-full sm:w-auto px-10'
                      loading={isSubmitting}
                      disabled={!canSubmit}
                    >
                      {isSubmitting ? "" : "Submit Application"}
                    </DaisyButton>
                  </div>
                </form>
              );
            }}
          </Formik>
        </div>
      </div>
    </div>
  );
};

export default GuestApplyForm;
