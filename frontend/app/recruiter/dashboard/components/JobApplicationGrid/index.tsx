"use client";
import { toast } from "sonner";
import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

import EmptyState from "@/app/common/components/dashboard/EmptyState";

import {
  AiFeedbackItem,
  ID,
  JobApplication,
  PipelineCategory,
  ServerCandidate,
  TalentRole,
  User,
} from "@/app/common/types";
import { addToPipeline, getCategories } from "@/app/common/services/sourcing";
import { updateJobApplicationStatus } from "@/app/common/services/jobs";
import AIFeedbackModal from "./AIFeedbackModal";
import BoardColumn from "./BoardColumn";
import SearchBar from "@/app/common/components/SearchBar";
import TalentApplicationCard from "./TalentApplicationCard";
import ProfileModal from "@/app/common/components/ProfileModal";
import { cn, handlePlural } from "@/app/common/utils";
import { Button } from "@/app/common/components/ui/button";
import { Textarea } from "@/app/common/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/common/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/common/components/ui/select";

// Mirrors JobApplication.JobApplicationStatus (backend/jobs/models.py) --
// kept here (rather than round-tripping through the API) since it's just
// display copy/ordering, not business logic.
const STATUS_LABELS: Record<string, string> = {
  APPLIED: "Applied",
  REVIEWED: "Skill Assessment",
  INTERVIEW_SCHEDULED: "Interview scheduled",
  PENDING_DECISION: "Interview",
  OFFER_EXTENDED: "Offer extended",
  OFFER_ACCEPTED: "Offer accepted",
  OFFER_DECLINED: "Offer declined",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  APPLIED: "bg-[#EFF4FF] text-[#3538CD]",
  RESUME_SCREENING: "bg-[#FFFAEB] text-[#B54708]",
  REVIEWED: "bg-[#EEF4FF] text-[#3580B5]",
  INTERVIEW_SCHEDULED: "bg-[#F4F3FF] text-[#5925DC]",
  PENDING_DECISION: "bg-[#F4F3FF] text-[#5925DC]",
  OFFER_EXTENDED: "bg-[#ECFDF3] text-[#027A48]",
  OFFER_ACCEPTED: "bg-[#ECFDF3] text-[#027A48]",
  OFFER_DECLINED: "bg-[#FFEDED] text-[#B53535]",
  REJECTED: "bg-[#FFEDED] text-[#B53535]",
  WITHDRAWN: "bg-[#F5F5F5] text-[#667085]",
  CLOSED: "bg-[#F5F5F5] text-[#667085]",
};

type BoardColumnDef = { key: string; label: string; droppable: boolean };

// One column per real status (no more grouped pseudo-columns -- drag-and-drop
// needs an unambiguous 1:1 drop target), plus two derived, display-only
// columns: RESUME_SCREENING (status still APPLIED, but a
// ReportPAYGFlowStatus row exists -- see getColumnKey below) and CLOSED
// (the 3 talent-only outcomes grouped, since a recruiter can never set any
// of them -- see MOVABLE_STATUSES in ApplicationCard.tsx). The AI/Human
// Interview column label is job-specific: a single job is only ever one or
// the other, never both.
const getBoardColumns = (aiInterviewEnabled: boolean): BoardColumnDef[] => [
  { key: "APPLIED", label: "Applied", droppable: false },
  { key: "RESUME_SCREENING", label: "Resume Screening", droppable: false },
  { key: "REVIEWED", label: "Skill Assessment", droppable: true },
  { key: "PENDING_DECISION", label: aiInterviewEnabled ? "AI Interview" : "Human Interview", droppable: true },
  { key: "INTERVIEW_SCHEDULED", label: "Interview Scheduled", droppable: true },
  { key: "OFFER_EXTENDED", label: "Offer Extended", droppable: true },
  { key: "REJECTED", label: "Rejected", droppable: true },
  { key: "CLOSED", label: "Closed", droppable: false },
];

const CLOSED_STATUSES = new Set(["OFFER_ACCEPTED", "OFFER_DECLINED", "WITHDRAWN"]);

