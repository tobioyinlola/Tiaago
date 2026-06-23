"use client";

import { useState } from "react";
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
  LuFileText,
  LuChevronDown,
  LuX,
} from "react-icons/lu";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { updatePipelineEntry } from "@/app/common/services/sourcing";

const STATUSES = [
  { value: "new", label: "New", color: "bg-[#F2F4F7] text-[#344054] border-[#E4E7EC]" },
  { value: "contacted", label: "Contacted", color: "bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]" },
  { value: "interested", label: "Interested", color: "bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]" },
  { value: "not-interested", label: "Not Interested", color: "bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]" },
  { value: "hired", label: "Hired", color: "bg-[#F0F0FF] text-[#5465FF] border-[#D0D5FF]" },
];

function statusColor(status: string) {
  return STATUSES.find(s => s.value === status)?.color || STATUSES[0].color;
}

function statusLabel(status: string) {
  return STATUSES.find(s => s.value === status)?.label || status;
}

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className='space-y-1'>
    <dt className='text-xs text-muted-foreground'>{label}</dt>
    <dd className='text-sm font-medium break-words'>
      {value || <span className='text-muted-foreground italic text-xs'>Not provided</span>}
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

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase();
}

type Props = {
  candidate: PipelineEntry | null;
  open: boolean;
  onClose: () => void;
  onSendOutreach: (candidate: PipelineEntry) => void;
  onRemove: (candidate: PipelineEntry) => void;
  onStatusChange?: (id: number | string, newStatus: string) => void;
};

