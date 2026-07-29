"use client";

import { useMemo, useState } from "react";
import { LuTrash2, LuPlus, LuLayers } from "react-icons/lu";

import { ID } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import SidePanel from "@/app/common/components/SidePanel";
import Button from "@/app/common/components/DaisyButton";
import { useAlert } from "@/app/common/store/useAlert";
import {
  addSectionsToAssessment,
  type AssessmentSectionInput,
} from "@/app/common/services/assessment";

type SectionType = "MCQ" | "CODING_TASK" | "OPEN_ENDED";

type MCQDraft = { question: string; options: string[]; correct_option_index: number };
type CodingDraft = { title: string; description: string; difficulty_level: string; constraints: string };
type OpenEndedDraft = { question: string; grading_guidance: string };

const blankMCQ = (): MCQDraft => ({ question: "", options: ["", "", "", ""], correct_option_index: 1 });
const blankCoding = (): CodingDraft => ({ title: "", description: "", difficulty_level: "JUNIOR", constraints: "" });
const blankOpenEnded = (): OpenEndedDraft => ({ question: "", grading_guidance: "" });

const sectionTypeLabels: Record<SectionType, string> = {
  MCQ: "Multiple Choice",
  CODING_TASK: "Coding Task",
  OPEN_ENDED: "Open-Ended",
};

const allSectionTypes = Object.keys(sectionTypeLabels) as SectionType[];

/** A non-MIXED assessment may only hold sections of its own declared type
 * -- GeneralSkillAssessmentSectionSerializer.validate rejects anything else
 * with "Section is of type X but assessment is of type Y". Rather than let
 * the recruiter build a section the API will refuse, the type picker is
 * locked to whatever step 1 chose unless the assessment is a hybrid. */
const allowedTypesFor = (assessmentType?: string): SectionType[] =>
  allSectionTypes.includes(assessmentType as SectionType)
    ? [assessmentType as SectionType]
    : allSectionTypes;

const questionCountOf = (section: AssessmentSectionInput) =>
  section.mcq_questions?.length ??
  section.coding_tasks?.length ??
  section.open_ended_questions?.length ??
  0;

