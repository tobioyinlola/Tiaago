"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  GoogleOAuthProvider,
  useGoogleLogin,
} from "@react-oauth/google";
import { setAuthCookies, TokensInput } from "@/app/common/actions";
import { publicKyInstance } from "@/app/common/utils/client-ky.instance";
import { getFullUserType, getRoleUrlSegment } from "@/app/common/utils";
import { Loader2 } from "lucide-react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

type GoogleSignInResponse = TokensInput & {
  user_type: string;
  is_new: boolean;
};

function GoogleButtonInner({
  userType,
  next,
  label = "Sign in with Google",
  orgRefCode,
  utm_source,
  utm_medium,
  utm_campaign,
}: {
  userType: "company" | "talent";
  next?: string;
  label?: string;
  orgRefCode?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}) {
  const [loading, setLoading] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const data = await publicKyInstance
          .post("auth/google/", {
            json: {
              access_token: tokenResponse.access_token,
              user_type: userType,
              ...(orgRefCode ? { ref: orgRefCode } : {}),
              ...(utm_source ? { utm_source } : {}),
              ...(utm_medium ? { utm_medium } : {}),
              ...(utm_campaign ? { utm_campaign } : {}),
            },
          })
          .json<GoogleSignInResponse>();

        const { user_type, is_new, ...tokensInput } = data;
        await setAuthCookies(tokensInput);
        toast.success(is_new ? "Account created!" : "Login successful");

        setTimeout(() => {
          if (next) {
            window.location.href = next;
          } else {
            const fullType = getFullUserType(user_type as "T" | "CR" | "ST");
            window.location.href = `/${getRoleUrlSegment(fullType)}/dashboard`;
          }
        }, 500);
      } catch {
        toast.error("Google sign-in failed. Please try again.");
        setLoading(false);
      }
    },
    onError: () => {
      toast.error("Google sign-in was cancelled.");
    },
  });

  return (
    <button
      type="button"
      onClick={() => login()}
      disabled={loading}
      className="flex items-center gap-4 border-[1.5px] border-[#D0D5DD] w-full py-4 justify-center rounded-md my-8 text-base font-onest font-semibold shadow-[0px_2px_4px_0px_#00000014] hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 17 17"
          fill="none"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M16.6605 8.68183C16.6605 8.11456 16.6096 7.56911 16.515 7.04547H8.98047V10.14H13.2859C13.1005 11.14 12.5368 11.9873 11.6896 12.5546V14.5618H14.275C15.7877 13.1691 16.6605 11.1182 16.6605 8.68183Z"
            fill="#4285F4"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8.98112 16.5C11.1411 16.5 12.952 15.7837 14.2757 14.5618L11.6902 12.5546C10.9738 13.0346 10.0575 13.3182 8.98112 13.3182C6.89749 13.3182 5.13385 11.9109 4.50476 10.02H1.83203V12.0927C3.14839 14.7073 5.85385 16.5 8.98112 16.5Z"
            fill="#34A853"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M4.5041 10.02C4.3441 9.54002 4.2532 9.02729 4.2532 8.50002C4.2532 7.97274 4.3441 7.46002 4.5041 6.98001V4.90729H1.83138C1.28956 5.98729 0.980469 7.20911 0.980469 8.50002C0.980469 9.79092 1.28956 11.0127 1.83138 12.0927L4.5041 10.02Z"
            fill="#FBBC05"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8.98112 3.68182C10.1557 3.68182 11.2102 4.08545 12.0393 4.87818L14.3338 2.58364C12.9484 1.29273 11.1375 0.5 8.98112 0.5C5.85385 0.5 3.14839 2.29273 1.83203 4.90727L4.50476 6.98C5.13385 5.08909 6.89749 3.68182 8.98112 3.68182Z"
            fill="#EA4335"
          />
        </svg>
      )}
      {loading ? "Signing in..." : label}
    </button>
  );
}

export default function GoogleSignInButton({
  userType = "company",
  next,
  label,
  orgRefCode,
  utm_source,
  utm_medium,
  utm_campaign,
}: {
  userType?: "company" | "talent";
  next?: string;
  label?: string;
  orgRefCode?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}) {
  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GoogleButtonInner
        userType={userType}
        next={next}
        label={label}
        orgRefCode={orgRefCode}
        utm_source={utm_source}
        utm_medium={utm_medium}
        utm_campaign={utm_campaign}
      />
    </GoogleOAuthProvider>
  );
}
