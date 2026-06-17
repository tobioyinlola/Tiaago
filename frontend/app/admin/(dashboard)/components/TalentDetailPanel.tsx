"use client";

import { useState } from "react";
import { LuEye, LuExternalLink, LuDownload } from "react-icons/lu";

import { Talent } from "@/app/common/types";
import { cn, isBasicUser } from "@/app/common/utils";
import SlidePanel from "@/app/common/components/SlidePanel";
import UserAvatar from "@/app/common/components/UserAvatar";
import StatusBadge from "@/app/common/components/StatusBadge";

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

const TalentDetailPanel = ({ talent }: { talent: Talent }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className='inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors'
      >
        <LuEye className='h-3.5 w-3.5' />
        View
      </button>

      <SlidePanel open={open} onClose={() => setOpen(false)} title='Talent Profile'>
        <div className='space-y-6'>
          {/* Header */}
          <div className='flex items-center gap-3'>
            <UserAvatar
              profilePic={talent.profile_pic}
              firstName={talent.first_name}
              lastName={talent.last_name}
              className='w-14'
            />
            <div>
              <h2 className='text-lg font-bold capitalize'>
                {talent.first_name} {talent.last_name}
              </h2>
              <p className='text-sm text-muted-foreground'>
                {talent.email}
              </p>
            </div>
          </div>

          {/* Personal Info */}
          <Section title='Personal Info'>
            <Field label='Full Name' value={`${talent.first_name} ${talent.last_name}`} />
            <Field label='Email' value={
              <a href={`mailto:${talent.email}`} className='text-primary hover:underline'>
                {talent.email}
              </a>
            } />
            <Field label='Country' value={talent.country} />
            <Field label='Role' value={<span className='capitalize'>{talent.role}</span>} />
            <Field label='Experience Level' value={<span className='capitalize'>{talent.experience_level}</span>} />
            <Field label='User ID' value={talent.pk} />
          </Section>

          {/* Portfolio & Resume */}
          <Section title='Portfolio & Resume'>
            <Field label='Portfolio' value={
              talent.portfolio ? (
                <a
                  href={talent.portfolio}
                  target='_blank'
                  rel='noreferrer'
                  className='text-primary hover:underline inline-flex items-center gap-1'
                >
                  {talent.portfolio}
                  <LuExternalLink className='h-3 w-3' />
                </a>
              ) : null
            } />
            <Field label='Resume' value={
              talent.resume ? (
                <a
                  href={talent.resume}
                  target='_blank'
                  rel='noreferrer'
                  className='inline-flex items-center gap-1.5 text-primary hover:underline'
                >
                  <LuDownload className='h-3.5 w-3.5' />
                  Download
                </a>
              ) : null
            } />
          </Section>

          {/* Social Media */}
          {talent.social_media_links && talent.social_media_links.length > 0 && (
            <Section title='Social Media'>
              {talent.social_media_links.map((link) => (
                <Field
                  key={link.name}
                  label={link.name}
                  value={
                    <a
                      href={link.url}
                      target='_blank'
                      rel='noreferrer'
                      className='text-primary hover:underline inline-flex items-center gap-1'
                    >
                      {link.url}
                      <LuExternalLink className='h-3 w-3' />
                    </a>
                  }
                />
              ))}
            </Section>
          )}

          {/* Assessment & Verification */}
          <Section title='Account'>
            <Field label='Assessment' value={
              <StatusBadge
                status={talent.has_passed_assessment ? "approved" : "pending"}
                hideDot
              />
            } />
            <Field label='Verification' value={
              <StatusBadge
                status={talent.verified ? "active" : "pending"}
                hideDot
              />
            } />
            <Field label='Plan' value={
              <StatusBadge
                status={
                  !talent.subscribed_plan
                    ? "active"
                    : isBasicUser(talent)
                      ? "basic"
                      : "pro"
                }
                hideDot
              />
            } />
          </Section>

          {/* Bank Details (if available) */}
          {(talent.account_name || talent.account_number || talent.bank_name) && (
            <Section title='Bank Details'>
              <Field label='Account Name' value={talent.account_name} />
              <Field label='Account Number' value={talent.account_number} />
              <Field label='Bank' value={talent.bank_name} />
            </Section>
          )}
        </div>
      </SlidePanel>
    </>
  );
};

export default TalentDetailPanel;
