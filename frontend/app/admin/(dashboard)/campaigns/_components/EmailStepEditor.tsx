"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CATEGORY_LABELS, CampaignEmail, EmailBlock, EmailTemplate } from "@/app/common/types/campaigns.type";
import { createTemplate } from "@/app/common/services/campaigns";
import TemplateThumbnail from "./TemplateThumbnail";
import MergeTagPicker from "../templates/_components/MergeTagPicker";

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <div className="skeleton w-full h-24" />,
});

type Draft = {
  email_template: string | null;
  subject: string;
  preview_text: string;
  from_name: string;
  reply_to: string;
};

const EmailStepEditor = ({
  step,
  templates,
  onSave,
  saving,
}: {
  step: CampaignEmail;
  templates: EmailTemplate[];
  onSave: (draft: Draft) => void;
  saving: boolean;
}) => {
  const [draft, setDraft] = useState<Draft>({
    email_template: step.email_template,
    subject: step.subject,
    preview_text: step.preview_text,
    from_name: step.from_name,
    reply_to: step.reply_to ?? "",
  });
  const [pickerOpen, setPickerOpen] = useState(!step.email_template);
  // The template's own blocks, edited inline right here rather than forcing
  // a trip to the separate template editor for a one-off wording tweak.
  // Kept as local state distinct from the template itself -- EmailTemplate
  // rows (especially presets) are shared across every campaign that picks
  // them, so editing copy for *this* email must never mutate the shared
  // template. handleSave below forks a private copy only if this actually
  // diverges from what the selected template started with.
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [savingCopy, setSavingCopy] = useState(false);

  const selectedTemplate = templates.find(t => t.id === draft.email_template) ?? null;
  const presets = templates.filter(t => t.is_preset);
  const custom = templates.filter(t => !t.is_preset);

  // Re-sync the editable copy whenever the selected template actually
  // changes (not on every render -- the user's in-progress edits to the
  // current template must survive re-renders from other field changes).
  useEffect(() => {
    setBlocks(selectedTemplate?.blocks ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate?.id]);

  const updateBlockAt = (index: number, patch: Partial<EmailBlock>) => {
    setBlocks(prev => prev.map((b, i) => (i === index ? ({ ...b, ...patch } as EmailBlock) : b)));
  };

  const copyChanged = JSON.stringify(blocks) !== JSON.stringify(selectedTemplate?.blocks ?? []);

  const handleSave = async () => {
    if (!copyChanged || !selectedTemplate) {
      onSave(draft);
      return;
    }
    // The wording was edited -- fork a private template for this email
    // specifically, so the shared preset/template other campaigns use
    // stays exactly as it was.
    setSavingCopy(true);
    const result = await createTemplate({
      name: `${selectedTemplate.name} (customized)`,
      category: selectedTemplate.category,
      subject_line: draft.subject || selectedTemplate.subject_line,
      preview_text: draft.preview_text || selectedTemplate.preview_text,
      blocks,
      merge_tags: selectedTemplate.merge_tags,
    });
    setSavingCopy(false);
    if (!result.success) {
      toast.error(result.error || "Could not save your edited copy. Please try again.");
      return;
    }
    onSave({ ...draft, email_template: result.data.id });
  };

  const TemplateCard = ({ template }: { template: EmailTemplate }) => (
    <button
      type="button"
      onClick={() => {
        setDraft(d => ({
          ...d,
          email_template: template.id,
          subject: d.subject || template.subject_line,
          preview_text: d.preview_text || template.preview_text,
        }));
        setPickerOpen(false);
      }}
      className={`overflow-hidden rounded-lg border-2 text-left transition-shadow hover:shadow-md ${
        draft.email_template === template.id ? "border-[#1A3C5E]" : "border-[#E0E0E0]"
      }`}
    >
      <TemplateThumbnail html={template.html_body} />
      <div className="border-t border-[#E0E0E0] p-2.5">
        <div className="truncate text-xs font-medium text-[#444444]">{template.name}</div>
        <span className="mt-1 inline-block rounded bg-[#F4F4F4] px-1.5 py-0.5 text-[10px] text-[#9E9E9E]">
          {CATEGORY_LABELS[template.category]}
        </span>
      </div>
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-semibold uppercase text-[#9E9E9E]">Template</label>
          {selectedTemplate && !pickerOpen && (
            <button type="button" className="text-xs font-medium text-[#1A3C5E] hover:underline" onClick={() => setPickerOpen(true)}>
              Change template
            </button>
          )}
        </div>

        {selectedTemplate && !pickerOpen ? (
          <div className="overflow-hidden rounded-lg border border-[#E0E0E0]">
            <TemplateThumbnail html={selectedTemplate.html_body} heightClassName="h-40" />
            <div className="border-t border-[#E0E0E0] p-3">
              <div className="text-sm font-medium text-[#444444]">{selectedTemplate.name}</div>
              <span className="mt-1 inline-block rounded bg-[#F4F4F4] px-1.5 py-0.5 text-[10px] text-[#9E9E9E]">
                {CATEGORY_LABELS[selectedTemplate.category]}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {presets.length > 0 && (
              <div>
                <h4 className="mb-2 text-[11px] font-semibold uppercase text-[#9E9E9E]">Presets</h4>
                <div className="grid grid-cols-2 gap-3">
                  {presets.map(t => (
                    <TemplateCard key={t.id} template={t} />
                  ))}
                </div>
              </div>
            )}
            {custom.length > 0 && (
              <div>
                <h4 className="mb-2 text-[11px] font-semibold uppercase text-[#9E9E9E]">Your templates</h4>
                <div className="grid grid-cols-2 gap-3">
                  {custom.map(t => (
                    <TemplateCard key={t.id} template={t} />
                  ))}
                </div>
              </div>
            )}
            <Link
              href="/admin/campaigns/templates/new"
              target="_blank"
              className="block rounded-lg border-2 border-dashed border-[#E0E0E0] p-4 text-center text-sm hover:bg-[#F4F4F4]"
            >
              <span className="font-semibold text-[#1A3C5E]">+ Build from scratch</span>
              <p className="mt-1 text-xs text-[#9E9E9E]">Opens the template editor in a new tab.</p>
            </Link>
          </div>
        )}
      </div>

      {selectedTemplate && !pickerOpen && blocks.some(b => b.type === "TEXT" || b.type === "BUTTON") && (
        <div className="flex flex-col gap-4 rounded-lg border border-[#E0E0E0] p-4">
          <div>
            <label className="text-xs font-semibold uppercase text-[#9E9E9E]">Email copy</label>
            <p className="mt-1 text-xs text-[#9E9E9E]">
              Edit the wording for this email. The template it&apos;s based on won&apos;t be touched --
              your changes are saved just for this campaign.
            </p>
          </div>
          {blocks.map((block, index) =>
            block.type === "TEXT" ? (
              <div key={index}>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-medium text-[#444444]">Message</label>
                  <MergeTagPicker onInsert={tag => updateBlockAt(index, { html: `${block.html}${tag}` } as Partial<EmailBlock>)} />
                </div>
                <ReactQuill value={block.html} onChange={(val: string) => updateBlockAt(index, { html: val } as Partial<EmailBlock>)} />
              </div>
            ) : block.type === "BUTTON" ? (
              <div key={index} className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#444444]">Button label</label>
                  <input
                    type="text"
                    className="input input-bordered input-sm w-full border-[#E0E0E0]"
                    value={block.label}
                    onChange={e => updateBlockAt(index, { label: e.target.value } as Partial<EmailBlock>)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#444444]">Button link</label>
                  <input
                    type="text"
                    className="input input-bordered input-sm w-full border-[#E0E0E0]"
                    value={block.url}
                    onChange={e => updateBlockAt(index, { url: e.target.value } as Partial<EmailBlock>)}
                  />
                </div>
              </div>
            ) : null
          )}
          {copyChanged && (
            <p className="text-xs italic text-[#1A3C5E]">
              You&apos;ve edited this template&apos;s wording -- saving will keep the shared template
              unchanged and use your version just for this email.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#444444]">
            Subject line{" "}
            <span className="font-normal text-[#9E9E9E]">
              (blank falls back to &ldquo;{selectedTemplate?.subject_line ?? "the template's subject"}&rdquo;)
            </span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full border-[#E0E0E0]"
            value={draft.subject}
            maxLength={120}
            onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#444444]">Preview text</label>
          <input
            type="text"
            className="input input-bordered w-full border-[#E0E0E0]"
            value={draft.preview_text}
            maxLength={160}
            onChange={e => setDraft(d => ({ ...d, preview_text: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#444444]">From name</label>
            <input
              type="text"
              className="input input-bordered w-full border-[#E0E0E0]"
              value={draft.from_name}
              maxLength={100}
              onChange={e => setDraft(d => ({ ...d, from_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#444444]">Reply-to (optional)</label>
            <input
              type="email"
              className="input input-bordered w-full border-[#E0E0E0]"
              value={draft.reply_to}
              onChange={e => setDraft(d => ({ ...d, reply_to: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn w-full text-white hover:opacity-90"
        style={{ backgroundColor: "#1A3C5E" }}
        disabled={saving || savingCopy || !draft.email_template}
        onClick={handleSave}
      >
        {savingCopy ? "Saving your copy..." : saving ? "Saving..." : "Save email"}
      </button>
    </div>
  );
};

export default EmailStepEditor;
