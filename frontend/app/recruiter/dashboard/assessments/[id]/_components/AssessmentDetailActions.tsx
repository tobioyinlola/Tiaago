"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Rocket } from "lucide-react";

import { ID } from "@/app/common/types";
import Button from "@/app/common/components/DaisyButton";
import { useAlert } from "@/app/common/store/useAlert";
import { publishCompanyAssessment } from "@/app/common/services/assessment";
import InviteCandidatesModal from "../../_components/InviteCandidatesModal";

const AssessmentDetailActions = ({
  assessmentId,
  published,
  hasSections,
}: {
  assessmentId: ID;
  published: boolean;
  hasSections: boolean;
}) => {
  const router = useRouter();
  const setAlert = useAlert(s => s.setAlert);
  const [publishing, setPublishing] = useState(false);
  const inviteModalRef = useRef<HTMLDialogElement>(null);

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

  return (
    <div className="flex items-center gap-3">
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
    </div>
  );
};

export default AssessmentDetailActions;
