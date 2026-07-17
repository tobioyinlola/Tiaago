"use client";

import { FiSearch } from "react-icons/fi";
import { LuRefreshCw } from "react-icons/lu";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEventHandler, Suspense, useTransition } from "react";

import { cn } from "@/app/common/utils";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const CATEGORIES = ["BILLING", "TECHNICAL", "ACCOUNT", "ASSESSMENTS", "PIPELINE", "OTHER"];

const AdminSupportControlsContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const qParam = searchParams.get("q") ?? "";

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
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <form onSubmit={onSearchSubmit} className="relative md:max-w-xs w-full">
        <button type="submit" aria-label="Search tickets" className="absolute right-3 top-1/2 -translate-y-1/2">
          <FiSearch className="text-muted-foreground text-xl" aria-hidden />
        </button>
        <input
          key={qParam}
          type="text"
          name="search"
          placeholder="Search by ticket, title or organisation..."
          className="input input-bordered pl-4 pr-10 w-full text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue={qParam}
        />
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Filter by status"
          className={selectClass}
          value={searchParams.get("status") ?? ""}
          onChange={e => updateParams("status", e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by priority"
          className={selectClass}
          value={searchParams.get("priority") ?? ""}
          onChange={e => updateParams("priority", e.target.value)}
        >
          <option value="">All priorities</option>
          {PRIORITIES.map(p => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by category"
          className={selectClass}
          value={searchParams.get("category") ?? ""}
          onChange={e => updateParams("category", e.target.value)}
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label="Refresh tickets"
          disabled={isPending}
          onClick={() => startTransition(() => router.refresh())}
          className="btn btn-sm btn-ghost border-border"
        >
          <LuRefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} aria-hidden />
          Refresh
        </button>
      </div>
    </div>
  );
};

const AdminSupportControls = () => (
  <Suspense>
    <AdminSupportControlsContent />
  </Suspense>
);

export default AdminSupportControls;
