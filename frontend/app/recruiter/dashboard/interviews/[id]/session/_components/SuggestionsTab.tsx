"use client";

import { useState } from "react";
import { AlertOctagon, AlertTriangle, Clock, MessageCircle } from "lucide-react";

import { CopilotEventType, CopilotSuggestionEvent } from "@/app/common/types";
import { cn } from "@/app/common/utils";

const TYPE_META: Record<CopilotEventType, { icon: typeof MessageCircle; color: string; label: string }> = {
  FOLLOWUP_QUESTION: { icon: MessageCircle, color: "text-primary", label: "Follow-up" },
  MISSING_COMPETENCY: { icon: AlertTriangle, color: "text-amber-500", label: "Uncovered area" },
  RESUME_CONTRADICTION: { icon: AlertOctagon, color: "text-red-500", label: "Resume flag" },
  TIME_WARNING: { icon: Clock, color: "text-amber-500", label: "Time" },
  EVIDENCE_CAPTURED: { icon: MessageCircle, color: "text-success", label: "Evidence" },
};

const ConfidenceDot = ({ confidence }: { confidence: number }) => (
  <span
    title={`${Math.round(confidence * 100)}% confidence`}
    className={cn(
      "w-1.5 h-1.5 rounded-full shrink-0",
      confidence >= 0.85 ? "bg-success" : "bg-amber-400"
    )}
  />
);

const SuggestionCard = ({
  suggestion,
  onUse,
  onDismiss,
}: {
  suggestion: CopilotSuggestionEvent;
  onUse: () => void;
  onDismiss: () => void;
}) => {
  const meta = TYPE_META[suggestion.event_type] || TYPE_META.FOLLOWUP_QUESTION;
  const Icon = meta.icon;
  return (
    <div className='border border-[#EAECF0] rounded-lg p-3 flex flex-col gap-2 animate-[fadeIn_0.3s_ease]'>
      <div className='flex items-start gap-2'>
        <Icon className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", meta.color)} />
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-1.5'>
            <span className='text-[10px] font-medium text-secondary-black uppercase tracking-wide'>
              {meta.label}
            </span>
            <ConfidenceDot confidence={suggestion.confidence} />
          </div>
          <p className='text-sm text-primaryBlack mt-0.5'>{suggestion.content}</p>
        </div>
      </div>
      <div className='flex items-center gap-2 justify-end'>
        <button type='button' onClick={onDismiss} className='text-xs text-secondary-black'>
          Dismiss
        </button>
        <button type='button' onClick={onUse} className='btn btn-xs btn-primary text-white rounded-md'>
          Use
        </button>
      </div>
    </div>
  );
};

const SuggestionsTab = ({
  suggestions,
  onUseFollowup,
}: {
  suggestions: CopilotSuggestionEvent[];
  onUseFollowup: (text: string) => void;
}) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [showEarlier, setShowEarlier] = useState(false);

  const visible = suggestions.filter(s => !dismissedIds.has(s.id));
  const recent = visible.slice(-3).reverse();
  const earlier = visible.slice(0, Math.max(0, visible.length - 3));

  const handleUse = (suggestion: CopilotSuggestionEvent) => {
    const meta = TYPE_META[suggestion.event_type] || TYPE_META.FOLLOWUP_QUESTION;
    onUseFollowup(`→ ${meta.label}: ${suggestion.content}`);
  };

  const handleDismiss = (id: string) => setDismissedIds(prev => new Set(prev).add(id));

  if (!visible.length) {
    return (
      <div className='flex flex-col items-center text-center gap-2 py-10'>
        <p className='text-xs text-secondary-black max-w-[200px]'>
          Live AI suggestions will appear here as the conversation progresses.
        </p>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-3'>
      {recent.map(suggestion => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          onUse={() => handleUse(suggestion)}
          onDismiss={() => handleDismiss(suggestion.id)}
        />
      ))}

      {!!earlier.length && (
        <div>
          <button
            type='button'
            onClick={() => setShowEarlier(prev => !prev)}
            className='text-xs text-secondary-black hover:text-primaryBlack'
          >
            {showEarlier ? "Hide" : "Show"} earlier suggestions ({earlier.length})
          </button>
          {showEarlier && (
            <div className='flex flex-col gap-3 mt-3'>
              {earlier
                .slice()
                .reverse()
                .map(suggestion => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onUse={() => handleUse(suggestion)}
                    onDismiss={() => handleDismiss(suggestion.id)}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SuggestionsTab;
