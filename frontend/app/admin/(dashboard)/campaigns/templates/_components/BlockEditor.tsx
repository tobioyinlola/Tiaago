"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { createTemplate, updateTemplate } from "@/app/common/services/campaigns";
import { SelectInput } from "@/app/common/components/dashboard/SelectInput";
import {
  BLOCK_LIBRARY,
  CATEGORY_LABELS,
  EmailBlock,
  EmailTemplate,
  MERGE_TAGS,
  TemplateCategory,
  defaultBlockFor,
} from "@/app/common/types/campaigns.type";
import MergeTagPicker from "./MergeTagPicker";
import PreviewModal from "./PreviewModal";

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <div className="skeleton w-full h-24" />,
});

const DEFAULT_BLOCKS: EmailBlock[] = [defaultBlockFor("HEADER"), defaultBlockFor("TEXT"), defaultBlockFor("FOOTER")];

const BlockEditor = ({ initialTemplate }: { initialTemplate: EmailTemplate | null }) => {
  const router = useRouter();
  const [name, setName] = useState(initialTemplate?.name ?? "");
  const [category, setCategory] = useState<TemplateCategory>(initialTemplate?.category ?? "CUSTOM");
  const [subjectLine, setSubjectLine] = useState(initialTemplate?.subject_line ?? "");
  const [previewText, setPreviewText] = useState(initialTemplate?.preview_text ?? "");
  const [blocks, setBlocks] = useState<EmailBlock[]>(initialTemplate?.blocks?.length ? initialTemplate.blocks : DEFAULT_BLOCKS);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  const selectedBlock = selectedIndex !== null ? blocks[selectedIndex] : null;

  const addBlock = (type: EmailBlock["type"]) => {
    setBlocks(prev => {
      const footerIndex = prev.findIndex(b => b.type === "FOOTER");
      const insertAt = footerIndex === -1 ? prev.length : footerIndex;
      const next = [...prev];
      next.splice(insertAt, 0, defaultBlockFor(type));
      setSelectedIndex(insertAt);
      return next;
    });
  };

  const updateBlock = (index: number, patch: Partial<EmailBlock>) => {
    setBlocks(prev => prev.map((b, i) => (i === index ? ({ ...b, ...patch } as EmailBlock) : b)));
  };

  const removeBlock = (index: number) => {
    if (blocks[index].type === "FOOTER") {
      toast.error("The footer block is required and can't be removed.");
      return;
    }
    setBlocks(prev => prev.filter((_, i) => i !== index));
    setSelectedIndex(null);
  };

  const duplicateBlock = (index: number) => {
    if (blocks[index].type === "FOOTER") return;
    setBlocks(prev => {
      const next = [...prev];
      next.splice(index + 1, 0, { ...prev[index] });
      return next;
    });
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    if (blocks[target].type === "FOOTER" || blocks[index].type === "FOOTER") return;
    setBlocks(prev => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSelectedIndex(target);
  };

  const fetchPreview = async () => {
    try {
      const data = await clientKyInstance
        .post("campaigns/templates/preview/", { json: { blocks } })
        .json<{ html_body: string; plain_text_body: string }>();
      setPreviewHtml(data.html_body);
    } catch {
      toast.error("Couldn't render preview.");
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !subjectLine.trim()) {
      toast.error("Name and subject line are required.");
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      category,
      subject_line: subjectLine.trim(),
      preview_text: previewText.trim(),
      blocks,
      merge_tags: MERGE_TAGS.filter(m => JSON.stringify(blocks).includes(`{{${m.tag}}}`)).map(m => m.tag),
    };
    const result = initialTemplate ? await updateTemplate(initialTemplate.id, payload) : await createTemplate(payload);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Template "${result.data.name}" saved.`);
    router.push(`/admin/campaigns/templates/${result.data.id}`);
    router.refresh();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4 mb-6">
        <input
          type="text"
          placeholder="Template name"
          className="input input-bordered input-sm w-56"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <div className="w-44">
          <SelectInput
            isClearable={false}
            isSearchable={false}
            size="sm"
            placeholder="Category"
            options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
            value={category}
            onChange={value => setCategory((value ?? "CUSTOM") as TemplateCategory)}
          />
        </div>
        <input
          type="text"
          placeholder="Subject line"
          className="input input-bordered input-sm flex-1 min-w-48"
          value={subjectLine}
          onChange={e => setSubjectLine(e.target.value)}
          maxLength={120}
        />
        <input
          type="text"
          placeholder="Preview text"
          className="input input-bordered input-sm flex-1 min-w-48"
          value={previewText}
          onChange={e => setPreviewText(e.target.value)}
          maxLength={160}
        />
        <div onClick={fetchPreview}>
          <PreviewModal html={previewHtml} subjectLine={subjectLine} />
        </div>
        <button type="button" className="btn btn-sm btn-primary" disabled={saving} onClick={handleSave}>
          {saving ? "Saving..." : "Save template"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_320px] gap-6">
        {/* Left: block library */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Add a block</h4>
          <div className="flex flex-col gap-1">
            {BLOCK_LIBRARY.map(b => (
              <button
                key={b.type}
                type="button"
                onClick={() => addBlock(b.type)}
                className="text-left px-3 py-2 rounded text-sm border hover:bg-gray-50"
              >
                <div className="font-medium">{b.label}</div>
                <div className="text-xs text-muted-foreground">{b.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Middle: canvas */}
        <div className="border rounded-lg bg-gray-50 p-4">
          <div className="mx-auto bg-white" style={{ maxWidth: 600 }}>
            {blocks.map((block, index) => (
              <div
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`relative group cursor-pointer border-2 ${
                  selectedIndex === index ? "border-primary" : "border-transparent hover:border-gray-300"
                }`}
              >
                <BlockCanvasPreview block={block} />
                <div className="absolute top-1 right-1 hidden group-hover:flex gap-1 bg-white rounded shadow border px-1 py-0.5">
                  <button type="button" className="text-xs px-1" onClick={e => { e.stopPropagation(); moveBlock(index, -1); }} aria-label="Move up">
                    ↑
                  </button>
                  <button type="button" className="text-xs px-1" onClick={e => { e.stopPropagation(); moveBlock(index, 1); }} aria-label="Move down">
                    ↓
                  </button>
                  {block.type !== "FOOTER" && (
                    <>
                      <button type="button" className="text-xs px-1" onClick={e => { e.stopPropagation(); duplicateBlock(index); }} aria-label="Duplicate">
                        ⧉
                      </button>
                      <button type="button" className="text-xs px-1 text-destructive" onClick={e => { e.stopPropagation(); removeBlock(index); }} aria-label="Delete">
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: settings */}
        <div className="border rounded-lg p-4 h-fit">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Block settings</h4>
          {selectedBlock && selectedIndex !== null ? (
            <BlockSettings block={selectedBlock} onChange={patch => updateBlock(selectedIndex, patch)} ReactQuill={ReactQuill} />
          ) : (
            <p className="text-sm text-muted-foreground">Select a block to edit its settings.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const BlockCanvasPreview = ({ block }: { block: EmailBlock }) => {
  switch (block.type) {
    case "HEADER":
      return (
        <div style={{ backgroundColor: block.background_colour }} className="p-6 text-center text-white">
          <div className="text-sm opacity-75">[Logo]</div>
          {block.subtitle && <div className="text-xs mt-2 opacity-90">{block.subtitle}</div>}
        </div>
      );
    case "TEXT":
      return (
        <div
          className={`p-4 ${block.font_size === "large" ? "text-xl" : "text-sm"} ${block.align === "center" ? "text-center" : "text-left"}`}
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      );
    case "BUTTON":
      return (
        <div className={`p-4 ${block.align === "left" ? "text-left" : block.align === "right" ? "text-right" : "text-center"}`}>
          <span className="inline-block px-6 py-2.5 rounded text-white text-sm font-semibold" style={{ backgroundColor: block.colour }}>
            {block.label}
          </span>
        </div>
      );
    case "IMAGE":
      return (
        <div className="p-4 text-center">
          {block.url ? (
            <img src={block.url} alt={block.alt} className="max-w-full mx-auto" />
          ) : (
            <div className="h-24 bg-gray-100 flex items-center justify-center text-xs text-muted-foreground">No image set</div>
          )}
        </div>
      );
    case "DIVIDER":
      return (
        <div className="px-4 py-2">
          <hr style={{ borderColor: block.colour }} />
        </div>
      );
    case "SPACER":
      return <div style={{ height: block.height === "small" ? 8 : block.height === "large" ? 32 : 16 }} />;
    case "STAT":
      return (
        <div className="p-4 text-center">
          <div className="text-3xl font-bold" style={{ color: "#1C3477" }}>{`{{${block.merge_tag}}}`}</div>
          <div className="text-xs text-muted-foreground mt-1">{block.label}</div>
        </div>
      );
    case "FOOTER":
      return (
        <div className="p-4 text-center bg-gray-50 text-xs text-muted-foreground">
          <div>{block.company_name} {block.address && `· ${block.address}`}</div>
          <div className="mt-2 underline">Unsubscribe · Privacy Policy</div>
        </div>
      );
  }
};

const colourInput = (value: string, onChange: (v: string) => void) => (
  <input type="color" className="w-10 h-8 border rounded cursor-pointer" value={value} onChange={e => onChange(e.target.value)} />
);

const BlockSettings = ({
  block,
  onChange,
  ReactQuill,
}: {
  block: EmailBlock;
  onChange: (patch: Partial<EmailBlock>) => void;
  ReactQuill: any;
}) => {
  switch (block.type) {
    case "HEADER":
      return (
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium">Logo URL</label>
          <input type="text" className="input input-bordered input-sm" value={block.logo_url ?? ""} onChange={e => onChange({ logo_url: e.target.value })} />
          <label className="text-xs font-medium">Background colour</label>
          {colourInput(block.background_colour, v => onChange({ background_colour: v }))}
          <label className="text-xs font-medium">Subtitle</label>
          <input type="text" className="input input-bordered input-sm" value={block.subtitle ?? ""} onChange={e => onChange({ subtitle: e.target.value })} />
        </div>
      );
    case "TEXT":
      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">Content</label>
            <MergeTagPicker onInsert={tag => onChange({ html: `${block.html}${tag}` })} />
          </div>
          <ReactQuill value={block.html} onChange={(val: string) => onChange({ html: val })} />
          <label className="text-xs font-medium">Font size</label>
          <SelectInput
            isClearable={false}
            isSearchable={false}
            size="sm"
            options={[
              { value: "body", label: "Body" },
              { value: "large", label: "Large" },
            ]}
            value={block.font_size}
            onChange={value => onChange({ font_size: (value ?? "body") as "body" | "large" })}
          />
          <label className="text-xs font-medium">Align</label>
          <SelectInput
            isClearable={false}
            isSearchable={false}
            size="sm"
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
            ]}
            value={block.align}
            onChange={value => onChange({ align: (value ?? "left") as "left" | "center" })}
          />
        </div>
      );
    case "BUTTON":
      return (
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium">Label</label>
          <input type="text" className="input input-bordered input-sm" value={block.label} onChange={e => onChange({ label: e.target.value })} />
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">URL</label>
            <MergeTagPicker onInsert={tag => onChange({ url: `${block.url}${tag}` })} />
          </div>
          <input type="text" className="input input-bordered input-sm" value={block.url} onChange={e => onChange({ url: e.target.value })} />
          <label className="text-xs font-medium">Colour</label>
          <div className="flex items-center gap-2">
            {["#5465FF", "#1C3477"].map(preset => (
              <button
                key={preset}
                type="button"
                className="w-7 h-7 rounded-full border-2"
                style={{ backgroundColor: preset, borderColor: block.colour === preset ? "#000" : "transparent" }}
                onClick={() => onChange({ colour: preset })}
              />
            ))}
            {colourInput(block.colour, v => onChange({ colour: v }))}
          </div>
          <label className="text-xs font-medium">Align</label>
          <SelectInput
            isClearable={false}
            isSearchable={false}
            size="sm"
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
            value={block.align}
            onChange={value => onChange({ align: (value ?? "center") as "left" | "center" | "right" })}
          />
        </div>
      );
    case "IMAGE":
      return <ImageBlockSettings block={block} onChange={onChange} />;
    case "DIVIDER":
      return (
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium">Colour</label>
          {colourInput(block.colour, v => onChange({ colour: v }))}
        </div>
      );
    case "SPACER":
      return (
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium">Height</label>
          <SelectInput
            isClearable={false}
            isSearchable={false}
            size="sm"
            options={[
              { value: "small", label: "Small (8px)" },
              { value: "medium", label: "Medium (16px)" },
              { value: "large", label: "Large (32px)" },
            ]}
            value={block.height}
            onChange={value => onChange({ height: (value ?? "medium") as "small" | "medium" | "large" })}
          />
        </div>
      );
    case "STAT":
      return (
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium">Label</label>
          <input type="text" className="input input-bordered input-sm" value={block.label} onChange={e => onChange({ label: e.target.value })} />
          <label className="text-xs font-medium">Merge tag</label>
          <SelectInput
            isClearable={false}
            options={MERGE_TAGS.map(m => ({ value: m.tag, label: m.label }))}
            value={block.merge_tag}
            onChange={value => onChange({ merge_tag: value ?? MERGE_TAGS[0].tag })}
          />
        </div>
      );
    case "FOOTER":
      return (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">Required by law -- includes the auto-generated unsubscribe link. Cannot be removed.</p>
          <label className="text-xs font-medium">Company name</label>
          <input type="text" className="input input-bordered input-sm" value={block.company_name} onChange={e => onChange({ company_name: e.target.value })} />
          <label className="text-xs font-medium">Address</label>
          <input type="text" className="input input-bordered input-sm" value={block.address} onChange={e => onChange({ address: e.target.value })} />
          <label className="text-xs font-medium">Privacy policy URL</label>
          <input type="text" className="input input-bordered input-sm" value={block.privacy_url} onChange={e => onChange({ privacy_url: e.target.value })} />
        </div>
      );
  }
};

const ImageBlockSettings = ({ block, onChange }: { block: Extract<EmailBlock, { type: "IMAGE" }>; onChange: (patch: Partial<EmailBlock>) => void }) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("image", file);
      const res = await clientKyInstance.post("campaigns/manage/upload-image/", { body: formData }).json<{ url: string }>();
      onChange({ url: res.url });
    } catch {
      toast.error("Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-medium">Upload image</label>
      <input
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        className="file-input file-input-bordered file-input-sm"
        disabled={uploading}
        onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
      />
      <label className="text-xs font-medium">Or image URL</label>
      <input type="text" className="input input-bordered input-sm" value={block.url} onChange={e => onChange({ url: e.target.value })} />
      <label className="text-xs font-medium">Alt text</label>
      <input type="text" className="input input-bordered input-sm" value={block.alt} onChange={e => onChange({ alt: e.target.value })} />
      <label className="text-xs font-medium">Link URL (optional)</label>
      <input type="text" className="input input-bordered input-sm" value={block.link_url ?? ""} onChange={e => onChange({ link_url: e.target.value })} />
    </div>
  );
};

export default BlockEditor;
