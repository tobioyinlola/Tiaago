"use client";

import { useState } from "react";
import { Mail, Send, Trash2, UserPlus, CheckCircle2 } from "lucide-react";

import { ID } from "@/app/common/types";
import Modal from "@/app/common/components/Modal";
import Button from "@/app/common/components/DaisyButton";
import { useAlert } from "@/app/common/store/useAlert";
import { inviteCandidatesToAssessment } from "@/app/common/services/assessment";

const InviteCandidatesModal = ({
  assessmentId,
  modalId,
  modalRef,
  title = "Invite Candidates",
  description = "They'll get an email with a link to take the assessment -- no account required.",
  disableClose,
  footer,
}: {
  assessmentId: ID;
  modalId: string;
  modalRef: React.RefObject<HTMLDialogElement>;
  title?: string;
  description?: string;
  disableClose?: boolean;
  footer?: React.ReactNode;
}) => {
  const setAlert = useAlert(s => s.setAlert);
  const [invites, setInvites] = useState([{ email: "", name: "" }]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string[]>([]);

  const validCount = invites.filter(i => i.email.trim() && i.name.trim()).length;

  const handleInvite = async () => {
    const cleaned = invites.filter(i => i.email.trim() && i.name.trim());
    if (!cleaned.length) {
      setAlert({ title: "Error", message: "Add at least one candidate's name and email.", icon: "error" });
      return;
    }
    setSending(true);
    const res = await inviteCandidatesToAssessment(assessmentId, cleaned);
    setSending(false);
    if (!res.success) {
      setAlert({ title: "Error", message: res.error, icon: "error" });
      return;
    }
    setSent(prev => [...prev, ...res.data.sent]);
    setInvites([{ email: "", name: "" }]);
    setAlert({ title: "Success", message: `Invited ${res.data.sent.length} candidate(s).`, icon: "success" });
  };

  return (
    <Modal id={modalId} modalRef={modalRef} autoHeight disableClose={disableClose}>
      <div>
        <div className='mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4'>
          <UserPlus className='w-6 h-6 text-primary' />
        </div>
        <h3 className='text-2xl font-semibold text-primaryBlack mb-1 text-center font-space-grotesk'>{title}</h3>
        <p className='text-secondary-black text-sm text-center'>{description}</p>

        <div className='mt-6 border-t border-[#EAECF0] pt-6 space-y-3'>
          {invites.map((invite, i) => (
            <div key={i} className='flex gap-2 items-center'>
              <span className='hidden sm:flex w-7 h-7 rounded-full bg-[#F5F6F7] text-secondary-black text-xs font-medium items-center justify-center shrink-0'>
                {i + 1}
              </span>
              <input
                className='input input-bordered w-full rounded-lg border-[#EAECF0] focus:border-primary focus:outline-none'
                placeholder='Candidate name'
                value={invite.name}
                onChange={e => {
                  const next = [...invites];
                  next[i] = { ...invite, name: e.target.value };
                  setInvites(next);
                }}
              />
              <input
                className='input input-bordered w-full rounded-lg border-[#EAECF0] focus:border-primary focus:outline-none'
                type='email'
                placeholder='Candidate email'
                value={invite.email}
                onChange={e => {
                  const next = [...invites];
                  next[i] = { ...invite, email: e.target.value };
                  setInvites(next);
                }}
              />
              <button
                type='button'
                aria-label='Remove candidate'
                disabled={invites.length === 1}
                onClick={() => setInvites(invites.filter((_, idx) => idx !== i))}
                className='shrink-0 text-secondary-black hover:text-error disabled:opacity-30 disabled:hover:text-secondary-black p-2'
              >
                <Trash2 className='w-4 h-4' />
              </button>
            </div>
          ))}
          <button
            type='button'
            className='flex items-center gap-1.5 text-primary text-sm font-medium hover:underline'
            onClick={() => setInvites([...invites, { email: "", name: "" }])}
          >
            <UserPlus className='w-4 h-4' />
            Add another candidate
          </button>

          {sent.length > 0 && (
            <div className='rounded-lg bg-badge-green-bg/60 border border-badge-green-bg p-3 flex flex-col gap-1.5'>
              <p className='flex items-center gap-1.5 text-badge-green-text text-sm font-medium'>
                <CheckCircle2 className='w-4 h-4' />
                Invited {sent.length} candidate{sent.length === 1 ? "" : "s"} so far
              </p>
              <div className='flex flex-wrap gap-1.5'>
                {sent.map(email => (
                  <span
                    key={email}
                    className='inline-flex items-center gap-1 text-xs bg-white text-secondary-black px-2 py-1 rounded-full border border-[#EAECF0]'
                  >
                    <Mail className='w-3 h-3' />
                    {email}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button
            type='button'
            color='primary'
            className='text-white w-full gap-2'
            loading={sending}
            disabled={!validCount}
            onClick={handleInvite}
          >
            <Send className='w-4 h-4' />
            Send invite{validCount > 1 ? `s (${validCount})` : ""}
          </Button>
        </div>

        {footer && <div className='modal-action'>{footer}</div>}
      </div>
    </Modal>
  );
};

export default InviteCandidatesModal;
