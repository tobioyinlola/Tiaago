"use client";

import { toast } from "sonner";
import { Button } from "react-daisyui";
import { useCountdown } from "usehooks-ts";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { addMinutes, differenceInSeconds, isAfter } from "date-fns";

import { useAlert } from "../common/store/useAlert";
import { handleFormSubmissionError } from "../common/utils";
import { publicAxiosInstance } from "../common/utils/axios.instance";
import { usePersistedStore } from "../common/store/usePersistedStore";

type Props = {
  email?: string;
  loginUrl: string;
  resendDelayInMinutes?: number;
};

const EmailVerificationForm = ({
  email,
  loginUrl,
  resendDelayInMinutes = 1,
}: Props) => {
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);
  const inputBox = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [code, setCode] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isresending, setIsResending] = useState(false);
  const now = new Date();
  const [lastVerificationEmailSentAt, setLastVerificationEmailSentAt] =
    usePersistedStore(s => [
      s.lastVerificationEmailSentAt,
      s.setLastVerificationEmailSentAt,
    ]);

  const canResendAt = lastVerificationEmailSentAt
    ? addMinutes(new Date(lastVerificationEmailSentAt), resendDelayInMinutes)
    : null;
  const canResend = !canResendAt || isAfter(now, canResendAt);
  const diff = canResendAt ? differenceInSeconds(canResendAt, now) : 0;
  const [countStart, setCountStart] = useState(diff);

  const [counter, countdownControllers] = useCountdown({
    countStart: countStart,
  });

  useEffect(() => {
    if (canResend) countdownControllers.stopCountdown();
    else {
      setCountStart(resendDelayInMinutes * 60);
      countdownControllers.resetCountdown();
      setTimeout(() => {
        countdownControllers.startCountdown();
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canResend]);

  const verifyEmail = (_code = code) => {
    if (!email) {
      toast.error("No valid email was provided");
      return;
    }
    if (isLoading) return;
    const otp = _code.join("");
    if (otp.length !== 4) {
      toast.error("Invalid OTP");
      return;
    }
    setIsLoading(true);
    toast.dismiss();
    publicAxiosInstance
      .post("/auth/account-confirm-email/", {
        email,
        otp,
      })
      .then(() => {
        toast.success("Email verified successfully");
        router.push(loginUrl);
      })
      .catch(e => {
        setTimeout(() => {
          handleFormSubmissionError(e, undefined, setAlert);
        }, 500);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const value = e.target.value;
    if (isNaN(+value)) {
      e.target.value = "";
      return;
    }
    if (value.length === 1) {
      setCode(prev => {
        const newCode = [...prev];
        newCode[index] = value;
        return newCode;
      });
      if (index < inputRefs.current.length - 1) {
        inputRefs.current[index + 1]?.focus();
      } else {
        verifyEmail(code.length === 3 ? [...code, value] : code);
      }
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace" && index > 0 && e.currentTarget.value === "") {
      setCode(prev => {
        const newCode = [...prev];
        newCode.pop();
        return newCode;
      });
      inputRefs.current[index - 1]?.focus();
    }
  };

  const resendEmail = () => {
    if (!email) {
      toast.error("No valid email was provided");
      return;
    }
    if (isresending) return;
    if (!canResend) return;
    const toastId = toast.dismiss();
    toast.loading("Resending verification email...");
    setIsResending(true);
    publicAxiosInstance
      .post("/auth/resend-email/", {
        email,
      })
      .then(() => {
        toast.success("Verification email sent successfully");
        setLastVerificationEmailSentAt(new Date().toISOString());
        countdownControllers.resetCountdown();
        countdownControllers.startCountdown();
      })
      .catch(e => {
        setTimeout(() => {
          handleFormSubmissionError(e, undefined, setAlert);
        }, 500);
      })
      .finally(() => {
        setIsResending(false);
        toast.dismiss(toastId);
      });
  };

  return (
    <div>
      <div className='flex gap-3 justify-center p-4 w-full'>
        {inputBox.map(input => (
          <input
            onChange={e => handleInputChange(e, input.id - 1)}
            onKeyDown={e => handleKeyDown(e, input.id - 1)}
            ref={el => {
              inputRefs.current[input.id - 1] = el;
            }}
            key={input.id}
            maxLength={1}
            className='w-10 h-12 p-2 shadow-lg border border-[#e3e3e3] bg-white font-xl font-bold outline-none rounded-md text-center focus:border focus:border-primary'
          />
        ))}
      </div>

      <h3 className='text-center text-sm font-poppins'>
        Didn&apos;t get a code?{" "}
        <button
          onClick={resendEmail}
          disabled={!canResend || isresending}
          className='text-primary font-bold'
        >
          Resend Code
        </button>
        {!canResend && (
          <strong className='text-red-500 font-bold'> ({counter}secs)</strong>
        )}
      </h3>

      <Button
        loading={isLoading}
        disabled={isLoading || code.length !== 4}
        onClick={() => verifyEmail()}
        color='primary'
        className='mt-3 rounded-md w-full'
      >
        Continue
      </Button>
    </div>
  );
};

export default EmailVerificationForm;
