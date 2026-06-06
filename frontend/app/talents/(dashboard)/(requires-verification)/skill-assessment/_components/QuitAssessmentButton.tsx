"use client";

import { useState } from "react";
import { Button } from "react-daisyui";
import { useRouter } from "next/navigation";

import { ID } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import { cn, handleFormSubmissionError } from "@/app/common/utils";
import { attemptQuestion } from "@/app/common/services/assessment";

type Props = {
  className?: string;
  quizAttempt?: ID;
  lastQuestion?: ID;
};

const QuitAssessmentButton = ({
  className,
  quizAttempt,
  lastQuestion,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);
  const quitAssessment = async () => {
    if (quizAttempt && lastQuestion) {
      try {
        setLoading(true);
        await attemptQuestion({
          quiztaker: quizAttempt,
          completed: true,
          question: lastQuestion,
        });
        router.replace(
          `/talents/skill-assessment/results/${quizAttempt}`
        );
      } catch (error: any) {
        handleFormSubmissionError(error, undefined, setAlert);
      } finally {
        setLoading(false);
      }
    } else router.back();
  };

  return (
    <Button
      className={cn(
        "btn btn-outline font-medium fill-[#292D32] hover:fill-white border-gray-200 text-gray-700 text-base",
        className
      )}
      onClick={quitAssessment}
      loading={loading}
      disabled={loading}
    >
      {!loading && (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='24'
          height='24'
          viewBox='0 0 24 24'
        >
          <path d='M9.16937 15.5804C8.97937 15.5804 8.78938 15.5104 8.63938 15.3604C8.34938 15.0704 8.34938 14.5904 8.63938 14.3004L14.2994 8.64035C14.5894 8.35035 15.0694 8.35035 15.3594 8.64035C15.6494 8.93035 15.6494 9.41035 15.3594 9.70035L9.69937 15.3604C9.55937 15.5104 9.35937 15.5804 9.16937 15.5804Z' />
          <path d='M14.8294 15.5804C14.6394 15.5804 14.4494 15.5104 14.2994 15.3604L8.63938 9.70035C8.34938 9.41035 8.34938 8.93035 8.63938 8.64035C8.92937 8.35035 9.40937 8.35035 9.69937 8.64035L15.3594 14.3004C15.6494 14.5904 15.6494 15.0704 15.3594 15.3604C15.2094 15.5104 15.0194 15.5804 14.8294 15.5804Z' />
          <path d='M15 22.75H9C3.57 22.75 1.25 20.43 1.25 15V9C1.25 3.57 3.57 1.25 9 1.25H15C20.43 1.25 22.75 3.57 22.75 9V15C22.75 20.43 20.43 22.75 15 22.75ZM9 2.75C4.39 2.75 2.75 4.39 2.75 9V15C2.75 19.61 4.39 21.25 9 21.25H15C19.61 21.25 21.25 19.61 21.25 15V9C21.25 4.39 19.61 2.75 15 2.75H9Z' />
        </svg>
      )}
      Quit Assessment
    </Button>
  );
};

export default QuitAssessmentButton;