const getColumnKey = (item: AiFeedbackItem): string => {
  if (item.status === "APPLIED") {
    const stillScreening = item.resume_screening_status === "started" || item.resume_screening_status === "failed";
    return stillScreening ? "RESUME_SCREENING" : "APPLIED";
  }
  if (CLOSED_STATUSES.has(item.status)) return "CLOSED";
  return item.status;
};

const PAGE_SIZE = 25;

// Sentinel Select value for "no category" -- category ids are numeric/string
// ids, so this can't collide with a real one.
const GENERAL_PIPELINE_VALUE = "__general__";

const className =
  "select select-sm select-bordered text-[#2E2E2E] font-medium join-item focus:outline-none";

const JobApplicationGrid = ({
  applications,
  currentUserType,
  canScheduleMeeting,
}: {
  applications: JobApplication[];
  currentUserType: User["user_type"];
  canScheduleMeeting: boolean;
}) => {
  const profileModalRef = useRef<HTMLDialogElement>(null);
  const [activeApplicant, setActiveApplicant] = useState<
    JobApplication["applicant"]
  >(applications[0]?.applicant);
  return (
    <>
      <div className='w-full pl-6 pr-2 py-[14px] bg-[#D9DDFF] mb-8 flex max-sm:flex-col sm:items-center gap-1 justify-between'>
        <SearchBar />
        <div className='border-l flex items-center join'>
          <select className={className} defaultValue=''>
            <option disabled value=''>
              Filter
            </option>
          </select>
          <select className={className} defaultValue=''>
            <option disabled value=''>
              From
            </option>
          </select>
          <select className={className} defaultValue=''>
            <option disabled value=''>
              To
            </option>
          </select>
        </div>
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 md:p-9 border rounded'>
        {applications.map(application => (
          <TalentApplicationCard
            key={application.id}
            application={application}
            onViewProfile={applicant => {
              setActiveApplicant(applicant);
              profileModalRef.current?.showModal();
            }}
          />
        ))}
        {!applications.length && (
          <div className='flex items-center justify-center col-span-3'>
            {/* <h4 className='text-[#667085] text-lg'>No applications yet</h4> */}
            <EmptyState text='No applications yet' />
          </div>
        )}
      </div>
      {!!activeApplicant && (
        <ProfileModal
          modalRef={profileModalRef}
          currentUserType={currentUserType}
          user={
            {
              ...activeApplicant,
              user_type: "T",
              first_name: activeApplicant.name.split(" ")[0],
              last_name: activeApplicant.name.split(" ")[1],
            } as any
          }
          disableScheduleMeeting={!canScheduleMeeting}
        />
      )}
    </>
  );
};

export default JobApplicationGrid;

const applicantToPipelineCandidate = (
  item: AiFeedbackItem,
  categoryId: ID | null
): ServerCandidate => ({
  name: item.talent_name,
  role: item.role,
  country: item.country || "",
  years_of_expr: 0,
  email: item.email,
  phone_number: item.phone_number || "",
  linkedin_profile: item.linkedin_url || "",
  summary: "",
  current_company: item.current_company || "",
  education: "",
  skills: [],
  experience: [],
  resume: item.resume || "",
  category: categoryId,
  application_id: item.application_id,
});

type JobApplicationsTableProps = PropsWithChildren<{
  data: AiFeedbackItem[];
  className?: string;
  aiInterviewEnabled?: boolean;
  // roles: TalentRole[];
}>;

