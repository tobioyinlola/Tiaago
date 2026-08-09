"use client";
import { toast } from "sonner";
import { PiDotsThreeBold } from "react-icons/pi";
import { PropsWithChildren, useEffect, useRef, useState } from "react";

import EmptyState, {
  EmptyStateV3,
} from "@/app/common/components/dashboard/EmptyState";

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
import AIFeedbackModal from "./AIFeedbackModal";
import { IntegrityScoreBadge, ProctoringViolationFlag } from "@/app/common/components/dashboard/ProctoringBadges";
import SearchBar from "@/app/common/components/SearchBar";
import TalentApplicationCard from "./TalentApplicationCard";
import ScrollArea from "@/app/common/components/ScrollArea";
import ProfileModal from "@/app/common/components/ProfileModal";
import { cn, handlePlural } from "@/app/common/utils";
import { jobApplicationMenuItems } from "./jobApplicationMenuItems";
import { AvatarWithVerifiedBadge } from "@/app/common/components/UserAvatar";
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
  stageCounts?: Record<string, number>;
  // roles: TalentRole[];
}>;

export const JobApplicationsTable = ({
  data,
  className,
  stageCounts,
  // roles,
}: JobApplicationsTableProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeApplicant, setActiveApplicant] = useState<AiFeedbackItem>(
    data[0]
  );
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
  // const profileModalRef = useRef<HTMLDialogElement>(null);

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
  const handleClick = (
    action: (typeof jobApplicationMenuItems)[number]["label"],
    item: AiFeedbackItem
  ) => {
    setActiveApplicant(item);
    switch (action) {
      case "View detailed report":
        setIsModalOpen(true);
        break;
      // case "View profile":
      //   profileModalRef.current?.showModal();
      //   break;
      case "Add to Pipeline":
        setPipelineTarget(item);
        break;
      default:
        toast.info("Coming soon...");
        break;
    }
  };
  return (
    <>
      <ScrollArea
        className={cn(
          "dashboard-content-constraint pb-1 bg-transparent",
          className
        )}
      >
        <div className='h-24' />
        <div className='w-full rounded-t-xl pl-6 pr-2 h-20 border border-[#F5F5F5] bg-[#EBECEE] flex items-center justify-between'>
          <h2 className='text-base md:text-lg font-semibold text-[#343A40]'>
            {data.length} Job {handlePlural(data.length, "Applicant")}
          </h2>
          {!!stageCounts && (
            <div className='flex items-center gap-2 flex-wrap max-sm:hidden'>
              {Object.entries(stageCounts)
                .filter(([, count]) => count > 0)
                .map(([statusValue, count]) => (
                  <span
                    key={statusValue}
                    className={cn(
                      "rounded-2xl px-2.5 py-1 text-xs font-medium whitespace-nowrap",
                      STATUS_BADGE_STYLES[statusValue] ||
                        "bg-[#F5F5F5] text-[#667085]"
                    )}
                  >
                    {STATUS_LABELS[statusValue] || statusValue}: {count}
                  </span>
                ))}
            </div>
          )}
        </div>
        <table className='table table-zebra border border-t-0 rounded-b-lg'>
          {/* head */}
          <thead>
            <tr>
              <th>Talents</th>
              <th className='max-sm:hidden'>Role</th>
              <th className='max-sm:hidden'>Resume Analysis Score</th>
              <th>Assessment Score</th>
              {/* <th>Pre-screening Score</th> */}
              <th>AI Interview Score</th>
              <th>Overall Score</th>
              <th className='max-sm:hidden'>Proctoring</th>
              <th>Stage</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.length ? (
              data.map((feedback, i) => (
                <tr key={feedback.application_id}>
                  <td className='flex items-center gap-2'>
                    <AvatarWithVerifiedBadge
                      profilePic={feedback.profile_picture}
                      firstName={feedback.talent_name?.split(" ")[0] || ""}
                      lastName={feedback.talent_name?.split(" ")[1] || ""}
                      className='w-10'
                      verified={feedback.has_passed_tiaago_assessment}
                    />
                    <div className='font-medium'>
                      <h6 className='text-[#101828] capitalize'>
                        {feedback.talent_name}
                      </h6>
                      <p className='text-[#667085]'>{feedback.email}</p>
                    </div>
                  </td>
                  <td className='max-sm:hidden text-[#2E2E2E] capitalize'>
                    {feedback.role}
                  </td>
                  <td className='max-sm:hidden'>
                    <div className='relative h-4 w-32 sm:w-56'>
                      <progress
                        className='progress [&::-moz-progress-bar]:bg-[#4AB4FF] [&::-webkit-progress-value]:bg-[#4AB4FF] h-4 bg-transparent z-[2] rounded-[4px] [&::-webkit-progress-value]:rounded-[4px] [&::-moz-progress-bar]:rounded-[4px]'
                        value={(feedback.resume_analysis_score / 100) * 100}
                        max={100}
                      />
                      <progress
                        className='progress bg-[#4AB4FF1A] rounded-[4px] h-4 absolute left-0 top-0 z-[1]'
                        value={0}
                        max={100}
                      />
                      <p
                        className={cn(
                          "absolute top-0 left-0 text-white text-xs text-center font-medium z-[3] pr-1.5",
                          feedback.resume_analysis_score <= 10 &&
                            "text-[#FF0000]"
                        )}
                        style={{
                          width: `${
                            (feedback.resume_analysis_score / 100) * 100
                          }%`,
                        }}
                      >
                        {feedback.resume_analysis_score}/{100}
                      </p>
                    </div>
                  </td>
                  <td>
                    <div className='relative h-4 w-32 sm:w-56'>
                      <progress
                        className='progress [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-value]:bg-primary h-4 bg-transparent z-[2] rounded-[4px] [&::-webkit-progress-value]:rounded-[4px] [&::-moz-progress-bar]:rounded-[4px]'
                        value={(feedback.assessment_score / 100) * 100}
                        max={100}
                      />
                      <progress
                        className='progress bg-[#5374E71A] rounded-[4px] h-4 absolute left-0 top-0 z-[1]'
                        value={0}
                        max={100}
                      />
                      <p
                        className={cn(
                          "absolute top-0 left-0 text-white text-xs font-medium z-[3] text-center pr-1.5",
                          feedback.assessment_score <= 10 && "text-[#FF0000]"
                        )}
                        style={{
                          width: `${(feedback.assessment_score / 100) * 100}%`,
                        }}
                      >
                        {feedback.assessment_score}/{100}
                      </p>
                    </div>
                  </td>
                  <td>
                    {feedback.ai_interview_score == null ? (
                      <p className='text-[#98A2B3] text-xs text-center'>—</p>
                    ) : (
                      <div className='relative h-4 w-32 sm:w-56'>
                        <progress
                          className='progress [&::-moz-progress-bar]:bg-[#7C5CFC] [&::-webkit-progress-value]:bg-[#7C5CFC] h-4 bg-transparent z-[2] rounded-[4px] [&::-webkit-progress-value]:rounded-[4px] [&::-moz-progress-bar]:rounded-[4px]'
                          value={(feedback.ai_interview_score / 100) * 100}
                          max={100}
                        />
                        <progress
                          className='progress bg-[#7C5CFC1A] rounded-[4px] h-4 absolute left-0 top-0 z-[1]'
                          value={0}
                          max={100}
                        />
                        <p
                          className={cn(
                            "absolute top-0 left-0 text-white text-xs font-medium z-[3] text-center pr-1.5",
                            feedback.ai_interview_score <= 10 && "text-[#FF0000]"
                          )}
                          style={{
                            width: `${(feedback.ai_interview_score / 100) * 100}%`,
                          }}
                        >
                          {Math.round(feedback.ai_interview_score)}/{100}
                        </p>
                      </div>
                    )}
                  </td>
                  {/* <td>
                    <div className='relative h-4 w-56'>
                      <progress
                        className='progress [&::-moz-progress-bar]:bg-[#4AB4FF] [&::-webkit-progress-value]:bg-[#4AB4FF] h-4 bg-transparent z-[2] rounded-[4px] [&::-webkit-progress-value]:rounded-[4px] [&::-moz-progress-bar]:rounded-[4px]'
                        value={(feedback.cultural_fitness_score / 100) * 100}
                        max={100}
                      />
                      <progress
                        className='progress bg-[#4AB4FF1A] rounded-[4px] h-4 absolute left-0 top-0 z-[1]'
                        value={0}
                        max={100}
                      />
                      <p
                        className={cn(
                          "absolute top-0 left-0 text-white text-xs font-medium z-[3] text-center pr-1.5",
                          feedback.cultural_fitness_score <= 10 &&
                            "text-[#FF0000]"
                        )}
                        style={{
                          width: `${
                            (feedback.cultural_fitness_score / 100) * 100
                          }%`,
                        }}
                      >
                        {feedback.cultural_fitness_score}/{100}
                      </p>
                    </div>
                  </td> */}
                  <td>
                    <div
                      className={cn(
                        "rounded-2xl bg-[#ECFDF3] px-2 py-0.5 text-center w-fit mx-auto",
                        feedback.overall_score < 70 && "bg-[#FFEDED]"
                      )}
                    >
                      <p
                        className={cn(
                          "text-[#027A48] text-xs font-medium",
                          feedback.overall_score < 70 && "!text-[#B53535]"
                        )}
                      >
                        {parseInt(feedback.overall_score.toString())}%
                      </p>
                    </div>
                  </td>
                  <td className='max-sm:hidden'>
                    <div className='flex items-center justify-center gap-1.5'>
                      <IntegrityScoreBadge
                        score={feedback.proctoring_integrity_score}
                        riskLevel={feedback.proctoring_risk_level}
                      />
                      <ProctoringViolationFlag show={feedback.proctoring_has_violation} />
                    </div>
                  </td>
                  <td>
                    <span
                      className={cn(
                        "rounded-2xl px-2.5 py-1 text-xs font-medium whitespace-nowrap",
                        STATUS_BADGE_STYLES[feedback.status] ||
                          "bg-[#F5F5F5] text-[#667085]"
                      )}
                    >
                      {feedback.status_label}
                    </span>
                  </td>
                  <td>
                    <div className='dropdown dropdown-hover dropdown-end dropdown-top'>
                      <div
                        tabIndex={0}
                        className='w-6 h-6 cursor-pointer'
                        aria-label='open menu'
                        role='button'
                      >
                        <PiDotsThreeBold className='text-2xl' />
                      </div>
                      <ul
                        tabIndex={0}
                        className='dropdown-content z-[2] menu shadow bg-base-100 rounded-lg w-max px-[2px] py-[18px]'
                      >
                        {jobApplicationMenuItems.map(({ label, Icon }) => {
                          return (
                            <li key={label}>
                              <a
                                className='flex items-center gap-6 text-[13px] font-medium text-[#7F7F7F] hover:text-[#292D32] fill-[#7F7F7F] hover:fill-[#292D32] hover:bg-[#D9DDFF66] px-4 py-2 min-w-[190px]'
                                onClick={() => handleClick(label, feedback)}
                              >
                                <Icon className='text-2xl' />
                                {label}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9}>
                  <EmptyStateV3 text='No applications yet' />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
      {!!activeApplicant && (
        <>
          {/* <ProfileModalWithAiFeedback
            modalRef={profileModalRef}
            aiFeedback={activeApplicant}
            roles={roles}
          /> */}
          <AIFeedbackModal
            aiFeedback={activeApplicant}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
          />
        </>
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
