"use client";

import Link from "next/link";

import { CATEGORY_LABELS, EmailTemplate } from "@/app/common/types/campaigns.type";

const TemplateStep = ({
  templates,
  selectedId,
  onSelect,
}: {
  templates: EmailTemplate[];
  selectedId: string | null;
  onSelect: (template: EmailTemplate) => void;
}) => {
  const presets = templates.filter(t => t.is_preset);
  const custom = templates.filter(t => !t.is_preset);

  const Card = ({ template }: { template: EmailTemplate }) => (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className={`text-left border-2 rounded-lg overflow-hidden hover:shadow-md transition-shadow ${
        selectedId === template.id ? "border-primary" : "border-transparent"
      }`}
    >
      <div className="h-24 bg-gradient-to-br from-[#1A3C5E] to-[#2D5580] flex items-center justify-center text-white text-xs font-medium px-3 text-center">
        {template.subject_line}
      </div>
      <div className="p-3 border border-t-0">
        <div className="font-medium text-sm">{template.name}</div>
        <span className="badge badge-sm badge-ghost mt-1">{CATEGORY_LABELS[template.category]}</span>
      </div>
    </button>
  );

  return (
    <div>
      {presets.length > 0 && (
        <>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Presets</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {presets.map(t => (
              <Card key={t.id} template={t} />
            ))}
          </div>
        </>
      )}
      {custom.length > 0 && (
        <>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Your templates</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {custom.map(t => (
              <Card key={t.id} template={t} />
            ))}
          </div>
        </>
      )}
      <Link
        href="/admin/campaigns/templates/new"
        target="_blank"
        className="block border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 text-sm"
      >
        <span className="font-semibold text-primary">+ Build from scratch</span>
        <p className="text-xs text-muted-foreground mt-1">
          Opens the template editor in a new tab -- save it, then come back and refresh this page to select it.
        </p>
      </Link>
    </div>
  );
};

export default TemplateStep;
