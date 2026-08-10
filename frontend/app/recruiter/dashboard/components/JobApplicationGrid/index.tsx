"use client";
import { toast } from "sonner";
import { PropsWithChildren, useEffect, useRef, useState } from "react";

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
import ApplicationCard from "./ApplicationCard";
import SearchBar from "@/app/common/components/SearchBar";
import TalentApplicationCard from "./TalentApplicationCard";
import ScrollArea from "@/app/common/components/ScrollArea";
import ProfileModal from "@/app/common/components/ProfileModal";
import { cn, handlePlural } from "@/app/common/utils";
import { Button } from "@/app/common/components/ui/button";
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
// display copy/ordering, not business logic. Order matches the enum's
// declaration order, which is also the order stage_counts keys arrive in.
const STATUS_LABELS: Record<string, string> = {
  APPLIED: "Applied",
  REVIEWED: "Reviewed",
  INTERVIEW_SCHEDULED: "Interview scheduled",
  PENDING_DECISION: "Pending decision",
  OFFER_EXTENDED: "Offer extended",
  OFFER_ACCEPTED: "Offer accepted",
  OFFER_DECLINED: "Offer declined",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  APPLIED: "bg-[#EFF4FF] text-[#3538CD]",
  REVIEWED: "bg-[#EEF4FF] text-[#3580B5]",
  INTERVIEW_SCHEDULED: "bg-[#F4F3FF] text-[#5925DC]",
  PENDING_DECISION: "bg-[#FFFAEB] text-[#B54708]",
  OFFER_EXTENDED: "bg-[#ECFDF3] text-[#027A48]",
  OFFER_ACCEPTED: "bg-[#ECFDF3] text-[#027A48]",
  OFFER_DECLINED: "bg-[#FFEDED] text-[#B53535]",
  REJECTED: "bg-[#FFEDED] text-[#B53535]",
  WITHDRAWN: "bg-[#F5F5F5] text-[#667085]",
};

// The board's columns. REJECTED/WITHDRAWN/OFFER_DECLINED are grouped into a
// single "Not Proceeding" column -- a display-only grouping (each card still
// carries its real individual status) so 3 terminal-negative outcomes don't
// eat as much column space as the 6 stages recruiters actively work.
const BOARD_COLUMNS: { key: string; label: string; statuses: string[] }[] = [
  { key: "APPLIED", label: "Applied", statuses: ["APPLIED"] },
  { key: "REVIEWED", label: "Reviewed", statuses: ["REVIEWED"] },
  { key: "PENDING_DECISION", label: "Pending Decision", statuses: ["PENDING_DECISION"] },
  { key: "INTERVIEW_SCHEDULED", label: "Interview Scheduled", statuses: ["INTERVIEW_SCHEDULED"] },
  { key: "OFFER_EXTENDED", label: "Offer Extended", statuses: ["OFFER_EXTENDED"] },
  { key: "OFFER_ACCEPTED", label: "Offer Accepted", statuses: ["OFFER_ACCEPTED"] },
  { key: "NOT_PROCEEDING", label: "Not Proceeding", statuses: ["REJECTED", "WITHDRAWN", "OFFER_DECLINED"] },
];

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
  // roles: TalentRole[];
}>;

export const JobApplicationsTable = ({
  data,
  className,
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
    newStatus: JobApplication["status"]
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
    const res = await updateJobApplicationStatus(item.application_id, newStatus);
    setMovingId(null);
    if (!res.success) {
      toast.error(res.error);
      setApplications(prev =>
        prev.map(a => (a.application_id === item.application_id ? previous : a))
      );
      return;
    }
    if (newStatus === "REVIEWED") {
      toast.success("Moved to Reviewed", { description: "Assessment invite sent to the candidate." });
    } else if (newStatus === "PENDING_DECISION") {
      toast.success("Moved to Pending Decision", { description: "Interview invite sent to the candidate." });
    } else {
      toast.success(`Moved to ${STATUS_LABELS[newStatus] || newStatus}`);
    }
  };

  const handleView = (item: AiFeedbackItem) => {
    setActiveApplicant(item);
    setIsModalOpen(true);
  };

  const handleAddToPipelineClick = (item: AiFeedbackItem) => {
    setActiveApplicant(item);
    setPipelineTarget(item);
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
          <ScrollArea className='border border-t-0 rounded-b-lg bg-[#FAFAFB]' horizontalScrollClassName='mt-1'>
            <div className='flex items-start gap-4 p-4' style={{ minWidth: "max-content" }}>
              {BOARD_COLUMNS.map(column => {
                const items = applications.filter(a => column.statuses.includes(a.status));
                return (
                  <div key={column.key} className='w-[300px] shrink-0 flex flex-col gap-3'>
                    <div className='flex items-center justify-between px-1'>
                      <span
                        className={cn(
                          "rounded-2xl px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
                          STATUS_BADGE_STYLES[column.statuses[0]] || "bg-[#F5F5F5] text-[#667085]"
                        )}
                      >
                        {column.label}
                      </span>
                      <span className='text-xs text-[#667085] font-medium'>{items.length}</span>
                    </div>
                    <div className='flex flex-col gap-3 min-h-[80px]'>
                      {items.length ? (
                        items.map(item => (
                          <ApplicationCard
                            key={item.application_id}
                            item={item}
                            onView={() => handleView(item)}
                            onAddToPipeline={() => handleAddToPipelineClick(item)}
                            onMoveStage={status => handleMoveStage(item, status)}
                            moving={movingId === item.application_id}
                          />
                        ))
                      ) : (
                        <div className='rounded-xl border border-dashed border-[#EAECF0] p-4 text-center text-xs text-[#98A2B3]'>
                          No candidates in this stage
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
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
    </>
  );
};
