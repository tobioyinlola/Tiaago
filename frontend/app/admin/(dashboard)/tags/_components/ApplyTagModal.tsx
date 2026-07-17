"use client";

import { createRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ButtonModal } from "@/app/common/components/Modal";
import { applyCustomTagToOrganisations } from "@/app/common/services/tags";
import { OrganisationOption } from "@/app/common/types/notifications.type";
import { Tag } from "@/app/common/types/tags.type";
import PermissionGuard from "../../components/PermissionGuard";
import OrganisationMultiPicker from "./OrganisationMultiPicker";

const ApplyTagModal = ({ tag }: { tag: Tag }) => {
  const router = useRouter();
  const modalRef = createRef<HTMLDialogElement>();
  const [orgs, setOrgs] = useState<OrganisationOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleApply = async () => {
    if (!orgs.length) {
      toast.error("Select at least one organisation.");
      return;
    }
    setSubmitting(true);
    const result = await applyCustomTagToOrganisations(tag.id, orgs.map(o => o.id));
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Applied "${tag.name}" to ${result.data.applied} organisation(s).`);
    setOrgs([]);
    modalRef.current?.close();
    router.refresh();
  };

  return (
    <PermissionGuard permission="tags.manage">
      <ButtonModal
        id={`apply-tag-modal-${tag.id}`}
        modalRef={modalRef}
        buttonText="Apply to orgs"
        buttonClassName="btn-xs btn-outline"
        autoHeight
      >
        <h3 className="text-lg font-bold mb-1">Apply &quot;{tag.name}&quot;</h3>
        <p className="text-sm text-muted-foreground mb-4">Search for organisations to tag.</p>
        <OrganisationMultiPicker value={orgs} onChange={setOrgs} />
        <button
          type="button"
          className="btn btn-primary mt-4 w-full"
          disabled={submitting || !orgs.length}
          onClick={handleApply}
        >
          {submitting ? "Applying..." : `Apply to ${orgs.length || ""} organisation${orgs.length === 1 ? "" : "s"}`}
        </button>
      </ButtonModal>
    </PermissionGuard>
  );
};

export default ApplyTagModal;
