"use client";

import { HTTPError } from "ky";
import { toast } from "sonner";
import Button from "@/app/common/components/DaisyButton";
import { useCountdown } from "usehooks-ts";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { addMinutes, differenceInSeconds, isAfter } from "date-fns";

import { useAlert } from "../common/store/useAlert";
import { handleFormSubmissionError } from "../common/utils";
import { publicKyInstance } from "@/app/common/utils/client-ky.instance";
import { usePersistedStore } from "../common/store/usePersistedStore";
import { setAuthCookies, TokensInput } from "../common/actions";

type Props = {
  email?: string;
  loginUrl: string;
  /**
   * Where to send the user right after a successful verification when the
   * backend returns auth tokens (auto-login). Falls back to loginUrl when
   * absent or when no tokens are returned.
   */
  autoLoginRedirect?: string;
  resendDelayInMinutes?: number;
};

const TRANSIENT_STATUSES = new Set([408, 502, 503, 504]);

/** POSTs the code, retrying only failures where the server never gave an
 * answer (offline, timeout, cold start, gateway error). A real answer from the
 * API -- including "invalid code" -- is returned to the caller immediately. The
 * API accepts a repeat of the same code for a short time after it verified the
 * account, so a retry after a lost response signs the user in. */
const postVerification = async (email: string, otp: string) => {
  const attempts = 3;
  for (let attempt = 1; ; attempt++) {
    try {
      return await publicKyInstance
        .post("auth/account-confirm-email/", { json: { email, otp }, retry: 0 })
        .json<Partial<TokensInput>>();
    } catch (error) {
      const transient = error instanceof HTTPError
        ? TRANSIENT_STATUSES.has(error.response.status)
        : true; // network failure or timeout: no response was received
      if (!transient || attempt >= attempts) throw error;
      await new Promise(resolve => setTimeout(resolve, 1200 * attempt));
    }
  }
};

const EmailVerificationForm = ({
  email,
  loginUrl,
  autoLoginRedirect,
  resendDelayInMinutes = 1,
}: Props) => {
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);
  const OTP_LENGTH = 6;
  const inputBox = Array.from({ length: OTP_LENGTH }, (_, i) => ({
    id: i + 1,
  }));

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

  // The digits are read from the inputs themselves, never from `code` state:
  // the last digit auto-submits from inside the same event that typed it (or
  // from an autofill/paste burst), when the state captured by this render can
  // still be a digit or two behind. Submitting that stale value showed an
  // "Invalid OTP" error on the first attempt, and the second click -- by then
  // with up-to-date state -- succeeded.
  const readOtp = () => inputRefs.current.map(input => input?.value ?? "").join("");
  // A ref, not state: state would not update before a second trigger (the
  // auto-submit plus a click) in the same tick.
  const submittingRef = useRef(false);

  const verifyEmail = () => {
    if (!email) {
      toast.error("No valid email was provided");
      return;
    }
    if (submittingRef.current) return;
    const otp = readOtp();
    if (otp.length !== OTP_LENGTH) {
      toast.error("Enter all 6 digits of the code");
      return;
    }
    submittingRef.current = true;
    setIsLoading(true);
    toast.dismiss();
    postVerification(email, otp)
      .then(
        async data => {
          // From here the email IS verified (the code is single-use), so a
          // problem signing in must fall back to the login page rather than
          // be reported as a verification failure.
          toast.success("Email verified successfully");
          try {
            if (autoLoginRedirect && data?.access) {
              // log the user straight in and hand off (e.g. onboarding cards)
              await setAuthCookies(data as TokensInput);
              window.location.href = autoLoginRedirect;
              return;
            }
          } catch (signInError) {
            console.error("Auto sign-in after verification failed", signInError);
          }
          router.push(loginUrl);
        },
        e => {
          submittingRef.current = false;
          setTimeout(() => {
            handleFormSubmissionError(e, undefined, setAlert);
          }, 500);
        }
      )
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      e.target.value = "";
      return;
    }
    if (raw.length > 1) {
      const digits = raw.slice(0, OTP_LENGTH - index).split("");
      setCode(prev => {
        const newCode = [...prev];
        digits.forEach((d, i) => {
          newCode[index + i] = d;
          if (inputRefs.current[index + i]) inputRefs.current[index + i]!.value = d;
        });
        return newCode;
      });
      const focusIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
      if (index + digits.length >= OTP_LENGTH) verifyEmail();
      return;
    }
    e.target.value = raw;
    setCode(prev => {
      const newCode = [...prev];
      newCode[index] = raw;
      return newCode;
    });
    if (index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1]?.focus();
    } else {
      verifyEmail();
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

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!digits) return;
    const newCode = digits.split("");
    setCode(newCode);
    newCode.forEach((d, i) => {
      if (inputRefs.current[i]) inputRefs.current[i]!.value = d;
    });
    const focusIndex = Math.min(newCode.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
    if (newCode.length === OTP_LENGTH) verifyEmail();
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
    publicKyInstance
      .post("auth/resend-otp/", {
        json: { email },
      })
      .json()
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
      <div
        role='group'
        aria-label='Enter verification code'
        className='flex gap-2 sm:gap-3 justify-center p-4 w-full'
      >
        {inputBox.map(input => (
          <input
            onChange={e => handleInputChange(e, input.id - 1)}
            onKeyDown={e => handleKeyDown(e, input.id - 1)}
            onPaste={handlePaste}
            ref={el => {
              inputRefs.current[input.id - 1] = el;
            }}
            key={input.id}
            aria-label={`Verification code digit ${input.id}`}
            inputMode="numeric"
            autoComplete={input.id === 1 ? "one-time-code" : "off"}
            className='w-11 sm:w-12 h-12 p-2 shadow-sm border border-border bg-card text-xl font-bold rounded-md text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
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
          <strong className='text-destructive font-bold'> ({counter}secs)</strong>
        )}
      </h3>

      <Button
        loading={isLoading}
        disabled={isLoading || code.length !== OTP_LENGTH}
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
