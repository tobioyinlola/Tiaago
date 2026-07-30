"use server";

import { ID, InterviewPreparation, PreparationQuestion } from "../types";
import { handleServerApiCallError } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";

/** Fetches the cached brief for `interviewId`, auto-triggering generation
 * server-side the first time (or after a prior FAILED attempt). Callers
 * poll this while generation_status is PENDING/GENERATING. Throws on
 * auth/network failure (404/403) -- the page should treat that as "brief
 * unavailable", not as a normal FAILED generation state. */
export const getInterviewPreparation = async (
  interviewId: ID
): Promise<InterviewPreparation> => {
  try {
    return await serverKyInstance
      .get(`schedulers/${interviewId}/preparation/`)
      .json<InterviewPreparation>();
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getInterviewPreparation Error: ", errMsg);
    throw new Error(errMsg);
  }
};

/** Saves the full updated questions array -- every add/edit/delete/reorder
 * in the prep page sends the complete array back rather than a partial
 * patch. */
export const updateInterviewPreparationQuestions = async (
  interviewId: ID,
  questions: PreparationQuestion[]
): Promise<InterviewPreparation> => {
  try {
    return await serverKyInstance
      .patch(`schedulers/${interviewId}/preparation/`, {
        json: { questions },
      })
      .json<InterviewPreparation>();
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("updateInterviewPreparationQuestions Error: ", errMsg);
    throw new Error(errMsg);
  }
};

/** "Regenerate brief" -- always re-runs generation even if already READY. */
export const regenerateInterviewPreparation = async (
  interviewId: ID
): Promise<InterviewPreparation> => {
  try {
    return await serverKyInstance
      .post(`schedulers/${interviewId}/preparation/regenerate/`)
      .json<InterviewPreparation>();
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("regenerateInterviewPreparation Error: ", errMsg);
    throw new Error(errMsg);
  }
};
