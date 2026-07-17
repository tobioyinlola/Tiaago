"use client";

import { useState } from "react";

import { MERGE_TAGS } from "@/app/common/types/campaigns.type";

const MergeTagPicker = ({ onInsert }: { onInsert: (tag: string) => void }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button type="button" className="btn btn-xs btn-outline" onClick={() => setOpen(o => !o)}>
        Insert merge tag
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-64 max-h-64 overflow-y-auto bg-white rounded-lg border border-[#EAECEE] shadow-lg">
          {MERGE_TAGS.map(m => (
            <button
              key={m.tag}
              type="button"
              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex flex-col"
              onClick={() => {
                onInsert(`{{${m.tag}}}`);
                setOpen(false);
              }}
            >
              <span className="font-mono text-primary">{`{{${m.tag}}}`}</span>
              <span className="text-muted-foreground">{m.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MergeTagPicker;
