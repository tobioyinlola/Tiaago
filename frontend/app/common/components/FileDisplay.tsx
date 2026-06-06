import Image from "next/image";

import { cn } from "@/app/common/utils";

export type FileDisplayProps = {
  fileName: string;
  dateAdded?: string;
  children?: React.ReactNode;
  className?: string;
  downloadDisabled?: boolean;
};

const FileDisplay = ({
  dateAdded,
  fileName,
  children,
  className,
  downloadDisabled,
}: FileDisplayProps) => {
  const _ext = (fileName.split(".").pop() ?? "").toUpperCase().trim();
  const isValidExt = ["DOC", "DOCX", "PDF"].includes(_ext);
  const ext = isValidExt ? _ext : "DOC";
  return (
    <div
      className={cn(
        "flex rounded-lg border-[#EAECF0] border py-6 pl-8 pr-4 justify-between md:max-w-md",
        className
      )}
    >
      <div className='h-20 flex gap-5'>
        <Image
          alt={`${ext} icon`}
          src={`/assets/icons/file-icons/${ext}.svg`}
          width={66.66}
          height={80}
          aria-hidden
        />
        <div>
          <h3 className='text-sm font-semibold line-clamp-1 text-primary-black font-poppins'>
            {fileName}
          </h3>
          {!!dateAdded && (
            <p className='text-secondary-black text-sm'>Added {dateAdded}</p>
          )}
          {!downloadDisabled && (
            <p className='text-secondary-black text-xs mt-1.5'>Downloadable</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

export default FileDisplay;
