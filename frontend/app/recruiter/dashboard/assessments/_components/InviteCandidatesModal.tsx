"use client";

import { useState } from "react";

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
    setSent(res.data.sent);
    setInvites([{ email: "", name: "" }]);
    setAlert({ title: "Success", message: `Invited ${res.data.sent.length} candidate(s).`, icon: "success" });
  };

  return (
    <Modal id={modalId} modalRef={modalRef} autoHeight disableClose={disableClose}>
      <div>
        <h3 className="text-2xl font-semibold text-primaryBlack mb-1 text-center">{title}</h3>
        <p className="text-[#999] text-sm text-center">{description}</p>

        <div className="mt-6 border-t pt-6 space-y-3">
          {invites.map((invite, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input input-bordered w-full"
                placeholder="Candidate name"
                value={invite.name}
                onChange={e => {
                  const next = [...invites];
                  next[i] = { ...invite, name: e.target.value };
                  setInvites(next);
                }}
              />
              <input
                className="input input-bordered w-full"
                type="email"
                placeholder="Candidate email"
                value={invite.email}
                onChange={e => {
                  const next = [...invites];
                  next[i] = { ...invite, email: e.target.value };
                  setInvites(next);
                }}
              />
            </div>
          ))}
          <button
            type="button"
            className="text-primary text-sm font-medium"
            onClick={() => setInvites([...invites, { email: "", name: "" }])}
          >
            + Add another candidate
          </button>
          {sent.length > 0 && <p className="text-success text-sm">Invited: {sent.join(", ")}</p>}
          <Button
            type="button"
            color="primary"
            className="text-white w-full"
            loading={sending}
            onClick={handleInvite}
          >
            Send invites
          </Button>
        </div>

        {footer && <div className="modal-action">{footer}</div>}
      </div>
    </Modal>
  );
};

export default InviteCandidatesModal;
