"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LuPlus, LuTrash2 } from "react-icons/lu";

import { TalentRole } from "@/app/common/types";
import Button from "@/app/common/components/DaisyButton";
import SlidePanel from "@/app/common/components/SlidePanel";
import { useAlert } from "@/app/common/store/useAlert";
import { uploadStaffBundleCsv } from "@/app/common/services/assessment";

const difficultyLevels = ["JUNIOR", "INTERMEDIATE", "SENIOR"];

const CSV_COLUMN_ROWS: { column: string; appliesTo: string; notes: string }[] = [
  { column: "question_type", appliesTo: "All rows", notes: "MCQ or CODING_TASK (required)" },
  { column: "question", appliesTo: "All rows", notes: "Question text, or the coding task's title" },
  { column: "option_1 … option_4", appliesTo: "MCQ", notes: "At least 2 non-empty options" },
  { column: "correct_option", appliesTo: "MCQ", notes: "1-based index of the correct option" },
  { column: "description", appliesTo: "CODING_TASK", notes: "The problem statement" },
  { column: "sample_input / sample_output", appliesTo: "CODING_TASK", notes: "Optional example I/O" },
  { column: "skills_assessed", appliesTo: "CODING_TASK", notes: "Separate multiple with a semicolon (;)" },
  { column: "difficulty_level", appliesTo: "Optional", notes: "Falls back to the bundle-level value below" },
  { column: "stack", appliesTo: "Optional", notes: "Matched by name against existing tech stacks" },
];

type OpenEndedRow = { question: string; grading_guidance: string; skills_assessed: string };

const emptyOpenEndedRow = (): OpenEndedRow => ({
  question: "",
  grading_guidance: "",
  skills_assessed: "",
});

