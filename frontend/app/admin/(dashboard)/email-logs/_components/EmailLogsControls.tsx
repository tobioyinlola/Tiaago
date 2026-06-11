"use client";

import { FiSearch } from "react-icons/fi";
import { LuRefreshCw } from "react-icons/lu";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEventHandler, Suspense, useTransition } from "react";

import { cn } from "@/app/common/utils";
import { EMAIL_DELIVERY_STATUSES } from "@/app/common/types/email-track.type";

type EmailLogsControlsProps = {
  emailTypes: string[];
};

const EmailLogsControlsContent = ({ emailTypes }: EmailLogsControlsProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const qParam = searchParams.get("q") ?? "";

  // Every search/filter change resets the page param so a filtered result
  // set never points at an out-of-range page.
  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const onSearchSubmit: FormEventHandler<HTMLFormElement> = e => {
    e.preventDefault();
    const value = new FormData(e.currentTarget).get("search");
    updateParams("q", String(value ?? "").trim());
  };

  const selectClass =
    "select select-bordered select-sm font-medium max-w-48 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className='mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
      <form onSubmit={onSearchSubmit} className='relative md:max-w-xs w-full'>
        <button
          type='submit'
          aria-label='Search email logs'
          className='absolute right-3 top-1/2 -translate-y-1/2'
        >
          <FiSearch className='text-muted-foreground text-xl' aria-hidden />
        </button>
        <input
          key={qParam}
          type='text'
          name='search'
          placeholder='Search by email address...'
          className='input input-bordered pl-4 pr-10 w-full text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          defaultValue={qParam}
        />
      </form>
      <div className='flex flex-wrap items-center gap-2'>
        <select
          aria-label='Filter by delivery status'
          className={selectClass}
          value={searchParams.get("delivery_status") ?? ""}
          onChange={e => updateParams("delivery_status", e.target.value)}
        >
          <option value=''>All statuses</option>
          {EMAIL_DELIVERY_STATUSES.map(status => (
            <option key={status} value={status} className='capitalize'>
              {status.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select
          aria-label='Filter by email type'
          className={selectClass}
          value={searchParams.get("email_type") ?? ""}
          onChange={e => updateParams("email_type", e.target.value)}
        >
          <option value=''>All types</option>
          {emailTypes.map(type => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <button
          type='button'
          aria-label='Refresh email logs'
          disabled={isPending}
          onClick={() => startTransition(() => router.refresh())}
          className='btn btn-sm btn-ghost border-border'
        >
          <LuRefreshCw
            className={cn("h-4 w-4", isPending && "animate-spin")}
            aria-hidden
          />
          Refresh
        </button>
      </div>
    </div>
  );
};

const EmailLogsControls = (props: EmailLogsControlsProps) => (
  <Suspense>
    <EmailLogsControlsContent {...props} />
  </Suspense>
);

export default EmailLogsControls;
