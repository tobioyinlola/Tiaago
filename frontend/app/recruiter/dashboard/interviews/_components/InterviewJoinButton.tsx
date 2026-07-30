"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Video } from "lucide-react";

import { ID } from "@/app/common/types";
import { JOIN_WINDOW_MINUTES } from "../interviews.constants";

const JOIN_WINDOW_MS = JOIN_WINDOW_MINUTES * 60 * 1000;
/** How often the button re-checks the clock. Also the granularity of the
 * snapshot below, so the button can unlock up to this much late -- immaterial
 * against a 30-minute window, and never early. */
const TICK_MS = 15_000;

const subscribe = (onStoreChange: () => void) => {
  const interval = setInterval(onStoreChange, TICK_MS);
  return () => clearInterval(interval);
};

/** Bucketed rather than raw Date.now() so the value is stable between ticks --
 * useSyncExternalStore reads it during render and a value that changes every
 * millisecond would re-render forever. */
const getSnapshot = () => Math.floor(Date.now() / TICK_MS);

/** There is no clock to read during SSR, so the server (and the hydrating
 * client) render the disabled state and the real value arrives right after
 * hydration -- no markup mismatch. */
const getServerSnapshot = (): number | null => null;

/** "Join Interview" for the Upcoming tab, where the room only opens
 * JOIN_WINDOW_MINUTES ahead of the scheduled start. The check needs the
 * current time, which makes this the one client-side piece of an otherwise
 * server-rendered card. Re-checking on a timer means the button unlocks itself
 * without the recruiter reloading the page.
 *
 * Live interviews are never gated, so the Live tab links straight to the
 * workspace instead of rendering this. */
const InterviewJoinButton = ({
  id,
  startsAt,
}: {
  id: ID;
  /** Epoch ms of the scheduled start, or null when the API sent an
   * unparseable date -- treated as "not joinable yet". */
  startsAt: number | null;
}) => {
  const tick = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const canJoin =
    tick !== null && startsAt !== null && startsAt - tick * TICK_MS <= JOIN_WINDOW_MS;

  if (!canJoin)
    return (
      <div className='flex flex-col items-start sm:items-end gap-1'>
        <button
          type='button'
          disabled
          title={`Available ${JOIN_WINDOW_MINUTES} min before start`}
          className='btn btn-sm rounded-lg gap-1.5 !bg-[#F5F6F7] !text-secondary-black !border-[#EAECF0]'
        >
          <Video className='w-3.5 h-3.5' />
          Join Interview
        </button>
        <span className='text-[11px] text-secondary-black'>
          Available {JOIN_WINDOW_MINUTES} min before start
        </span>
      </div>
    );

  return (
    <Link
      href={`/recruiter/dashboard/interviews/${id}`}
      className='btn btn-sm btn-primary text-white rounded-lg gap-1.5 border-none'
    >
      <Video className='w-3.5 h-3.5' />
      Join Interview
    </Link>
  );
};

export default InterviewJoinButton;
