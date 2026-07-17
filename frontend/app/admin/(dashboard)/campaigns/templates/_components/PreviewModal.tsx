"use client";

import { createRef, useState } from "react";

import Modal, { OpenModalByIdButton } from "@/app/common/components/Modal";
import { substituteMergeTagsWithSampleData } from "@/app/common/utils/mergeTagSample";

const modalId = "campaign-template-preview-modal";

const PreviewModal = ({ html, subjectLine }: { html: string; subjectLine: string }) => {
  const modalRef = createRef<HTMLDialogElement>();
  const [width, setWidth] = useState<600 | 320>(600);

  return (
    <>
      <OpenModalByIdButton modalId={modalId} className="btn btn-sm btn-outline">
        Preview
      </OpenModalByIdButton>
      <Modal id={modalId} modalRef={modalRef} disablePadding className="max-w-3xl" autoHeight>
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">{subjectLine || "(no subject line)"}</div>
            <div className="text-xs text-muted-foreground">Preview with sample data</div>
          </div>
          <div className="join">
            <button type="button" className={`btn btn-xs join-item ${width === 600 ? "btn-primary" : "btn-outline"}`} onClick={() => setWidth(600)}>
              Desktop
            </button>
            <button type="button" className={`btn btn-xs join-item ${width === 320 ? "btn-primary" : "btn-outline"}`} onClick={() => setWidth(320)}>
              Mobile
            </button>
          </div>
        </div>
        <div className="p-4 bg-gray-100 flex justify-center">
          <iframe
            title="Email preview"
            srcDoc={substituteMergeTagsWithSampleData(html)}
            style={{ width, height: 600, border: "1px solid #E5E7EB", background: "#fff" }}
          />
        </div>
      </Modal>
    </>
  );
};

export default PreviewModal;
