import { redirect } from "next/navigation";

// Decisions now happen inline from the interviews list (see
// StatusNotesModal.tsx), not on a standalone page -- this route is kept
// only so any existing bookmarks/links to it land somewhere sensible.
const InterviewReviewPage = async () => {
  redirect("/recruiter/dashboard/interviews");
};

export default InterviewReviewPage;
