"use client";

import { EmailTemplate } from "@/app/common/types/campaigns.type";
import { substituteMergeTagsWithSampleData } from "@/app/common/utils/mergeTagSample";

const CustomiseStep = ({
  template,
  subjectLine,
  previewText,
  onSubjectLineChange,
  onPreviewTextChange,
}: {
  template: EmailTemplate | null;
  subjectLine: string;
  previewText: string;
  onSubjectLineChange: (v: string) => void;
  onPreviewTextChange: (v: string) => void;
}) => {
  if (!template) {
    return <p className="text-sm text-muted-foreground">Select a template on the previous step first.</p>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium">Subject line</label>
          <input
            type="text"
            className="input input-bordered w-full mt-2"
            value={subjectLine}
            onChange={e => onSubjectLineChange(e.target.value)}
            maxLength={120}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Preview text</label>
          <input
            type="text"
            className="input input-bordered w-full mt-2"
            value={previewText}
            onChange={e => onPreviewTextChange(e.target.value)}
            maxLength={160}
          />
          <p className="text-xs text-muted-foreground mt-1">Shown next to the subject line in most inboxes.</p>
        </div>
        <p className="text-xs text-muted-foreground">
          To edit the email body itself, go to{" "}
          <a href={`/admin/campaigns/templates/${template.id}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            the template editor
          </a>{" "}
          in a new tab.
        </p>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Live preview</h4>
        <iframe
          title="Campaign preview"
          srcDoc={substituteMergeTagsWithSampleData(template.html_body)}
          style={{ width: "100%", height: 500, border: "1px solid #E5E7EB", background: "#fff" }}
        />
      </div>
    </div>
  );
};

export default CustomiseStep;