const BundleCsvUploadModal = ({ roles }: { roles: TalentRole[] }) => {
  const router = useRouter();
  const setAlert = useAlert(s => s.setAlert);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState("JUNIOR");
  const [duration, setDuration] = useState(30);
  const [description, setDescription] = useState("");
  const [isRecommended, setIsRecommended] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [openEndedRows, setOpenEndedRows] = useState<OpenEndedRow[]>([]);

  const reset = () => {
    setName("");
    setRoleId("");
    setDifficultyLevel("JUNIOR");
    setDuration(30);
    setDescription("");
    setIsRecommended(false);
    setCsvFile(null);
    setOpenEndedRows([]);
  };

  const updateOpenEndedRow = (
    index: number,
    field: keyof OpenEndedRow,
    value: string
  ) => {
    setOpenEndedRows(rows =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nonEmptyOpenEnded = openEndedRows.filter(r => r.question.trim());
    if (!csvFile && nonEmptyOpenEnded.length === 0) {
      setAlert({
        title: "Error",
        message: "Add questions via a CSV file, the open-ended builder below, or both.",
        icon: "error",
      });
      return;
    }

    const formData = new FormData();
    formData.set("name", name);
    formData.set("role_id", roleId);
    formData.set("difficulty_level", difficultyLevel);
    formData.set("estimated_duration_minutes", String(duration));
    formData.set("description", description);
    formData.set("is_recommended", String(isRecommended));
    if (csvFile) formData.set("csv_file", csvFile);
    if (nonEmptyOpenEnded.length) {
      formData.set(
        "open_ended_questions",
        JSON.stringify(
          nonEmptyOpenEnded.map(r => ({
            question: r.question.trim(),
            grading_guidance: r.grading_guidance.trim(),
            skills_assessed: r.skills_assessed
              .split(",")
              .map(s => s.trim())
              .filter(Boolean),
          }))
        )
      );
    }

    setSubmitting(true);
    const res = await uploadStaffBundleCsv(formData);
    setSubmitting(false);

    if (!res.success) {
      setAlert({ title: "Error", message: res.error, icon: "error" });
      return;
    }
    setAlert({ title: "Success", message: "Bundle created.", icon: "success" });
    reset();
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <Button
        color="primary"
        className="text-white gap-1.5"
        onClick={() => setOpen(true)}
      >
        <LuPlus className="w-4 h-4" />
        Create Bundle
      </Button>

      <SlidePanel
        id="bundle-create-panel"
        open={open}
        onClose={() => setOpen(false)}
        title="Create Assessment Bundle"
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text text-black font-medium font-onest mb-1 block">Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="input input-bordered w-full"
                placeholder="e.g. Backend Engineer (Junior)"
              />
            </div>
            <div>
              <label className="label-text text-black font-medium font-onest mb-1 block">Role</label>
              <select
                value={roleId}
                onChange={e => setRoleId(e.target.value)}
                required
                className="select select-bordered w-full"
              >
                <option value="">Select a role</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text text-black font-medium font-onest mb-1 block">Difficulty</label>
              <select
                value={difficultyLevel}
                onChange={e => setDifficultyLevel(e.target.value)}
                required
                className="select select-bordered w-full"
              >
                {difficultyLevels.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text text-black font-medium font-onest mb-1 block">Duration (minutes)</label>
              <input
                type="number"
                min={1}
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                required
                className="input input-bordered w-full"
              />
            </div>
          </div>

          <div>
            <label className="label-text text-black font-medium font-onest mb-1 block">Description (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="textarea textarea-bordered w-full"
              rows={2}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecommended}
              onChange={e => setIsRecommended(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm text-secondary-black">Mark as recommended</span>
          </label>

          <hr className="border-border" />

          {/* MCQ / Coding task questions via CSV */}
          <div>
            <h4 className="text-sm font-semibold text-primaryBlack mb-1">
              Multiple-choice &amp; coding questions
            </h4>
            <p className="text-xs text-secondary-black mb-3">
              Upload a CSV file to add MCQ or coding-task questions in bulk. Optional if you&apos;re
              only adding open-ended questions below.
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={e => setCsvFile(e.target.files?.[0] ?? null)}
              className="file-input file-input-bordered w-full"
            />

            <div className="mt-3 rounded-lg border border-border overflow-hidden">
              <table className="table table-xs w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left">Column</th>
                    <th className="text-left">Applies to</th>
                    <th className="text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {CSV_COLUMN_ROWS.map(row => (
                    <tr key={row.column}>
                      <td className="font-mono text-[11px] whitespace-nowrap">{row.column}</td>
                      <td className="text-xs whitespace-nowrap">{row.appliesTo}</td>
                      <td className="text-xs text-secondary-black">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-secondary-black mt-2">
              The first row must be the header row with these exact column names. Rows are
              validated one by one -- if any row is invalid the whole upload is rejected and no
              bundle is created.
            </p>
          </div>

          <hr className="border-border" />

          {/* Open-ended questions, authored inline -- no CSV needed */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-primaryBlack">Open-ended questions</h4>
              <button
                type="button"
                onClick={() => setOpenEndedRows(rows => [...rows, emptyOpenEndedRow()])}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <LuPlus className="w-3.5 h-3.5" />
                Add question
              </button>
            </div>
            <p className="text-xs text-secondary-black mb-3">
              Free-text questions graded against a rubric -- add them directly here, no CSV
              required.
            </p>

            {openEndedRows.length === 0 ? (
              <p className="text-xs text-secondary-black italic">
                No open-ended questions added yet.
              </p>
            ) : (
              <div className="space-y-4">
                {openEndedRows.map((row, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-2 relative">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenEndedRows(rows => rows.filter((_, idx) => idx !== i))
                      }
                      className="absolute top-2 right-2 text-secondary-black hover:text-error"
                      aria-label="Remove question"
                    >
                      <LuTrash2 className="w-4 h-4" />
                    </button>
                    <div>
                      <label className="label-text text-black text-xs font-medium font-onest mb-1 block">
                        Question
                      </label>
                      <textarea
                        value={row.question}
                        onChange={e => updateOpenEndedRow(i, "question", e.target.value)}
                        className="textarea textarea-bordered textarea-sm w-full"
                        rows={2}
                        placeholder="e.g. Describe a time you had to debug a production incident."
                      />
                    </div>
                    <div>
                      <label className="label-text text-black text-xs font-medium font-onest mb-1 block">
                        Grading guidance (optional)
                      </label>
                      <textarea
                        value={row.grading_guidance}
                        onChange={e =>
                          updateOpenEndedRow(i, "grading_guidance", e.target.value)
                        }
                        className="textarea textarea-bordered textarea-sm w-full"
                        rows={2}
                        placeholder="What should a strong answer include?"
                      />
                    </div>
                    <div>
                      <label className="label-text text-black text-xs font-medium font-onest mb-1 block">
                        Skills assessed (optional, comma-separated)
                      </label>
                      <input
                        value={row.skills_assessed}
                        onChange={e =>
                          updateOpenEndedRow(i, "skills_assessed", e.target.value)
                        }
                        className="input input-bordered input-sm w-full"
                        placeholder="e.g. Debugging, Communication"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={submitting} className="btn btn-primary text-white w-full">
            {submitting ? "Creating..." : "Create Bundle"}
          </button>
        </form>
      </SlidePanel>
    </>
  );
};

export default BundleCsvUploadModal;
