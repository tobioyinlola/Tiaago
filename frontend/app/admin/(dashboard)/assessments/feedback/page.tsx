import Link from "next/link";
import { ChevronLeft, Star } from "lucide-react";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getAdminAssessmentFeedback } from "@/app/common/services/assessment";
import { handleServerApiCallError, cn } from "@/app/common/utils";
import DataTable, { DataTableColumn } from "@/app/common/components/dashboard/DataTable";
import ServerPagination from "@/app/common/components/ServerPagination";
import { AssessmentFeedbackEntry } from "@/app/common/types";

export const metadata = {
  title: "Assessment Feedback",
};

type Props = {
  searchParams: Promise<{ rating?: string; page?: string }>;
};

const RatingStars = ({ rating }: { rating: number | null }) => {
  if (!rating) return <span className='text-muted-foreground'>—</span>;
  return (
    <div className='flex items-center gap-0.5 justify-center' aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "w-3.5 h-3.5",
            i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
};

const AssessmentFeedbackPage = async ({ searchParams }: Props) => {
  const { rating, page } = await searchParams;
  const errors: DisplayErrorMessagesProps["errors"] = [];

  const feedbackPage = await getAdminAssessmentFeedback({ rating, page }).catch(async e => {
    const error = await handleServerApiCallError(e);
    errors.push({ title: "Error getting assessment feedback", message: error });
    return { results: [], current: 1, count: 0, next: null, previous: null };
  });

  const columns: DataTableColumn<AssessmentFeedbackEntry>[] = [
    {
      key: "candidate",
      header: "Candidate",
      className: "text-left",
      render: r => (
        <div className='text-left'>
          <p className='font-medium'>{r.candidate_name || "Unknown candidate"}</p>
          <p className='text-muted-foreground text-xs'>{r.candidate_email}</p>
        </div>
      ),
    },
    {
      key: "assessment",
      header: "Assessment",
      className: "text-left",
      render: r => (
        <div className='text-left'>
          <p>{r.assessment_title || "—"}</p>
          {r.company_name && <p className='text-muted-foreground text-xs'>{r.company_name}</p>}
        </div>
      ),
    },
    { key: "rating", header: "Rating", render: r => <RatingStars rating={r.feedback_rating} /> },
    {
      key: "comment",
      header: "Comment",
      className: "text-left max-w-md",
      render: r => (r.feedback_comment ? r.feedback_comment : <span className='text-muted-foreground'>—</span>),
    },
    {
      key: "completed_at",
      header: "Completed",
      render: r => (r.completed_at ? new Date(r.completed_at).toLocaleDateString() : "—"),
    },
  ];

  const ratingFilters = ["5", "4", "3", "2", "1"];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-border pb-1 mb-6'>
        <Link
          href='/admin/assessments'
          className='flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit'
        >
          <ChevronLeft className='w-4 h-4' />
          Back to Assessment Intelligence
        </Link>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk mt-1'>Assessment Feedback</h1>
        <h4 className='text-foreground text-sm md:text-base'>
          Star ratings and comments candidates left after completing an assessment.
        </h4>
      </div>

      <div className='flex items-center gap-2 mb-4'>
        <Link
          href='/admin/assessments/feedback'
          className={cn("btn btn-sm", !rating ? "btn-primary text-white" : "btn-outline")}
        >
          All
        </Link>
        {ratingFilters.map(r => (
          <Link
            key={r}
            href={{ pathname: "/admin/assessments/feedback", query: { rating: r } }}
            className={cn("btn btn-sm gap-1", rating === r ? "btn-primary text-white" : "btn-outline")}
          >
            {r} <Star className='w-3 h-3' />
          </Link>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={feedbackPage.results}
        rowKey={r => r.id}
        emptyText='No feedback yet'
        emptySubText='Candidate ratings and comments will show up here once submitted.'
      />
      <ServerPagination pagedResource={feedbackPage} searchParams={{ rating }} />
    </>
  );
};

export default AssessmentFeedbackPage;
