"use client";
import "emoji-picker-element";
import { FaRegSmile } from "react-icons/fa";
import type { Picker } from "emoji-picker-element";
import { RefObject, useEffect, useRef } from "react";
import insertTextAtCursor from "insert-text-at-cursor";
import type { EmojiPickerEventMap } from "emoji-picker-element/shared";

type OnEmojiClickEvent = EmojiPickerEventMap["emoji-click"];

type EmojiPickerProps = {
  inputRef: RefObject<HTMLTextAreaElement>;
};

const EmojiPicker = ({ inputRef }: EmojiPickerProps) => {
  const ref = useRef<Picker>(null);

  useEffect(() => {
    const picker = ref.current;
    picker?.classList.add("light");
    const addToInput = (e: OnEmojiClickEvent) => {
      if (inputRef.current && e.detail.unicode)
        insertTextAtCursor(inputRef.current, e.detail.unicode);
    };
    picker?.addEventListener("emoji-click", addToInput);
    return () => {
      picker?.removeEventListener("emoji-click", addToInput);
    };
  }, [inputRef]);

  return (
    <div className='dropdown dropdown-hover dropdown-top dropdown-left'>
      <div
        tabIndex={0}
        className='w-5 h-5 cursor-pointer'
        aria-label='open emoji picker'
        role='button'
      >
        <FaRegSmile className='text-2xl text-gray-500' />
      </div>
      <div
        tabIndex={0}
        className='dropdown-content z-[1] shadow w-max translate-x-6'
      >
        {/* @ts-ignore */}
        <emoji-picker<Picker> ref={ref} />
      </div>
    </div>
  );
};

export default EmojiPicker;
