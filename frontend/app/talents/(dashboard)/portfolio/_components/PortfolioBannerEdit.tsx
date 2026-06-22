"use client";

import { toast } from "sonner";
import Image from "next/image";
import { useState } from "react";

import { VanillaFileInput } from "@/app/common/components/Forms/FileInput";
import { updatePortfolio } from "@/app/common/services/talents";
import { cn, handleFormSubmissionError } from "@/app/common/utils";

type Props = {
  banner?: string;
};

const PortfolioBannerEdit = ({ banner }: Props) => {
  const [isUploading, setIsUploading] = useState(false);
  const [portfolioBanner, setPortfolioBanner] = useState(banner);

  const handleFileChange = async (file: File) => {
    if (isUploading) return;
    toast.dismiss();
    setIsUploading(true);
    toast.promise(
      new Promise(async (resolve, reject) => {
        try {
          const formData = new FormData();
          formData.append("banner", file);
          const res = await updatePortfolio(formData);
          if (res.success) {
            setPortfolioBanner(res?.data?.banner);
            resolve(res);
          } else {
            reject(res.error);
          }
        } catch (error) {
          setIsUploading(false);
          reject(error);
        }
      }),
      {
        loading: "Uploading...",
        success: () => "File uploaded successfully",
        error: async (err: Error) => {
          const error = await handleFormSubmissionError(err, undefined, undefined);
          return error;
        },
        finally: () => {
          setIsUploading(false);
        },
      }
    );
  };

  return (
    <div className='relative w-full'>
      {!!portfolioBanner && (
        <>
          <Image
            src={portfolioBanner}
            alt='Portfolio Banner'
            fill
            className='object-cover object-center rounded-lg'
          />
          {/* overlay */}
          <div className='absolute top-0 left-0 right-0 bottom-0 bg-black/20 rounded-lg' />
        </>
      )}
      <VanillaFileInput
        label=''
        name='cover-photo'
        value=''
        className='h-[200px] w-full relative'
        labelClassName={cn(
          portfolioBanner &&
            "bg-transparent hover:bg-transparent !border-none text-white"
        )}
        setFile={handleFileChange}
      />
    </div>
  );
};

export default PortfolioBannerEdit;
