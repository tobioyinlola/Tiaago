"use client";

import { FiSearch } from "react-icons/fi";
import { LuRefreshCw } from "react-icons/lu";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEventHandler, Suspense, useTransition } from "react";

import { cn } from "@/app/common/utils";
import TagFilterDropdown from "./TagFilterDropdown";

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "dormant", label: "Dormant" },
  { value: "churned", label: "Churned" },
  { value: "free_credits", label: "Free Credits" },
];

const OrganisationsControlsContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const qParam = searchParams.get("q") ?? "";
  const walletParam = searchParams.get("wallet_below") ?? "";

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
    const formData = new FormData(e.currentTarget);
    updateParams("q", String(formData.get("search") ?? "").trim());
  };

  const onWalletSubmit: FormEventHandler<HTMLFormElement> = e => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateParams("wallet_below", String(formData.get("wallet_below") ?? "").trim());
  };

  const selectClass =
    "select select-bordered select-sm font-medium max-w-48 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className='mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
      <form onSubmit={onSearchSubmit} className='relative md:max-w-xs w-full'>
        <button type='submit' aria-label='Search organisations' className='absolute right-3 top-1/2 -translate-y-1/2'>
          <FiSearch className='text-muted-foreground text-xl' aria-hidden />
        </button>
        <input
          key={qParam}
          type='text'
          name='search'
          placeholder='Search by organisation name...'
          className='input input-bordered pl-4 pr-10 w-full text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          defaultValue={qParam}
        />
      </form>
      <div className='flex flex-wrap items-center gap-2'>
        <select
          aria-label='Filter by status'
          className={selectClass}
          value={searchParams.get("status") ?? ""}
          onChange={e => updateParams("status", e.target.value)}
        >
          <option value=''>All statuses</option>
          {STATUSES.map(s => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <form onSubmit={onWalletSubmit} className='flex items-center gap-1'>
          <input
            key={walletParam}
            type='number'
            name='wallet_below'
            placeholder='Wallet below ₦...'
            className='input input-bordered input-sm w-36 text-xs'
            defaultValue={walletParam}
          />
          <button type='submit' className='btn btn-sm btn-ghost'>
            Apply
          </button>
        </form>
        <TagFilterDropdown />
        <button
          type='button'
          aria-label='Refresh organisations'
          disabled={isPending}
          onClick={() => startTransition(() => router.refresh())}
          className='btn btn-sm btn-ghost border-border'
        >
          <LuRefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} aria-hidden />
          Refresh
        </button>
      </div>
    </div>
  );
};

const OrganisationsControls = () => (
  <Suspense>
    <OrganisationsControlsContent />
  </Suspense>
);

export default OrganisationsControls;
