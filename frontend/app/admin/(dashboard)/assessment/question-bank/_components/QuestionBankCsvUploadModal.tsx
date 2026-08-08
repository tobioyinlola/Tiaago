"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LuPlus, LuTrash2, LuUpload } from "react-icons/lu";

import { TalentRole } from "@/app/common/types";
import Button from "@/app/common/components/DaisyButton";
import SlidePanel from "@/app/common/components/SlidePanel";
import { useAlert } from "@/app/common/store/useAlert";
import { uploadStaffQuestionBankCsv } from "@/app/common/services/assessment";

const difficultyLevels = ["JUNIOR", "INTERMEDIATE", "SENIOR"];

const CSV_COLUMN_ROWS: { column: string; appliesTo: string; notes: string }[] = [
  { column: "question_type", appliesTo: "All rows", notes: "MCQ or CODING_TASK (required)" },
  { column: "question", appliesTo: "All rows", notes: "Question text, or the coding task's title" },
  { column: "option_a … option_d", appliesTo: "MCQ", notes: "At least 2 non-empty options" },
  { column: "correct_option", appliesTo: "MCQ", notes: "Letter (a, b, c or d) of the correct option" },
  { column: "difficulty_level", appliesTo: "Optional", notes: "Falls back to the value below" },
];

type OpenEndedRow = { question: string; grading_guidance: string; skills_assessed: string };
const emptyOpenEndedRow = (): OpenEndedRow => ({ question: "", grading_guidance: "", skills_assessed: "" });

type CodingTaskRow = {
  question: string;
  description: string;
  sample_input: string;
  sample_output: string;
  skills_assessed: string;
};
const emptyCodingTaskRow = (): CodingTaskRow => ({
  question: "",
  description: "",
  sample_input: "",
  sample_output: "",
  skills_assessed: "",
});

