"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, X, Paperclip } from "lucide-react";

import { cn } from "@/app/common/utils";

export type FileDropzoneProps = {
  files: File[];
  onChange: (files: File[]) => void;
  accept?: string;
  acceptText?: string;
  maxFiles?: number;
  maxFileSize?: number;
  className?: string;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Drag-and-drop + click multi-file upload zone -- no equivalent existing
// component covers multi-file selection with a removable file list (the
// established VanillaFileInput is single-file only), so this is new.
const FileDropzone = ({
  files,
  onChange,
  accept = ".jpg,.jpeg,.png,.gif,.pdf,.csv,.docx",
  acceptText = "Images, PDF, CSV or DOCX (max. 10MB each, up to 3 files)",
  maxFiles = 3,
  maxFileSize = 10 * 1024 * 1024,
  className,
}: FileDropzoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = (incoming: FileList | File[]) => {
    const incomingArr = Array.from(incoming);
    const combined = [...files];
    for (const file of incomingArr) {
      if (combined.length >= maxFiles) {
        toast.error(`You can attach at most ${maxFiles} files.`);
        break;
      }
      if (file.size > maxFileSize) {
        toast.error(`${file.name} is too large. Max file size is ${formatBytes(maxFileSize)}.`);
        continue;
      }
      combined.push(file);
    }
    onChange(combined);
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors py-8 px-4 text-center",
          isDragging ? "border-primary bg-primary/5" : "border-[#D0D5DD]"
        )}
      >
        <div className="flex items-center justify-center bg-gray-100 rounded-full p-3 mb-3">
          <UploadCloud className="w-6 h-6 text-gray-500" />
        </div>
        <p className="text-sm">
          <span className="font-semibold text-primary">Click to upload</span>{" "}
          <span className="text-secondary-black">or drag and drop</span>
        </p>
        <p className="text-xs text-secondary-black mt-1">{acceptText}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={e => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {!!files.length && (
        <ul className="mt-3 flex flex-col gap-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between gap-3 rounded-md border border-[#EAECEE] px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-secondary-black" />
                <span className="truncate">{file.name}</span>
                <span className="text-xs text-secondary-black shrink-0">{formatBytes(file.size)}</span>
              </span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                aria-label={`Remove ${file.name}`}
                className="text-secondary-black hover:text-destructive shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FileDropzone;
