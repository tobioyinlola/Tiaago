"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { ID } from "@/app/common/types";
import { getInterviewNotes, saveInterviewNotes } from "@/app/common/services/interview-workspace";
import { htmlToPlainText } from "@/app/common/utils";

// A standalone Quill wrapper, not the Formik-coupled RichTextInputField
// (frontend/app/common/components/Forms/RichTextInput.tsx) -- that
// component reads/writes through Formik's field bag, which doesn't fit a
// bare autosaving textarea with no surrounding form. Same underlying
// react-quill-new library and toolbar-restriction approach, just without
// the Formik dependency.
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <div className='skeleton w-full h-full rounded-lg' />,
});

const NOTES_TOOLBAR = [["bold", "italic"], [{ list: "bullet" }, { list: "ordered" }]];
const AUTOSAVE_INTERVAL_MS = 10_000;

const NotesEditor = ({
  interviewId,
  appendSignal,
}: {
  interviewId: ID;
  appendSignal: { text: string; token: number } | null;
}) => {
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [savedLabel, setSavedLabel] = useState("");
  const contentRef = useRef("");
  const lastAppendTokenRef = useRef<number | null>(null);

  useEffect(() => {
    getInterviewNotes(interviewId).then(res => {
      if (res.success) {
        setContent(res.data.content_rich || "");
        contentRef.current = res.data.content_rich || "";
      }
    });
  }, [interviewId]);

  useEffect(() => {
    if (!appendSignal || lastAppendTokenRef.current === appendSignal.token) return;
    lastAppendTokenRef.current = appendSignal.token;
    setContent(prev => {
      const next = `${prev}<p>${appendSignal.text}</p>`;
      contentRef.current = next;
      return next;
    });
    setDirty(true);
  }, [appendSignal]);

  const persist = async () => {
    if (!dirty) return;
    const rich = contentRef.current;
    const plain = htmlToPlainText(rich);
    const res = await saveInterviewNotes(interviewId, rich, plain);
    if (res.success) {
      setDirty(false);
      setLastSavedAt(new Date());
    }
  };

  useEffect(() => {
    const interval = setInterval(persist, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, interviewId]);

  useEffect(() => {
    const handler = () => {
      // Best-effort only -- browsers don't guarantee an in-flight async
      // request completes during unload, but the 10-second interval means
      // at most one save cycle's worth of notes is ever at risk.
      if (dirty) persist();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  useEffect(() => {
    if (!lastSavedAt) return;
    setSavedLabel("Saved just now");
    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000);
      if (seconds < 60) setSavedLabel(`Saved ${seconds}s ago`);
      else setSavedLabel(`Saved ${Math.floor(seconds / 60)}m ago`);
    }, 5000);
    return () => clearInterval(interval);
  }, [lastSavedAt]);

  const handleChange = (value: string) => {
    setContent(value);
    contentRef.current = value;
    setDirty(true);
  };

  return (
    <div className='flex flex-col h-full'>
      <div className='flex items-center justify-between px-4 py-3 border-b border-[#EAECF0] shrink-0'>
        <p className='text-sm font-semibold text-primaryBlack'>Notes</p>
        <span className='flex items-center gap-1.5 text-xs text-secondary-black'>
          {dirty && <span className='w-1.5 h-1.5 rounded-full bg-gray-400' aria-label='Unsaved changes' />}
          {savedLabel}
        </span>
      </div>
      <div className='flex-1 min-h-0 overflow-hidden px-1 [&_.ql-container]:h-[calc(100%-42px)] [&_.ql-toolbar.ql-snow]:border-0 [&_.ql-toolbar.ql-snow]:border-b [&_.ql-toolbar.ql-snow]:border-[#EAECF0] [&_.ql-container.ql-snow]:border-0'>
        <ReactQuill
          value={content}
          onChange={handleChange}
          modules={{ toolbar: NOTES_TOOLBAR }}
          placeholder='Start typing your notes...'
        />
      </div>
    </div>
  );
};

export default NotesEditor;
