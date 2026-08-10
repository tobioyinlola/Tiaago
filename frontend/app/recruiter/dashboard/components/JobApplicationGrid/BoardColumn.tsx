import { useDroppable } from "@dnd-kit/core";
import { ChevronDown } from "lucide-react";

import { AiFeedbackItem, JobApplication } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import ApplicationCard from "./ApplicationCard";

const BoardColumn = ({
  columnKey,
  label,
  badgeClassName,
  droppable,
  items,
  visibleCount,
  onShowMore,
  expanded,
  onToggle,
  movingId,
  onView,
  onAddToPipeline,
  onMoveStage,
}: {
  columnKey: string;
  label: string;
  badgeClassName: string;
  droppable: boolean;
  items: AiFeedbackItem[];
  visibleCount: number;
  onShowMore: () => void;
  expanded: boolean;
  onToggle: () => void;
  movingId: AiFeedbackItem["application_id"] | null;
  onView: (item: AiFeedbackItem) => void;
  onAddToPipeline: (item: AiFeedbackItem) => void;
  onMoveStage: (item: AiFeedbackItem, status: JobApplication["status"]) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey, disabled: !droppable });
  const visible = items.slice(0, visibleCount);

  return (
    <div className='w-full min-w-0 flex flex-col gap-3 bg-white rounded-xl border border-[#EAECF0] p-3'>
      <button
        type='button'
        onClick={onToggle}
        className='flex items-center justify-between gap-2 px-1 text-left'
      >
        <span className={cn("rounded-2xl px-2.5 py-1 text-xs font-semibold whitespace-nowrap truncate", badgeClassName)}>
          {label}
        </span>
        <span className='flex items-center gap-1.5 text-xs text-[#667085] font-medium shrink-0'>
          {items.length}
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", expanded && "rotate-180")} />
        </span>
      </button>
      <div
        ref={setNodeRef}
        className={cn(
          expanded ? "flex flex-col gap-3" : "hidden",
          "min-h-[80px] rounded-xl transition-colors",
          "md:max-h-[calc(100vh-320px)] md:overflow-y-auto md:pr-1",
          droppable && isOver && "bg-primary/5 outline outline-2 outline-dashed outline-primary/30"
        )}
      >
        {visible.length ? (
          <>
            {visible.map(item => (
              <ApplicationCard
                key={item.application_id}
                item={item}
                onView={() => onView(item)}
                onAddToPipeline={() => onAddToPipeline(item)}
                onMoveStage={status => onMoveStage(item, status)}
                moving={movingId === item.application_id}
              />
            ))}
            {items.length > visible.length && (
              <button
                type='button'
                onClick={onShowMore}
                className='text-xs font-medium text-primary hover:underline py-2'
              >
                Show {Math.min(25, items.length - visible.length)} more
              </button>
            )}
          </>
        ) : (
          <div className='rounded-xl border border-dashed border-[#EAECF0] p-4 text-center text-xs text-[#98A2B3]'>
            No candidates in this stage
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardColumn;
