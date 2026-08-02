"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "tiaago-cookie-consent";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    // react-hooks/set-state-in-effect forbids setState as a direct
    // synchronous statement in an effect body -- defer to a microtask (see
    // AssessmentSourcePicker.tsx for the same pattern).
    queueMicrotask(() => setVisible(true));
  }, []);

  const respond = (choice: "accepted" | "declined") => {
    localStorage.setItem(STORAGE_KEY, choice);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className='fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6'>
      <div className='mx-auto flex max-w-3xl flex-col items-start gap-4 rounded-2xl border border-[#E4E7EC] bg-white p-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] sm:flex-row sm:items-center'>
        <p className='flex-1 text-sm font-onest text-[#0A0A0AB2]'>
          We use cookies to run TIAAGO and understand how visitors use our site. See our{" "}
          <Link href='/privacy' className='text-primary underline underline-offset-4 hover:text-primary-dark'>
            Privacy Policy
          </Link>{" "}
          for details.
        </p>
        <div className='flex shrink-0 items-center gap-3'>
          <button
            type='button'
            onClick={() => respond("declined")}
            className='rounded-full border border-[#D0D5DD] px-4 py-2 text-sm font-onest font-medium text-black hover:bg-gray-50 transition-colors'
          >
            Decline
          </button>
          <button
            type='button'
            onClick={() => respond("accepted")}
            className='rounded-full bg-primary px-4 py-2 text-sm font-onest font-semibold text-white hover:bg-primary-dark transition-colors'
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
