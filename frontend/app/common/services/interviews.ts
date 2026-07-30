"use server";
import {
  ID,
  RecruiterInterview,
  RecruiterInterviewTab,
  RecruiterInterviewsResponse,
} from "../types";
import { handleServerApiCallError } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";

export const getRecruiterInterviews = async (
  tab: RecruiterInterviewTab = "upcoming",
  page = 1,
  page_size = 20
) => {
  try {
    const data = await serverKyInstance
      .get<RecruiterInterviewsResponse>("schedulers/interviews/", {
        searchParams: { tab, page, page_size },
      })
      .json();
    return data;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getRecruiterInterviews Error: ", errMsg);
    throw Error(errMsg);
  }
};

/** Resolves a single interview for the workspace route. The interviews API is
 * list-only -- schedulers/<pk>/ is an UpdateAPIView and answers PUT/PATCH
 * only -- so the row is picked out of the tab listings instead. Tabs are
 * fetched in parallel and matched in priority order so an in-progress
 * interview reports as "live" rather than whichever tab answers first.
 * Replace this with a real retrieve endpoint when the full live workspace
 * (with its AI copilot payload) lands. */
export const getRecruiterInterview = async (
  id: ID
): Promise<(RecruiterInterview & { tab: RecruiterInterviewTab }) | null> => {
  const tabs: RecruiterInterviewTab[] = [
    "live",
    "upcoming",
    "needs_review",
    "completed",
  ];
  const responses = await Promise.all(
    tabs.map(tab => getRecruiterInterviews(tab, 1, 200).catch(() => null))
  );

  for (let i = 0; i < tabs.length; i++) {
    const match = responses[i]?.results.find(
      interview => String(interview.id) === String(id)
    );
    if (match) return { ...match, tab: tabs[i] };
  }
  return null;
};