const QuestionBankCsvUploadModal = ({ roles }: { roles: TalentRole[] }) => {
  const router = useRouter();
  const setAlert = useAlert(s => s.setAlert);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [roleId, setRoleId] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState("JUNIOR");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [openEndedRows, setOpenEndedRows] = useState<OpenEndedRow[]>([]);
  const [codingTaskRows, setCodingTaskRows] = useState<CodingTaskRow[]>([]);

  const reset = () => {
    setRoleId("");
    setDifficultyLevel("JUNIOR");
    setCsvFile(null);
    setOpenEndedRows([]);
    setCodingTaskRows([]);
  };

  const updateOpenEndedRow = (index: number, field: keyof OpenEndedRow, value: string) => {
    setOpenEndedRows(rows => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const updateCodingTaskRow = (index: number, field: keyof CodingTaskRow, value: string) => {
    setCodingTaskRows(rows => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nonEmptyOpenEnded = openEndedRows.filter(r => r.question.trim());
    const nonEmptyCodingTasks = codingTaskRows.filter(r => r.question.trim());
    if (!csvFile && nonEmptyOpenEnded.length === 0 && nonEmptyCodingTasks.length === 0) {
      setAlert({
        title: "Error",
        message: "Add questions via a CSV file, the open-ended builder, the coding task builder, or a combination.",
        icon: "error",
      });
      return;
    }

    const formData = new FormData();
    formData.set("difficulty_level", difficultyLevel);
    if (roleId) formData.set("role_id", roleId);
    if (csvFile) formData.set("csv_file", csvFile);
    if (nonEmptyOpenEnded.length) {
      formData.set(
        "open_ended_questions",
        JSON.stringify(
          nonEmptyOpenEnded.map(r => ({
            question: r.question.trim(),
            grading_guidance: r.grading_guidance.trim(),
            skills_assessed: r.skills_assessed.split(",").map(s => s.trim()).filter(Boolean),
          }))
        )
      );
    }
    if (nonEmptyCodingTasks.length) {
      formData.set(
        "coding_tasks",
        JSON.stringify(
          nonEmptyCodingTasks.map(r => ({
            question: r.question.trim(),
            description: r.description.trim(),
            sample_input: r.sample_input.trim(),
            sample_output: r.sample_output.trim(),
            skills_assessed: r.skills_assessed.split(",").map(s => s.trim()).filter(Boolean),
          }))
        )
      );
    }

    setSubmitting(true);
    const res = await uploadStaffQuestionBankCsv(formData);
    setSubmitting(false);

    if (!res.success) {
      setAlert({ title: "Error", message: res.error, icon: "error" });
      return;
    }
    setAlert({
      title: "Success",
      message: `${res.data.length} question${res.data.length === 1 ? "" : "s"} added.`,
      icon: "success",
    });
    reset();
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <Button color="primary" variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
        <LuUpload className="w-4 h-4" />
        Upload CSV
      </Button>

      <SlidePanel
        id="question-bank-csv-panel"
        open={open}
        onClose={() => setOpen(false)}
        title="Upload Questions"
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text text-black font-medium font-onest mb-1 block">Role (optional)</label>
              <select value={roleId} onChange={e => setRoleId(e.target.value)} className="select select-bordered w-full">
                <option value="">No specific role</option>
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
                className="select select-bordered w-full"
              >
                {difficultyLevels.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-primaryBlack mb-1">Multiple-choice &amp; coding questions</h4>
            <p className="text-xs text-secondary-black mb-3">
              Upload a CSV file to add MCQ or coding-task questions in bulk, using a strict 8-column format.
              Coding-task rows only need a title here -- add full detail via the builder below instead.
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
              The first row must be the header row with these exact column names. Rows are validated one by one --
              if any row is invalid the whole upload is rejected.
            </p>
          </div>

          <hr className="border-border" />

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
            {openEndedRows.length === 0 ? (
              <p className="text-xs text-secondary-black italic">No open-ended questions added yet.</p>
            ) : (
              <div className="space-y-4">
                {openEndedRows.map((row, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-2 relative">
                    <button
                      type="button"
                      onClick={() => setOpenEndedRows(rows => rows.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 text-secondary-black hover:text-error"
                      aria-label="Remove question"
                    >
                      <LuTrash2 className="w-4 h-4" />
                    </button>
                    <textarea
                      value={row.question}
                      onChange={e => updateOpenEndedRow(i, "question", e.target.value)}
                      className="textarea textarea-bordered textarea-sm w-full"
                      rows={2}
                      placeholder="Question"
                    />
                    <textarea
                      value={row.grading_guidance}
                      onChange={e => updateOpenEndedRow(i, "grading_guidance", e.target.value)}
                      className="textarea textarea-bordered textarea-sm w-full"
                      rows={2}
                      placeholder="Grading guidance (optional)"
                    />
                    <input
                      value={row.skills_assessed}
                      onChange={e => updateOpenEndedRow(i, "skills_assessed", e.target.value)}
                      className="input input-bordered input-sm w-full"
                      placeholder="Skills assessed, comma-separated (optional)"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-border" />

          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-primaryBlack">Coding tasks (full detail)</h4>
              <button
                type="button"
                onClick={() => setCodingTaskRows(rows => [...rows, emptyCodingTaskRow()])}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <LuPlus className="w-3.5 h-3.5" />
                Add coding task
              </button>
            </div>
            {codingTaskRows.length === 0 ? (
              <p className="text-xs text-secondary-black italic">No coding tasks added yet.</p>
            ) : (
              <div className="space-y-4">
                {codingTaskRows.map((row, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-2 relative">
                    <button
                      type="button"
                      onClick={() => setCodingTaskRows(rows => rows.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 text-secondary-black hover:text-error"
                      aria-label="Remove coding task"
                    >
                      <LuTrash2 className="w-4 h-4" />
                    </button>
                    <input
                      value={row.question}
                      onChange={e => updateCodingTaskRow(i, "question", e.target.value)}
                      className="input input-bordered input-sm w-full"
                      placeholder="Title"
                    />
                    <textarea
                      value={row.description}
                      onChange={e => updateCodingTaskRow(i, "description", e.target.value)}
                      className="textarea textarea-bordered textarea-sm w-full"
                      rows={2}
                      placeholder="Description (optional)"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <textarea
                        value={row.sample_input}
                        onChange={e => updateCodingTaskRow(i, "sample_input", e.target.value)}
                        className="textarea textarea-bordered textarea-sm w-full"
                        rows={2}
                        placeholder="Sample input (optional)"
                      />
                      <textarea
                        value={row.sample_output}
                        onChange={e => updateCodingTaskRow(i, "sample_output", e.target.value)}
                        className="textarea textarea-bordered textarea-sm w-full"
                        rows={2}
                        placeholder="Sample output (optional)"
                      />
                    </div>
                    <input
                      value={row.skills_assessed}
                      onChange={e => updateCodingTaskRow(i, "skills_assessed", e.target.value)}
                      className="input input-bordered input-sm w-full"
                      placeholder="Skills assessed, comma-separated (optional)"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={submitting} className="btn btn-primary text-white w-full">
            {submitting ? "Uploading..." : "Upload"}
          </button>
        </form>
      </SlidePanel>
    </>
  );
};

export default QuestionBankCsvUploadModal;
