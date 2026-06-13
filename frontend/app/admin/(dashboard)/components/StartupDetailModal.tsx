"use client";

import { useRef } from "react";

import { Startup } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import Modal from "@/app/common/components/Modal";
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
      {value || <span className='text-muted-foreground italic'>Not provided</span>}
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

const StartupDetailModal = ({ startup }: { startup: Startup }) => {
  const modalRef = useRef<HTMLDialogElement>(null);

  const onboardingStatus = startup.onboarding_completed_at
    ? "completed"
    : startup.onboarding_skipped_at
    ? "pending"
    : "pending";

  return (
    <>
      <button
        type='button'
        onClick={() => modalRef.current?.showModal()}
        className='text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md'
        aria-label={`View details for ${startup.company_name || startup.first_name}`}
      >
        View
      </button>

      <Modal
        modalRef={modalRef}
        id={`startup-detail-${startup.pk}`}
        className='md:max-w-xl'
      >
        <div className='space-y-5'>
          <div className='flex items-center gap-3'>
            <UserAvatar
              profilePic={startup.profile_pic}
              firstName={startup.first_name}
              lastName={startup.last_name}
              className='w-14'
            />
            <div>
              <h2 className='text-lg font-bold'>
                {startup.company_name || "Unnamed Company"}
              </h2>
              <p className='text-sm text-muted-foreground'>
                {startup.first_name} {startup.last_name} &middot; {startup.email}
              </p>
            </div>
          </div>

          <Section title='Company Info'>
            <Field label='Company Name' value={startup.company_name} />
            <Field label='Email' value={startup.company_email || startup.email} />
            <Field
              label='Website'
              value={
                startup.website ? (
                  <a
                    href={startup.website}
                    target='_blank'
                    rel='noreferrer'
                    className='text-primary hover:underline'
                  >
                    {startup.website}
                  </a>
                ) : null
              }
            />
            <Field label='Team Size' value={startup.size} />
            <Field label='Country' value={startup.country} />
            <Field label='Address' value={startup.address} />
          </Section>

          <Section title='Onboarding'>
            <Field
              label='Account Type'
              value={startup.account_type?.replace("-", " ")}
            />
            <Field label='Industry' value={startup.industry} />
            <Field label='Job Title / Role' value={startup.role} />
            <Field label='Heard About Us From' value={startup.heard_from} />
            <Field
              label='Onboarding Status'
              value={
                <StatusBadge
                  status={
                    startup.onboarding_completed_at ? "completed" : "pending"
                  }
                  hideDot
                />
              }
            />
            {startup.onboarding_completed_at && (
              <Field
                label='Completed At'
                value={new Date(
                  startup.onboarding_completed_at
                ).toLocaleDateString()}
              />
            )}
            {startup.onboarding_skipped_at && (
              <Field
                label='Skipped At'
                value={new Date(
                  startup.onboarding_skipped_at
                ).toLocaleDateString()}
              />
            )}
          </Section>

          {startup.onboarding_notes && (
            <Section title='Notes'>
              <dd className='col-span-2 text-sm whitespace-pre-wrap'>
                {startup.onboarding_notes}
              </dd>
            </Section>
          )}

          <Section title='Account'>
            <Field
              label='Verification'
              value={
                <StatusBadge
                  status={startup.verified ? "approved" : "pending"}
                  hideDot
                />
              }
            />
            <Field label='User ID' value={startup.pk} />
          </Section>

          <div className='flex items-center justify-between pt-3 border-t border-border'>
            <span className='text-sm text-muted-foreground'>Actions</span>
            <UserApplicationActions isStartup id={startup.pk} />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default StartupDetailModal;