const CustomSectionModal = ({
  assessmentId,
  assessmentType,
  open,
  onClose,
  onAdded,
}: {
  assessmentId: ID;
  /** The wizard's step-1 `assessment_type`. "MIXED" unlocks all three
   * section types; anything else pins the panel to that one type. */
  assessmentType: string;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) => {
  const setAlert = useAlert(s => s.setAlert);
  const allowedTypes = useMemo(() => allowedTypesFor(assessmentType), [assessmentType]);
  const typeIsLocked = allowedTypes.length === 1;

  // Derived rather than synced: the recruiter can still change the
  // assessment type on step 1 while this panel is mounted, and the active
  // type must always collapse back into the allowed set when they do.
  const [preferredType, setPreferredType] = useState<SectionType>(allowedTypes[0]);
  const type = allowedTypes.includes(preferredType) ? preferredType : allowedTypes[0];

  const [name, setName] = useState("");
  const [mcqs, setMcqs] = useState<MCQDraft[]>([blankMCQ()]);
  const [codingTasks, setCodingTasks] = useState<CodingDraft[]>([blankCoding()]);
  const [openEnded, setOpenEnded] = useState<OpenEndedDraft[]>([blankOpenEnded()]);
  const [staged, setStaged] = useState<AssessmentSectionInput[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setMcqs([blankMCQ()]);
    setCodingTasks([blankCoding()]);
    setOpenEnded([blankOpenEnded()]);
  };

  const resetAll = () => {
    setPreferredType(allowedTypes[0]);
    setStaged([]);
    resetForm();
  };

  const isFormBlank = () =>
    !name.trim() &&
    mcqs.every(m => !m.question.trim() && m.options.every(o => !o.trim())) &&
    codingTasks.every(t => !t.title.trim() && !t.description.trim() && !t.constraints.trim()) &&
    openEnded.every(q => !q.question.trim() && !q.grading_guidance.trim());

  /** Turns the currently-open form into an API payload, or reports what's
   * still missing. */
  const buildPayload = (): { payload?: AssessmentSectionInput; error?: string } => {
    if (!name.trim()) return { error: "Give this section a name." };

    if (type === "MCQ") {
      const cleaned = mcqs.filter(m => m.question.trim() && m.options.every(o => o.trim()));
      if (!cleaned.length) return { error: "Add at least one complete MCQ question." };
      return {
        payload: {
          name: name.trim(),
          type,
          mcq_questions: cleaned.map(m => ({
            question: m.question,
            options: m.options.map((value, i) => ({ value, index: i + 1 })),
            correct_option_index: m.correct_option_index,
          })),
        },
      };
    }

    if (type === "CODING_TASK") {
      const cleaned = codingTasks.filter(t => t.title.trim() && t.description.trim());
      if (!cleaned.length) return { error: "Add at least one complete coding task." };
      return {
        payload: {
          name: name.trim(),
          type,
          coding_tasks: cleaned.map(t => ({
            title: t.title,
            description: t.description,
            difficulty_level: t.difficulty_level,
            constraints: t.constraints || undefined,
          })),
        },
      };
    }

    const cleaned = openEnded.filter(q => q.question.trim());
    if (!cleaned.length) return { error: "Add at least one open-ended question." };
    return {
      payload: {
        name: name.trim(),
        type,
        open_ended_questions: cleaned.map(q => ({
          question: q.question,
          grading_guidance: q.grading_guidance || undefined,
        })),
      },
    };
  };

  const handleStageAnother = () => {
    const { payload, error } = buildPayload();
    if (!payload) {
      setAlert({ title: "Error", message: error, icon: "error" });
      return;
    }
    setStaged(current => [...current, payload]);
    resetForm();
  };

  const handleSubmit = async () => {
    // The open form counts as a section unless it was left untouched after
    // staging -- so "Add another section" then "Save" doesn't silently drop
    // whatever is still on screen.
    let payloads = [...staged];
    if (!isFormBlank() || staged.length === 0) {
      const { payload, error } = buildPayload();
      if (!payload) {
        setAlert({ title: "Error", message: error, icon: "error" });
        return;
      }
      payloads = [...payloads, payload];
    }

    // add-sections only accepts more than one section per request for hybrid
    // assessments ("Multiple sections are only available for custom skill
    // assessments"); single-type assessments get one request per section so
    // staging several in one sitting still works.
    const batches =
      assessmentType === "MIXED" ? [payloads] : payloads.map(payload => [payload]);

    setSubmitting(true);
    let saved = 0;
    let failure: string | null = null;
    for (const batch of batches) {
      const res = await addSectionsToAssessment(assessmentId, batch);
      if (!res.success) {
        failure = res.error;
        break;
      }
      saved += batch.length;
    }
    setSubmitting(false);

    if (saved) onAdded();

    if (failure) {
      // Drop whatever made it through so a retry doesn't duplicate sections.
      setStaged(payloads.slice(saved));
      resetForm();
      setAlert({ title: "Error", message: failure, icon: "error" });
      return;
    }

    resetAll();
    onClose();
  };

  return (
    <SidePanel
      id='custom-section-panel'
      open={open}
      onClose={onClose}
      title='Create Custom Test'
      description='Build a section by hand -- pick a type, add your questions, and save. Stage several sections before saving if you need more than one.'
      footer={
        <div className='flex flex-col sm:flex-row gap-3'>
          <Button
            type='button'
            color='primary'
            variant='outline'
            className='gap-1 sm:w-auto'
            disabled={submitting}
            onClick={handleStageAnother}
          >
            <LuPlus /> Add another section
          </Button>
          <Button
            type='button'
            color='primary'
            className='text-white flex-1'
            loading={submitting}
            onClick={handleSubmit}
          >
            {(() => {
              const pending = staged.length + (staged.length && isFormBlank() ? 0 : 1);
              return pending > 1 ? `Save ${pending} sections` : "Save section";
            })()}
          </Button>
        </div>
      }
    >
      {staged.length > 0 && (
        <div className='mb-6 border border-[#EAECF0] rounded-lg p-4'>
          <p className='text-sm font-semibold text-primaryBlack mb-3 flex items-center gap-2'>
            <LuLayers /> Staged sections ({staged.length})
          </p>
          <div className='space-y-2'>
            {staged.map((section, index) => (
              <div
                key={`${section.name}-${index}`}
                className='flex items-center justify-between gap-3 bg-[#F8FAFC] rounded-lg px-3 py-2'
              >
                <div className='min-w-0'>
                  <p className='text-sm font-medium text-primaryBlack truncate'>{section.name}</p>
                  <p className='text-xs text-[#9DA3A8]'>
                    {sectionTypeLabels[section.type]} -- {questionCountOf(section)} question
                    {questionCountOf(section) === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  type='button'
                  aria-label={`Remove staged section ${section.name}`}
                  className='text-error shrink-0'
                  onClick={() => setStaged(current => current.filter((_, i) => i !== index))}
                >
                  <LuTrash2 />
                </button>
              </div>
            ))}
          </div>
          <p className='text-xs text-[#9DA3A8] mt-3'>
            These are saved together when you hit save -- nothing has been sent yet.
          </p>
        </div>
      )}

      {typeIsLocked ? (
        <div className='mb-5 rounded-lg border border-[#EAECF0] bg-[#F8FAFC] px-4 py-3'>
          <p className='text-sm font-medium text-primaryBlack'>
            Section type: {sectionTypeLabels[allowedTypes[0]]}
          </p>
          <p className='text-xs text-[#9DA3A8] mt-1'>
            Locked to this assessment&apos;s type. Pick &quot;Hybrid (mix of types)&quot; on step 1
            to combine section types.
          </p>
        </div>
      ) : (
        <div className='flex gap-2 mb-5'>
          {allowedTypes.map(t => (
            <button
              key={t}
              type='button'
              onClick={() => setPreferredType(t)}
              className={cn(
                "flex-1 border rounded-lg px-3 py-2 text-sm font-medium border-[#EAECF0]",
                type === t ? "bg-primary text-white border-primary" : "text-[#344054]"
              )}
            >
              {sectionTypeLabels[t]}
            </button>
          ))}
        </div>
      )}

      <label className='block text-sm font-medium text-[#344054] mb-1'>Section name</label>
      <input
        className='input input-bordered w-full mb-5'
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={`e.g. ${sectionTypeLabels[type]} Round`}
      />

      {type === "MCQ" && (
        <div className='space-y-6'>
          {mcqs.map((mcq, mi) => (
            <div key={mi} className='border border-[#EAECF0] rounded-lg p-4 relative'>
              {mcqs.length > 1 && (
                <button
                  type='button'
                  className='absolute top-3 right-3 text-error'
                  onClick={() => setMcqs(mcqs.filter((_, i) => i !== mi))}
                >
                  <LuTrash2 />
                </button>
              )}
              <label className='block text-xs font-medium text-[#6C757D] mb-1'>Question {mi + 1}</label>
              <textarea
                className='textarea textarea-bordered w-full mb-3'
                value={mcq.question}
                onChange={e => {
                  const next = [...mcqs];
                  next[mi] = { ...mcq, question: e.target.value };
                  setMcqs(next);
                }}
                placeholder='Question text'
              />
              <div className='space-y-2'>
                {mcq.options.map((opt, oi) => (
                  <div key={oi} className='flex items-center gap-2'>
                    <input
                      type='radio'
                      className='radio radio-primary radio-sm'
                      checked={mcq.correct_option_index === oi + 1}
                      onChange={() => {
                        const next = [...mcqs];
                        next[mi] = { ...mcq, correct_option_index: oi + 1 };
                        setMcqs(next);
                      }}
                    />
                    <input
                      className='input input-bordered input-sm w-full'
                      value={opt}
                      onChange={e => {
                        const next = [...mcqs];
                        const options = [...mcq.options];
                        options[oi] = e.target.value;
                        next[mi] = { ...mcq, options };
                        setMcqs(next);
                      }}
                      placeholder={`Option ${oi + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button
            type='button'
            className='flex items-center gap-1 text-primary text-sm font-medium'
            onClick={() => setMcqs([...mcqs, blankMCQ()])}
          >
            <LuPlus /> Add another question
          </button>
        </div>
      )}

      {type === "CODING_TASK" && (
        <div className='space-y-6'>
          {codingTasks.map((task, ti) => (
            <div key={ti} className='border border-[#EAECF0] rounded-lg p-4 relative space-y-3'>
              {codingTasks.length > 1 && (
                <button
                  type='button'
                  className='absolute top-3 right-3 text-error'
                  onClick={() => setCodingTasks(codingTasks.filter((_, i) => i !== ti))}
                >
                  <LuTrash2 />
                </button>
              )}
              <input
                className='input input-bordered w-full'
                value={task.title}
                onChange={e => {
                  const next = [...codingTasks];
                  next[ti] = { ...task, title: e.target.value };
                  setCodingTasks(next);
                }}
                placeholder='Task title'
              />
              <textarea
                className='textarea textarea-bordered w-full'
                value={task.description}
                onChange={e => {
                  const next = [...codingTasks];
                  next[ti] = { ...task, description: e.target.value };
                  setCodingTasks(next);
                }}
                placeholder='Problem statement'
              />
              <select
                className='select select-bordered w-full'
                value={task.difficulty_level}
                onChange={e => {
                  const next = [...codingTasks];
                  next[ti] = { ...task, difficulty_level: e.target.value };
                  setCodingTasks(next);
                }}
              >
                <option value='JUNIOR'>Junior</option>
                <option value='INTERMEDIATE'>Intermediate</option>
                <option value='SENIOR'>Senior</option>
              </select>
              <textarea
                className='textarea textarea-bordered w-full'
                value={task.constraints}
                onChange={e => {
                  const next = [...codingTasks];
                  next[ti] = { ...task, constraints: e.target.value };
                  setCodingTasks(next);
                }}
                placeholder='Constraints / function signature (optional)'
              />
            </div>
          ))}
          <button
            type='button'
            className='flex items-center gap-1 text-primary text-sm font-medium'
            onClick={() => setCodingTasks([...codingTasks, blankCoding()])}
          >
            <LuPlus /> Add another task
          </button>
        </div>
      )}

      {type === "OPEN_ENDED" && (
        <div className='space-y-6'>
          {openEnded.map((q, qi) => (
            <div key={qi} className='border border-[#EAECF0] rounded-lg p-4 relative space-y-3'>
              {openEnded.length > 1 && (
                <button
                  type='button'
                  className='absolute top-3 right-3 text-error'
                  onClick={() => setOpenEnded(openEnded.filter((_, i) => i !== qi))}
                >
                  <LuTrash2 />
                </button>
              )}
              <textarea
                className='textarea textarea-bordered w-full'
                value={q.question}
                onChange={e => {
                  const next = [...openEnded];
                  next[qi] = { ...q, question: e.target.value };
                  setOpenEnded(next);
                }}
                placeholder='Question the candidate will answer'
              />
              <textarea
                className='textarea textarea-bordered w-full'
                value={q.grading_guidance}
                onChange={e => {
                  const next = [...openEnded];
                  next[qi] = { ...q, grading_guidance: e.target.value };
                  setOpenEnded(next);
                }}
                placeholder='Grading guidance for the recruiter/AI (optional)'
              />
            </div>
          ))}
          <button
            type='button'
            className='flex items-center gap-1 text-primary text-sm font-medium'
            onClick={() => setOpenEnded([...openEnded, blankOpenEnded()])}
          >
            <LuPlus /> Add another question
          </button>
        </div>
      )}
    </SidePanel>
  );
};

export default CustomSectionModal;
