"use client";

import { PipelineEntry } from "@/app/common/types";
import SlidePanel from "@/app/common/components/SlidePanel";
import { Badge } from "@/app/common/components/ui/badge";
import { Button } from "@/app/common/components/ui/button";
import {
  LuMail,
  LuPhone,
  LuExternalLink,
  LuDownload,
  LuSend,
  LuTrash2,
} from "react-icons/lu";
import { formatDistanceToNow } from "date-fns";

/* ------------------------------------------------------------------ */
/*  Inline helpers (matching admin panel pattern)                      */
/* ------------------------------------------------------------------ */

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
  <section className={className || "space-y-3"}>
    <h3 className='text-sm font-semibold text-foreground border-b border-border pb-2'>
      {title}
    </h3>
    <dl className='grid grid-cols-2 gap-x-4 gap-y-3'>{children}</dl>
  </section>
);

/* ------------------------------------------------------------------ */
/*  Status badge variant helper                                        */
/* ------------------------------------------------------------------ */

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case "contacted":
      return "bg-info/10 text-info border-info/20";
    case "interested":
      return "bg-success/10 text-success border-success/20";
    case "not-interested":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "hired":
      return "bg-primary/10 text-primary border-primary/20";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

/* ------------------------------------------------------------------ */
/*  Initials helper                                                    */
/* ------------------------------------------------------------------ */

function getInitials(name: string) {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

type CandidateDetailPanelProps = {
  candidate: PipelineEntry | null;
  open: boolean;
  onClose: () => void;
  onSendOutreach: (candidate: PipelineEntry) => void;
  onRemove: (candidate: PipelineEntry) => void;
};

export function CandidateDetailPanel({
  candidate,
  open,
  onClose,
  onSendOutreach,
  onRemove,
}: CandidateDetailPanelProps) {
  if (!candidate) return null;

  const sourcedDate = candidate.created_at
    ? formatDistanceToNow(new Date(candidate.created_at), { addSuffix: true })
    : "Recently";

  const formattedPay =
    candidate.current_pay && candidate.pay_currency
      ? `${candidate.pay_currency} ${Number(candidate.current_pay).toLocaleString()}`
      : candidate.current_pay
        ? `${Number(candidate.current_pay).toLocaleString()}`
        : null;

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      id={`candidate-detail-${candidate.id}`}
      title='Candidate Details'
    >
      <div className='space-y-5'>
        {/* ---- Header ---- */}
        <div className='flex items-center gap-3'>
          <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg ring-2 ring-background shadow-soft'>
            {getInitials(candidate.name)}
          </div>
          <div className='min-w-0 flex-1'>
            <h2 className='text-lg font-bold truncate capitalize'>
              {candidate.name}
            </h2>
            <p className='text-sm text-muted-foreground truncate capitalize'>
              {candidate.role}
            </p>
            <div className='mt-1 flex items-center gap-2'>
              <Badge
                variant='outline'
                className={`capitalize ${getStatusBadgeClasses(candidate.status)}`}
              >
                {candidate.status.replace("-", " ")}
              </Badge>
              <span className='text-xs text-muted-foreground'>
                Sourced {sourcedDate}
              </span>
            </div>
          </div>
        </div>

        {/* ---- Contact Info ---- */}
        <Section title='Contact Info'>
          <Field
            label='Email'
            value={
              candidate.email ? (
                <a
                  href={`mailto:${candidate.email}`}
                  className='inline-flex items-center gap-1 text-primary hover:underline'
                >
                  <LuMail className='h-3 w-3 shrink-0' />
                  <span className='truncate'>{candidate.email}</span>
                </a>
              ) : null
            }
          />
          <Field
            label='Phone'
            value={
              candidate.phone_number ? (
                <a
                  href={`tel:${candidate.phone_number}`}
                  className='inline-flex items-center gap-1 text-primary hover:underline'
                >
                  <LuPhone className='h-3 w-3 shrink-0' />
                  {candidate.phone_number}
                </a>
              ) : null
            }
          />
          <Field
            label='LinkedIn'
            value={
              candidate.linkdIn_profile ? (
                <a
                  href={candidate.linkdIn_profile}
                  target='_blank'
                  rel='noreferrer'
                  className='inline-flex items-center gap-1 text-primary hover:underline'
                >
                  <span className='truncate'>
                    {candidate.linkdIn_profile.replace(/^https?:\/\//, "")}
                  </span>
                  <LuExternalLink className='h-3 w-3 shrink-0' />
                </a>
              ) : null
            }
          />
          <Field
            label='Portfolio'
            value={
              candidate.portfolio_url ? (
                <a
                  href={candidate.portfolio_url}
                  target='_blank'
                  rel='noreferrer'
                  className='inline-flex items-center gap-1 text-primary hover:underline'
                >
                  <span className='truncate'>
                    {candidate.portfolio_url.replace(/^https?:\/\//, "")}
                  </span>
                  <LuExternalLink className='h-3 w-3 shrink-0' />
                </a>
              ) : null
            }
          />
        </Section>

        {/* ---- Resume ---- */}
        {candidate.resume && (
          <Section title='Resume' className='space-y-3'>
            <dd className='col-span-2'>
              <a
                href={candidate.resume}
                target='_blank'
                rel='noreferrer'
                className='inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-primary hover:bg-muted transition-colors'
              >
                <LuDownload className='h-4 w-4' />
                Download Resume
              </a>
            </dd>
          </Section>
        )}

        {/* ---- Professional ---- */}
        <Section title='Professional'>
          <Field
            label='Experience Level'
            value={candidate.experience_level}
          />
          <Field label='Country' value={candidate.country} />
          <Field
            label='Years of Experience'
            value={
              candidate.years_of_expr
                ? `${candidate.years_of_expr} year${candidate.years_of_expr !== 1 ? "s" : ""}`
                : null
            }
          />
          <Field label='Current Company' value={candidate.current_company} />
          <Field label='Education' value={candidate.education} />
          <Field label='Current Pay' value={formattedPay} />
        </Section>

        {/* ---- Skills ---- */}
        {candidate.skills && candidate.skills.length > 0 && (
          <Section title='Skills' className='space-y-3'>
            <dd className='col-span-2 flex flex-wrap gap-1.5'>
              {candidate.skills.map(skill => (
                <Badge key={skill} variant='secondary' className='text-xs'>
                  {skill}
                </Badge>
              ))}
            </dd>
          </Section>
        )}

        {/* ---- Summary ---- */}
        {candidate.summary && (
          <Section title='Summary' className='space-y-3'>
            <dd className='col-span-2 text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed'>
              {candidate.summary}
            </dd>
          </Section>
        )}

        {/* ---- Actions ---- */}
        <div className='flex gap-3 pt-3 border-t border-border'>
          <Button
            className='flex-1'
            onClick={() => {
              onSendOutreach(candidate);
              onClose();
            }}
          >
            <LuSend className='mr-2 h-4 w-4' />
            Send Outreach
          </Button>
          <Button
            variant='outline'
            className='text-destructive hover:text-destructive hover:bg-destructive/10'
            onClick={() => {
              onRemove(candidate);
              onClose();
            }}
          >
            <LuTrash2 className='mr-2 h-4 w-4' />
            Remove
          </Button>
        </div>
      </div>
    </SlidePanel>
  );
}
