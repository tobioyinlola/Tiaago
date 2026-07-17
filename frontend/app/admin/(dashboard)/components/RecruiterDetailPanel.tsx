"use client";

import { useState } from "react";
import { LuEye, LuExternalLink } from "react-icons/lu";

import { Recruiter } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import SlidePanel from "@/app/common/components/SlidePanel";
import UserAvatar from "@/app/common/components/UserAvatar";
import StatusBadge from "@/app/common/components/StatusBadge";
import UserApplicationActions from "./UserApplicationActions";

const Field = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className='space-y-1'>
    <dt className='text-xs text-muted-foreground'>{label}</dt>
    <dd className='text-sm font-medium break-words'>
      {value || (
        <span className='text-muted-foreground italic'>Not provided</span>
      )}
    </dd>
  </div>
);

const Section = ({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={cn("space-y-3", className)}>
    <h3 className='text-sm font-semibold text-foreground border-b border-border pb-2'>
      {title}
    </h3>
    <dl className='grid grid-cols-2 gap-x-4 gap-y-3'>{children}</dl>
  </section>
);

const RecruiterDetailPanel = ({
  recruiter,
  showActions,
}: {
  recruiter: Recruiter;
  showActions?: boolean;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className='inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        aria-label={`View details for ${recruiter.company_name || recruiter.first_name}`}
      >
        <LuEye className='h-3.5 w-3.5' />
        View
      </button>

      <SlidePanel
        open={open}
        onClose={() => setOpen(false)}
        id={`recruiter-detail-${recruiter.pk}`}
        title='Recruiter Details'
      >
        <div className='space-y-5'>
          <div className='flex items-center gap-3'>
            <UserAvatar
              profilePic={recruiter.profile_pic}
              firstName={recruiter.first_name}
              lastName={recruiter.last_name}
              className='w-14'
            />
            <div className='min-w-0'>
              <h2 className='text-lg font-bold truncate'>
                {recruiter.company_name || "Unnamed Company"}
              </h2>
              <p className='text-sm text-muted-foreground truncate'>
                {recruiter.first_name} {recruiter.last_name} &middot;{" "}
                {recruiter.email}
              </p>
            </div>
          </div>

          <Section title='Company Info'>
            <Field label='Company Name' value={recruiter.company_name} />
            <Field
              label='Email'
              value={recruiter.company_email || recruiter.email}
            />
            <Field
              label='Website'
              value={
                recruiter.website ? (
                  <a
                    href={recruiter.website}
                    target='_blank'
                    rel='noreferrer'
                    className='inline-flex items-center gap-1 text-primary hover:underline'
                  >
                    <span className='truncate'>
                      {recruiter.website.replace(/^https?:\/\//, "")}
                    </span>
                    <LuExternalLink className='h-3 w-3 shrink-0' />
                  </a>
                ) : null
              }
            />
            <Field label='Team Size' value={recruiter.size} />
            <Field label='Country' value={recruiter.country} />
            <Field label='Address' value={recruiter.address} />
          </Section>

          <Section title='Onboarding'>
            <Field
              label='Account Type'
              value={recruiter.account_type?.replace("-", " ")}
            />
            <Field label='Industry' value={recruiter.industry} />
            <Field label='Job Title / Role' value={recruiter.role} />
            <Field label='Heard About Us From' value={recruiter.heard_from} />
            <Field
              label='Onboarding Status'
              value={
                <StatusBadge
                  status={
                    recruiter.onboarding_completed_at ? "completed" : "pending"
                  }
                  hideDot
                />
              }
            />
            {recruiter.onboarding_completed_at && (
              <Field
                label='Completed At'
                value={new Date(
                  recruiter.onboarding_completed_at
                ).toLocaleDateString()}
              />
            )}
            {recruiter.onboarding_skipped_at && (
              <Field
                label='Skipped At'
                value={new Date(
                  recruiter.onboarding_skipped_at
                ).toLocaleDateString()}
              />
            )}
          </Section>

          {recruiter.onboarding_notes && (
            <Section title='Notes'>
              <dd className='col-span-2 text-sm whitespace-pre-wrap'>
                {recruiter.onboarding_notes}
              </dd>
            </Section>
          )}

          <Section title='Account'>
            <Field
              label='Verification'
              value={
                <StatusBadge
                  status={recruiter.verified ? "approved" : "pending"}
                  hideDot
                />
              }
            />
            <Field label='User ID' value={recruiter.pk} />
          </Section>

          {showActions && (
            <div className='flex items-center justify-between pt-3 border-t border-border'>
              <span className='text-sm text-muted-foreground'>Actions</span>
              <UserApplicationActions isRecruiter id={recruiter.pk} />
            </div>
          )}
        </div>
      </SlidePanel>
    </>
  );
};

export default RecruiterDetailPanel;