export const JobApplicationsTable = ({
  data,
  className,
  aiInterviewEnabled = false,
}: JobApplicationsTableProps) => {
  const [applications, setApplications] = useState<AiFeedbackItem[]>(data);
  useEffect(() => {
    setApplications(data);
  }, [data]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeApplicant, setActiveApplicant] = useState<AiFeedbackItem>(
    data[0]
  );
  const [movingId, setMovingId] = useState<AiFeedbackItem["application_id"] | null>(null);
  const [addingToPipelineId, setAddingToPipelineId] = useState<
    AiFeedbackItem["application_id"] | null
  >(null);
  const [pipelineTarget, setPipelineTarget] = useState<AiFeedbackItem | null>(
    null
  );
  const [categories, setCategories] = useState<PipelineCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    GENERAL_PIPELINE_VALUE
  );

  // REJECTED requires a reason (see jobs.views.JobApplicationRetrieveUpdateView.put)
  // -- both the drag-drop path and the card's "Move to..." select route
  // through this dialog before committing.
  const [rejectionTarget, setRejectionTarget] = useState<AiFeedbackItem | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});
  // Every column is collapsible at every breakpoint. Starts with only
  // non-empty columns expanded so a candidate-heavy stage isn't buried
  // behind a click, while empty stages don't waste vertical space.
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(
    () => new Set(getBoardColumns(aiInterviewEnabled).filter(c => data.some(a => getColumnKey(a) === c.key)).map(c => c.key))
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const columns = getBoardColumns(aiInterviewEnabled);

  const toggleColumn = (key: string) => {
    setExpandedColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    if (!pipelineTarget) return;
    // react-hooks/set-state-in-effect forbids setState as a direct
    // synchronous statement in an effect body -- defer to a microtask so
    // the update happens inside a callback instead (fires before the fetch
    // below can possibly resolve, so no visible behavior change).
    queueMicrotask(() => setCategoriesLoading(true));
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoading(false));
  }, [pipelineTarget]);

  const handleAddToPipeline = async (
    item: AiFeedbackItem,
    categoryId: ID | null
  ) => {
    if (addingToPipelineId != null) return;
    setAddingToPipelineId(item.application_id);
    toast.loading("Adding to pipeline...");
    const res = await addToPipeline(
      applicantToPipelineCandidate(item, categoryId)
    );
    toast.dismiss();
    if (res.success) {
      toast.success("Added to Pipeline", {
        description: `${item.talent_name} has been added to your pipeline.`,
      });
    } else {
      toast.error(res.error);
    }
    setAddingToPipelineId(null);
  };
  const handleConfirmAddToPipeline = () => {
    if (!pipelineTarget) return;
    const categoryId =
      selectedCategory === GENERAL_PIPELINE_VALUE ? null : selectedCategory;
    handleAddToPipeline(pipelineTarget, categoryId);
    setPipelineTarget(null);
    setSelectedCategory(GENERAL_PIPELINE_VALUE);
  };

  const handleMoveStage = async (
    item: AiFeedbackItem,
    newStatus: JobApplication["status"],
    reason?: string
  ) => {
    if (newStatus === item.status || movingId != null) return;
    const previous = item;
    setMovingId(item.application_id);
    setApplications(prev =>
      prev.map(a =>
        a.application_id === item.application_id
          ? { ...a, status: newStatus, status_label: STATUS_LABELS[newStatus] || newStatus }
          : a
      )
    );
    const res = await updateJobApplicationStatus(item.application_id, newStatus, reason);
    setMovingId(null);
    if (!res.success) {
      toast.error(res.error);
      setApplications(prev =>
        prev.map(a => (a.application_id === item.application_id ? previous : a))
      );
      return;
    }
    if (newStatus === "REVIEWED") {
      toast.success("Moved to Skill Assessment", { description: "Assessment invite sent to the candidate." });
    } else if (newStatus === "PENDING_DECISION") {
      toast.success("Moved to Interview", { description: "Interview invite sent to the candidate." });
    } else if (newStatus === "REJECTED") {
      toast.success("Candidate rejected", { description: "Rejection email sent to the candidate." });
    } else {
      toast.success(`Moved to ${STATUS_LABELS[newStatus] || newStatus}`);
    }
  };

  // Shared by the drag-drop end handler and each card's "Move to..." select
  // -- REJECTED always routes through the reason dialog first, everything
  // else commits immediately.
  const requestMoveStage = (item: AiFeedbackItem, newStatus: JobApplication["status"]) => {
    if (newStatus === item.status) return;
    if (newStatus === "REJECTED") {
      setRejectionTarget(item);
      setRejectionReasonText("");
      return;
    }
    handleMoveStage(item, newStatus);
  };

  const handleConfirmReject = async () => {
    if (!rejectionTarget || !rejectionReasonText.trim()) return;
    setRejecting(true);
    await handleMoveStage(rejectionTarget, "REJECTED", rejectionReasonText.trim());
    setRejecting(false);
    setRejectionTarget(null);
    setRejectionReasonText("");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (overId == null) return;
    const targetColumn = columns.find(c => c.key === overId);
    const item = event.active.data.current?.item as AiFeedbackItem | undefined;
    if (!targetColumn || !targetColumn.droppable || !item) return;
    requestMoveStage(item, targetColumn.key as JobApplication["status"]);
  };

  const handleView = (item: AiFeedbackItem) => {
    setActiveApplicant(item);
    setIsModalOpen(true);
  };

  const handleAddToPipelineClick = (item: AiFeedbackItem) => {
    setActiveApplicant(item);
    setPipelineTarget(item);
  };

  const showMore = (key: string) => {
    setVisibleCounts(prev => ({ ...prev, [key]: (prev[key] ?? PAGE_SIZE) + PAGE_SIZE }));
  };

  return (
    <>
      <div className={cn("dashboard-content-constraint pb-1 bg-transparent", className)}>
        <div className='w-full rounded-t-xl pl-6 pr-2 h-20 border border-[#F5F5F5] bg-[#EBECEE] flex items-center'>
          <h2 className='text-base md:text-lg font-semibold text-[#343A40]'>
            {applications.length} Job {handlePlural(applications.length, "Applicant")}
          </h2>
        </div>
        {applications.length ? (
          <div className='border border-t-0 rounded-b-lg bg-[#FAFAFB] p-3 sm:p-4'>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              {/* Fluid grid: as many ~260px+ columns per row as fit the
                  viewport, wrapping to new rows instead of ever forcing a
                  fixed column count or horizontal scroll -- scales cleanly
                  from a single phone-width column up to all 8 stages
                  side-by-side on a wide monitor. */}
              <div className='grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] items-start gap-3 sm:gap-4'>
                {columns.map(column => {
                  const items = applications.filter(a => getColumnKey(a) === column.key);
                  return (
                    <BoardColumn
                      key={column.key}
                      columnKey={column.key}
                      label={column.label}
                      badgeClassName={STATUS_BADGE_STYLES[column.key] || "bg-[#F5F5F5] text-[#667085]"}
                      droppable={column.droppable}
                      items={items}
                      visibleCount={visibleCounts[column.key] ?? PAGE_SIZE}
                      onShowMore={() => showMore(column.key)}
                      expanded={expandedColumns.has(column.key)}
                      onToggle={() => toggleColumn(column.key)}
                      movingId={movingId}
                      onView={handleView}
                      onAddToPipeline={handleAddToPipelineClick}
                      onMoveStage={requestMoveStage}
                    />
                  );
                })}
              </div>
            </DndContext>
          </div>
        ) : (
          <div className='border border-t-0 rounded-b-lg py-16'>
            <EmptyState text='No applications yet' />
          </div>
        )}
      </div>
      {!!activeApplicant && (
        <AIFeedbackModal
          aiFeedback={activeApplicant}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
      <Dialog
        open={!!pipelineTarget}
        onOpenChange={open => {
          if (!open) {
            setPipelineTarget(null);
            setSelectedCategory(GENERAL_PIPELINE_VALUE);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Pipeline</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-secondary-black'>
            Choose which pipeline to add{" "}
            <span className='font-medium'>{pipelineTarget?.talent_name}</span>{" "}
            to.
          </p>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Select a pipeline' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GENERAL_PIPELINE_VALUE}>
                General candidate pipeline
              </SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setPipelineTarget(null);
                setSelectedCategory(GENERAL_PIPELINE_VALUE);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={categoriesLoading || addingToPipelineId != null}
              onClick={handleConfirmAddToPipeline}
            >
              Add to Pipeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!rejectionTarget}
        onOpenChange={open => {
          if (!open) {
            setRejectionTarget(null);
            setRejectionReasonText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject candidate</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-secondary-black'>
            A reason is required so it can be included in the rejection email sent to{" "}
            <span className='font-medium'>{rejectionTarget?.talent_name}</span>.
          </p>
          <Textarea
            value={rejectionReasonText}
            onChange={e => setRejectionReasonText(e.target.value)}
            rows={4}
            placeholder='Why is this candidate being rejected?'
          />
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setRejectionTarget(null);
                setRejectionReasonText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant='destructive'
              disabled={!rejectionReasonText.trim() || rejecting}
              onClick={handleConfirmReject}
            >
              Reject candidate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
