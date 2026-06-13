"use client";

import { useState } from "react";
import { LuEye, LuExternalLink } from "react-icons/lu";

import { Startup } from "@/app/common/types";
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

const StartupDetailPanel = ({
  startup,
  showActions,
}: {
  startup: Startup;
  showActions?: boolean;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className='inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        aria-label={`View details for ${startup.company_name || startup.first_name}`}
      >
        <LuEye className='h-3.5 w-3.5' />
        View
      </button>

      <SlidePanel
        open={open}
        onClose={() => setOpen(false)}
        id={`startup-detail-${startup.pk}`}
        title='Startup Details'
      >
        <div className='space-y-5'>
          <div className='flex items-center gap-3'>
            <UserAvatar
              profilePic={startup.profile_pic}
              firstName={startup.first_name}
              lastName={startup.last_name}
              className='w-14'
            />
            <div className='min-w-0'>
              <h2 className='text-lg font-bold truncate'>
                {startup.company_name || "Unnamed Company"}
              </h2>
              <p className='text-sm text-muted-foreground truncate'>
                {startup.first_name} {startup.last_name} &middot;{" "}
                {startup.email}
              </p>
            </div>
          </div>

          <Section title='Company Info'>
            <Field label='Company Name' value={startup.company_name} />
            <Field
              label='Email'
              value={startup.company_email || startup.email}
            />
            <Field
              label='Website'
              value={
                startup.website ? (
                  <a
                    href={startup.website}
                    target='_blank'
                    rel='noreferrer'
                    className='inline-flex items-center gap-1 text-primary hover:underline'
                  >
                    <span className='truncate'>
                      {startup.website.replace(/^https?:\/\//, "")}
                    </span>
                    <LuExternalLink className='h-3 w-3 shrink-0' />
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

          {showActions && (
            <div className='flex items-center justify-between pt-3 border-t border-border'>
              <span className='text-sm text-muted-foreground'>Actions</span>
              <UserApplicationActions isStartup id={startup.pk} />
            </div>
          )}
        </div>
      </SlidePanel>
    </>
  );
};

export default StartupDetailPanel;