export function CandidateDetailPanel({
  candidate,
  open,
  onClose,
  onSendOutreach,
  onRemove,
  onStatusChange,
}: Props) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  if (!candidate) return null;

  const sourcedDate = candidate.created_at
    ? formatDistanceToNow(new Date(candidate.created_at), { addSuffix: true })
    : "Recently";

  const formattedPay =
    candidate.current_pay && candidate.pay_currency
      ? `${candidate.pay_currency} ${Number(candidate.current_pay).toLocaleString()}/yr`
      : candidate.current_pay
        ? `${Number(candidate.current_pay).toLocaleString()}/yr`
        : null;

  const handleStatusChange = async (newStatus: string) => {
    setShowStatusMenu(false);
    if (newStatus === candidate.status) return;
    setUpdatingStatus(true);
    const res = await updatePipelineEntry(candidate.id, { status: newStatus });
    setUpdatingStatus(false);
    if (res.success) {
      onStatusChange?.(candidate.id, newStatus);
      toast.success("Status updated", {
        description: `${candidate.name} is now "${statusLabel(newStatus)}"`,
      });
    } else {
      toast.error("Failed to update status");
    }
  };

  const isPdf = candidate.resume?.toLowerCase().endsWith(".pdf");

  return (
    <>
      <SlidePanel
        open={open}
        onClose={onClose}
        id={`candidate-detail-${candidate.id}`}
        title='Candidate Details'
      >
        <div className='space-y-5'>
          {/* Header */}
          <div className='flex items-center gap-3'>
            <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-400/80 text-white font-bold text-lg'>
              {getInitials(candidate.name)}
            </div>
            <div className='min-w-0 flex-1'>
              <h2 className='text-lg font-bold truncate capitalize'>
                {candidate.name}
              </h2>
              <p className='text-sm text-muted-foreground truncate capitalize'>
                {candidate.role || "No role specified"}
              </p>
              <div className='mt-1.5 flex items-center gap-2'>
                {/* Status dropdown */}
                <div className='relative'>
                  <button
                    type='button'
                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                    disabled={updatingStatus}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${statusColor(candidate.status)}`}
                  >
                    {updatingStatus ? "Updating..." : statusLabel(candidate.status)}
                    <LuChevronDown className='h-3 w-3' />
                  </button>
                  {showStatusMenu && (
                    <div className='absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px]'>
                      {STATUSES.map(s => (
                        <button
                          key={s.value}
                          type='button'
                          onClick={() => handleStatusChange(s.value)}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2 ${
                            s.value === candidate.status ? "font-semibold bg-muted/50" : ""
                          }`}
                        >
                          <span className={`inline-block w-2 h-2 rounded-full border ${s.color}`} />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className='text-xs text-muted-foreground'>
                  {sourcedDate}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <Section title='Contact Info'>
            <Field label='Email' value={
              candidate.email ? (
                <a href={`mailto:${candidate.email}`} className='inline-flex items-center gap-1 text-primary hover:underline'>
                  <LuMail className='h-3 w-3 shrink-0' />
                  <span className='truncate'>{candidate.email}</span>
                </a>
              ) : null
            } />
            <Field label='Phone' value={
              candidate.phone_number ? (
                <a href={`tel:${candidate.phone_number}`} className='inline-flex items-center gap-1 text-primary hover:underline'>
                  <LuPhone className='h-3 w-3 shrink-0' />
                  {candidate.phone_number}
                </a>
              ) : null
            } />
            <Field label='LinkedIn' value={
              candidate.linkedin_profile ? (
                <a href={candidate.linkedin_profile} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1 text-primary hover:underline'>
                  <span className='truncate'>{candidate.linkedin_profile.replace(/^https?:\/\//, "")}</span>
                  <LuExternalLink className='h-3 w-3 shrink-0' />
                </a>
              ) : null
            } />
            <Field label='Portfolio' value={
              candidate.portfolio_url ? (
                <a href={candidate.portfolio_url} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1 text-primary hover:underline'>
                  <span className='truncate'>{candidate.portfolio_url.replace(/^https?:\/\//, "")}</span>
                  <LuExternalLink className='h-3 w-3 shrink-0' />
                </a>
              ) : null
            } />
          </Section>

          {/* Resume — always visible */}
          <Section title='Resume' className='space-y-3'>
            <dd className='col-span-2'>
              {candidate.resume ? (
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => isPdf && setShowPdfViewer(true)}
                      className='inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors flex-1'
                    >
                      <LuFileText className='h-4 w-4 text-primary shrink-0' />
                      <span className='truncate'>
                        {isPdf ? "View Resume" : "Resume uploaded"}
                      </span>
                    </button>
                    <a
                      href={candidate.resume}
                      target='_blank'
                      rel='noreferrer'
                      className='inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-primary hover:bg-muted transition-colors shrink-0'
                    >
                      <LuDownload className='h-4 w-4' />
                    </a>
                  </div>
                </div>
              ) : (
                <div className='rounded-md border border-dashed border-border p-4 text-center'>
                  <LuFileText className='h-6 w-6 text-muted-foreground mx-auto mb-1' />
                  <p className='text-xs text-muted-foreground'>No resume uploaded</p>
                </div>
              )}
            </dd>
          </Section>

          {/* Professional */}
          <Section title='Professional'>
            <Field label='Experience Level' value={candidate.experience_level} />
            <Field label='Country' value={candidate.country} />
            <Field label='Years of Experience' value={
              candidate.years_of_expr
                ? `${candidate.years_of_expr} year${candidate.years_of_expr !== 1 ? "s" : ""}`
                : null
            } />
            <Field label='Current Company' value={candidate.current_company} />
            <Field label='Education' value={candidate.education} />
            <Field label='Current Pay' value={formattedPay} />
          </Section>

          {/* Skills */}
          <Section title='Skills' className='space-y-3'>
            <dd className='col-span-2'>
              {candidate.skills && candidate.skills.length > 0 ? (
                <div className='flex flex-wrap gap-1.5'>
                  {candidate.skills.map(skill => (
                    <Badge key={skill} variant='secondary' className='text-xs'>
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className='text-xs text-muted-foreground italic'>No skills listed</p>
              )}
            </dd>
          </Section>

          {/* Summary */}
          <Section title='Summary' className='space-y-3'>
            <dd className='col-span-2 text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed'>
              {candidate.summary || <span className='italic text-xs'>No summary provided</span>}
            </dd>
          </Section>

          {/* Actions */}
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

      {/* Inline PDF Viewer Modal */}
      {showPdfViewer && candidate.resume && isPdf && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm'>
          <div className='relative w-full max-w-4xl h-[90vh] bg-card rounded-lg shadow-xl overflow-hidden flex flex-col'>
            <div className='flex items-center justify-between px-4 py-3 border-b border-border shrink-0'>
              <div className='flex items-center gap-2'>
                <LuFileText className='h-4 w-4 text-primary' />
                <span className='text-sm font-medium'>{candidate.name}&apos;s Resume</span>
              </div>
              <div className='flex items-center gap-2'>
                <a
                  href={candidate.resume}
                  target='_blank'
                  rel='noreferrer'
                  className='inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-primary hover:bg-muted transition-colors border border-border'
                >
                  <LuDownload className='h-3.5 w-3.5' />
                  Download
                </a>
                <button
                  type='button'
                  onClick={() => setShowPdfViewer(false)}
                  className='rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors'
                >
                  <LuX className='h-4 w-4' />
                </button>
              </div>
            </div>
            <iframe
              src={candidate.resume}
              className='flex-1 w-full'
              title='Resume PDF Viewer'
            />
          </div>
        </div>
      )}
    </>
  );
}
