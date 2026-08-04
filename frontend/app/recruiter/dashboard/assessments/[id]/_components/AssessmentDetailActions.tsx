"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Rocket, Trash2 } from "lucide-react";

import { ID } from "@/app/common/types";
import Button from "@/app/common/components/DaisyButton";
import { useAlert } from "@/app/common/store/useAlert";
import { publishCompanyAssessment, deleteCompanyAssessment } from "@/app/common/services/assessment";
import InviteCandidatesModal from "../../_components/InviteCandidatesModal";
import DeleteAssessmentModal from "../../_components/DeleteAssessmentModal";

const AssessmentDetailActions = ({
  assessmentId,
  title,
  published,
  hasSections,
}: {
  assessmentId: ID;
  title: string;
  published: boolean;
  hasSections: boolean;
}) => {
  const router = useRouter();
  const setAlert = useAlert(s => s.setAlert);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inviteModalRef = useRef<HTMLDialogElement>(null);
  const deleteModalRef = useRef<HTMLDialogElement>(null);

  const handlePublish = async () => {
    setPublishing(true);
    const res = await publishCompanyAssessment(assessmentId);
    setPublishing(false);
    if (!res.success) {
      setAlert({ title: "Error", message: res.error, icon: "error" });
      return;
    }
    router.refresh();
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await deleteCompanyAssessment(assessmentId);
    setDeleting(false);
    if (!res.success) {
      setAlert({ title: "Error", message: res.error, icon: "error" });
      return;
    }
    setAlert({ title: "Deleted", message: "Assessment deleted.", icon: "success" });
    router.push("/recruiter/dashboard/assessments");
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Delete assessment"
        title="Delete assessment"
        onClick={() => deleteModalRef.current?.showModal()}
        className="text-secondary-black/60 hover:text-error transition-colors p-2"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {published ? (
        <Button
          type="button"
          color="primary"
          className="text-white gap-2"
          onClick={() => inviteModalRef.current?.showModal()}
        >
          <Send className="w-4 h-4" />
          Invite Candidates
        </Button>
      ) : (
        <Button
          type="button"
          color="primary"
          className="text-white gap-2"
          loading={publishing}
          disabled={!hasSections}
          onClick={handlePublish}
        >
          <Rocket className="w-4 h-4" />
          Publish Assessment
        </Button>
      )}

      <InviteCandidatesModal assessmentId={assessmentId} modalId="invite-candidates-modal" modalRef={inviteModalRef} />
      <DeleteAssessmentModal
        modalId="delete-assessment-modal"
        modalRef={deleteModalRef}
        title={title}
        deleting={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default AssessmentDetailActions;
