"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { createSegment, deleteSegment, updateSegment } from "@/app/common/services/segments";
import { SelectInput } from "@/app/common/components/dashboard/SelectInput";
import { Tag } from "@/app/common/types/tags.type";
import {
  AudienceSegment,
  MatchType,
  OPERATOR_LABELS,
  PROPERTY_FIELDS,
  PropertyOperator,
  SEGMENT_TEMPLATES,
  SegmentCondition,
  SegmentPreview,
} from "@/app/common/types/segments.type";

const emptyForm = () => ({
  name: "",
  description: "",
  matchType: "ALL" as MatchType,
  conditions: [] as SegmentCondition[],
});

const SegmentsBuilder = ({ initialSegments }: { initialSegments: AudienceSegment[] }) => {
  const [segments, setSegments] = useState(initialSegments);
  const [selectedId, setSelectedId] = useState<string | "new">("new");
  const [form, setForm] = useState(emptyForm());
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [preview, setPreview] = useState<SegmentPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [systemRes, customTags] = await Promise.all([
          clientKyInstance.get("tags/admin/system/").json<{ results: Tag[] }>(),
          clientKyInstance.get("tags/admin/custom/").json<Tag[]>(),
        ]);
        setAllTags([...systemRes.results, ...customTags]);
      } catch {
        setAllTags([]);
      }
    })();
  }, []);

  // Live preview, debounced ~1s per the spec.
  useEffect(() => {
    if (!form.conditions.length) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const data = await clientKyInstance
          .post("segments/admin/preview/", { json: { conditions: form.conditions, match_type: form.matchType } })
          .json<SegmentPreview>();
        setPreview(data);
      } catch {
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [form.conditions, form.matchType]);

  const selectedSegment = useMemo(() => segments.find(s => s.id === selectedId) ?? null, [segments, selectedId]);

  const loadSegment = (segment: AudienceSegment) => {
    setSelectedId(segment.id);
    setForm({
      name: segment.name,
      description: segment.description,
      matchType: segment.match_type,
      conditions: segment.conditions,
    });
  };

  const startNew = () => {
    setSelectedId("new");
    setForm(emptyForm());
    setPreview(null);
  };

  const applyTemplate = (template: (typeof SEGMENT_TEMPLATES)[number]) => {
    setSelectedId("new");
    setForm({
      name: template.name,
      description: template.description,
      matchType: template.match_type,
      conditions: template.conditions,
    });
  };

  const addCondition = (type: SegmentCondition["type"]) => {
    const next: SegmentCondition =
      type === "property"
        ? { type: "property", field: PROPERTY_FIELDS[0].value, operator: "eq", value: "" }
        : { type, tag_slug: allTags[0]?.slug ?? "" };
    setForm(f => ({ ...f, conditions: [...f.conditions, next] }));
  };

  const updateCondition = (index: number, patch: Partial<SegmentCondition>) => {
    setForm(f => ({
      ...f,
      conditions: f.conditions.map((c, i) => (i === index ? ({ ...c, ...patch } as SegmentCondition) : c)),
    }));
  };

  const removeCondition = (index: number) => {
    setForm(f => ({ ...f, conditions: f.conditions.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Segment name is required.");
      return;
    }
    if (!form.conditions.length) {
      toast.error("Add at least one condition.");
      return;
    }
    setSubmitting(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      conditions: form.conditions,
      match_type: form.matchType,
    };
    const result =
      selectedId !== "new" ? await updateSegment(selectedId, payload) : await createSegment(payload);
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Segment "${result.data.name}" saved.`);
    setSegments(prev => {
      const exists = prev.some(s => s.id === result.data.id);
      return exists ? prev.map(s => (s.id === result.data.id ? result.data : s)) : [result.data, ...prev];
    });
    setSelectedId(result.data.id);
  };

  const handleDelete = async () => {
    if (selectedId === "new") return;
    if (!confirm(`Delete segment "${form.name}"? This cannot be undone.`)) return;
    const result = await deleteSegment(selectedId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Segment deleted.");
    setSegments(prev => prev.filter(s => s.id !== selectedId));
    startNew();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-6">
      {/* Left: saved segments + templates */}
      <div>
        <button type="button" className="btn btn-primary btn-sm w-full mb-4" onClick={startNew}>
          + New segment
        </button>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Saved segments</h4>
        <div className="flex flex-col gap-1 mb-6">
          {segments.map(segment => (
            <button
              key={segment.id}
              type="button"
              onClick={() => loadSegment(segment)}
              className={`text-left px-3 py-2 rounded text-sm border ${
                selectedId === segment.id ? "border-primary bg-primary/5" : "border-transparent hover:bg-gray-50"
              }`}
            >
              <div className="font-medium">{segment.name}</div>
              <div className="text-xs text-muted-foreground">{segment.estimated_size} orgs</div>
            </button>
          ))}
          {!segments.length && <p className="text-xs text-muted-foreground px-1">No saved segments yet.</p>}
        </div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Templates</h4>
        <div className="flex flex-col gap-1">
          {SEGMENT_TEMPLATES.map(template => (
            <button
              key={template.name}
              type="button"
              onClick={() => applyTemplate(template)}
              className="text-left px-3 py-2 rounded text-sm hover:bg-gray-50 border border-transparent"
            >
              <div className="font-medium">{template.name}</div>
              <div className="text-xs text-muted-foreground">{template.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Middle: builder */}
      <div className="border rounded-lg p-5">
        <div className="flex flex-col gap-3 mb-4">
          <input
            type="text"
            placeholder="Segment name"
            className="input input-bordered w-full"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            maxLength={80}
          />
          <textarea
            placeholder="Description (optional)"
            className="textarea textarea-bordered w-full"
            rows={2}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Match</span>
          <div className="join">
            <button
              type="button"
              className={`btn btn-xs join-item ${form.matchType === "ALL" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setForm(f => ({ ...f, matchType: "ALL" }))}
            >
              All conditions
            </button>
            <button
              type="button"
              className={`btn btn-xs join-item ${form.matchType === "ANY" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setForm(f => ({ ...f, matchType: "ANY" }))}
            >
              Any condition
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-4">
          {form.conditions.map((condition, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2 border rounded-lg p-3 bg-gray-50/50">
              <div className="w-40">
                <SelectInput
                  isClearable={false}
                  isSearchable={false}
                  size="sm"
                  placeholder="Condition type"
                  options={[
                    { value: "has_tag", label: "Has tag" },
                    { value: "does_not_have_tag", label: "Does not have tag" },
                    { value: "property", label: "Property" },
                  ]}
                  value={condition.type}
                  onChange={value => {
                    const type = (value ?? "has_tag") as SegmentCondition["type"];
                    updateCondition(
                      index,
                      type === "property"
                        ? { type, field: PROPERTY_FIELDS[0].value, operator: "eq", value: "" }
                        : { type, tag_slug: allTags[0]?.slug ?? "" }
                    );
                  }}
                />
              </div>

              {condition.type === "property" ? (
                <>
                  <div className="w-36">
                    <SelectInput
                      isClearable={false}
                      size="sm"
                      placeholder="Field"
                      options={PROPERTY_FIELDS.map(f => ({ value: f.value, label: f.label }))}
                      value={condition.field}
                      onChange={value => updateCondition(index, { field: value ?? PROPERTY_FIELDS[0].value })}
                    />
                  </div>
                  <div className="w-52">
                    <SelectInput
                      isClearable={false}
                      isSearchable={false}
                      size="sm"
                      placeholder="Operator"
                      options={Object.entries(OPERATOR_LABELS).map(([value, label]) => ({ value, label }))}
                      value={condition.operator}
                      onChange={value => updateCondition(index, { operator: (value ?? "eq") as PropertyOperator })}
                    />
                  </div>
                  <input
                    type="text"
                    className="input input-bordered input-sm flex-1 min-w-32"
                    placeholder="Value"
                    value={condition.value}
                    onChange={e => updateCondition(index, { value: e.target.value })}
                  />
                </>
              ) : (
                <div className="flex-1 min-w-48">
                  <SelectInput
                    isClearable={false}
                    size="sm"
                    placeholder="Select a tag..."
                    options={allTags.map(tag => ({ value: tag.slug, label: tag.name, colour: tag.colour }))}
                    value={condition.tag_slug}
                    onChange={value => updateCondition(index, { tag_slug: value ?? "" })}
                  />
                </div>
              )}

              <button type="button" className="btn btn-xs btn-ghost" onClick={() => removeCondition(index)}>
                Remove
              </button>
            </div>
          ))}
          {!form.conditions.length && <p className="text-sm text-muted-foreground">No conditions yet.</p>}
        </div>

        <div className="flex items-center gap-2 mb-6">
          <button type="button" className="btn btn-sm btn-outline" onClick={() => addCondition("has_tag")}>
            + Tag condition
          </button>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => addCondition("property")}>
            + Property condition
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-primary" disabled={submitting} onClick={handleSave}>
            {submitting ? "Saving..." : selectedSegment ? "Save changes" : "Save segment"}
          </button>
          {selectedSegment && (
            <button type="button" className="btn btn-ghost text-destructive" onClick={handleDelete}>
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Right: live preview */}
      <div className="border rounded-lg p-5 h-fit sticky top-4">
        <h4 className="font-semibold mb-3">Live preview</h4>
        {previewLoading ? (
          <p className="text-sm text-muted-foreground">Calculating...</p>
        ) : preview ? (
          <>
            <div className="text-3xl font-bold mb-1">{preview.estimated_size}</div>
            <p className="text-xs text-muted-foreground mb-4">estimated matching organisations</p>
            {preview.breakdown && form.matchType === "ANY" && (
              <div className="mb-4">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Per-condition breakdown</h5>
                {preview.breakdown.map((b, i) => (
                  <div key={i} className="text-xs flex justify-between py-0.5">
                    <span className="truncate">
                      {b.condition.type === "property" ? b.condition.field : b.condition.tag_slug}
                    </span>
                    <span className="font-medium">{b.count}</span>
                  </div>
                ))}
              </div>
            )}
            <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Sample organisations</h5>
            <ul className="text-sm">
              {preview.sample_organisations.map(o => (
                <li key={o.id} className="py-0.5">
                  {o.company_name}
                </li>
              ))}
              {!preview.sample_organisations.length && <li className="text-muted-foreground">None matched.</li>}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Add conditions to see a live estimate.</p>
        )}
      </div>
    </div>
  );
};

export default SegmentsBuilder;
