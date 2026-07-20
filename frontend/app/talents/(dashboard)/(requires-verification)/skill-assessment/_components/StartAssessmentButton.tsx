"use client";
import { useRouter } from "next/navigation";

import { useAlert } from "@/app/common/store/useAlert";

type StartAssessmentButtonProps = {
  href: string;
  disabled?: boolean;
  willStartQuiz?: boolean;
  text?: string;
};

const StartAssessmentButton = ({
  href,
  disabled,
  text = "Start Assessment",
  willStartQuiz,
}: StartAssessmentButtonProps) => {
  const setAlert = useAlert(s => s.setAlert);
  const router = useRouter();
  const handleClick = () => {
    if (willStartQuiz)
      setAlert({
        title: "Are you sure?",
        message: "You are about to start a quiz. Are you ready?",
        icon: "warning",
        buttonText: "Start Quiz",
        buttonLink: href,
      });
    else router.push(href);
  };
  return (
    <button
      className='btn btn-primary w-full max-w-md font-medium'
      onClick={handleClick}
      disabled={disabled}
    >
      {text}
    </button>
  );
};

export default StartAssessmentButton;
