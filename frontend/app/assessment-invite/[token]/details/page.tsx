"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Lock } from "lucide-react";

import DaisyButton from "@/app/common/components/DaisyButton";
import InviteShell from "../_components/InviteShell";
import { useInviteFlow } from "../_components/InviteFlowProvider";
import { confirmAssessmentInviteDetails } from "@/app/common/services/assessment-invite";

const DetailsPage = () => {
  const router = useRouter();
  const { token, candidate_name, candidate_email, is_standalone, setCandidateName } = useInviteFlow();
  const [fullName, setFullName] = useState(candidate_name);
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    setSubmitting(true);
    const result = await confirmAssessmentInviteDetails(token, fullName.trim());
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setCandidateName(fullName.trim());
    router.push(`/assessment-invite/${token}/honesty`);
  };

  return (
    <InviteShell step={2}>
      <h2 className='text-lg font-bold text-primary-black mb-1'>Please enter your details</h2>
      <p className='text-secondary-black text-sm mb-6'>
        Confirm who you are so the recruiter can match this attempt to your invitation.
      </p>

      <div className='space-y-5'>
        <div>
          <label className='block text-sm font-medium text-primary-black mb-1.5'>
            Email address <span className='text-error'>*</span>
          </label>
          <div className='relative'>
            <input
              type='email'
              value={candidate_email}
              disabled
              readOnly
              className='w-full bg-[#F9FAFB] border border-gray-200 rounded-lg px-4 py-3 text-secondary-black cursor-not-allowed pr-10'
            />
            <Lock className='h-4 w-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2' />
          </div>
          <p className='text-xs text-secondary-black/70 mt-1.5'>
            This is the address your invitation was sent to and can&apos;t be changed.
          </p>
        </div>

        <div>
          <label htmlFor='full_name' className='block text-sm font-medium text-primary-black mb-1.5'>
            Full Name <span className='text-error'>*</span>
          </label>
          {is_standalone ? (
            <div className='relative'>
              <input
                id='full_name'
                type='text'
                value={fullName}
                disabled
                readOnly
                className='w-full bg-[#F9FAFB] border border-gray-200 rounded-lg px-4 py-3 text-secondary-black cursor-not-allowed pr-10'
              />
              <Lock className='h-4 w-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2' />
            </div>
          ) : (
            <input
              id='full_name'
              type='text'
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder='Your full name'
              className='w-full bg-white border border-[#D0D5DD] focus:border-primary rounded-lg px-4 py-3 text-primary-black outline-none transition-colors'
            />
          )}
          {is_standalone && (
            <p className='text-xs text-secondary-black/70 mt-1.5'>
              This is the name provided by the recruiter who invited you and can&apos;t be changed.
            </p>
          )}
        </div>
      </div>

      <div className='flex justify-between mt-10 pt-6 border-t border-gray-100'>
        <DaisyButton
          type='button'
          color='ghost'
          onClick={() => router.back()}
          className='border border-gray-200'
        >
          Back
        </DaisyButton>
        <DaisyButton
          type='button'
          color='primary'
          className='text-white gap-2'
          loading={submitting}
          onClick={handleContinue}
        >
          {submitting ? "" : "Continue"} {!submitting && <ArrowRight className='h-4 w-4' />}
        </DaisyButton>
      </div>
    </InviteShell>
  );
};

export default DetailsPage;
