"use client";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";
import Button from "@/app/common/components/DaisyButton";
import { RiEyeLine, RiEyeOffLine } from "react-icons/ri";

import { cn } from "@/app/common/utils";
import Modal from "@/app/common/components/Modal";
import Selected from "@/app/common/components/Selected";

const items = [
  {
    title: "Searchable on Tiaago",
    description:
      "Employers can find your resume in a search through Tiaago, according to our terms. We attempt to hide identifiable details until you respond to employers",
    Icon: RiEyeLine,
  },
  {
    title: "Not Searchable on Tiaago",
    description:
      "Employers can't find your resume in a search through Tiaago or contact you about jobs. However, employers you have been in contacts will still be able to contact to you",
    Icon: RiEyeOffLine,
  },
];

type ResumePrivacyModalProps = { modalRef: React.RefObject<HTMLDialogElement> };

const ResumePrivacyModal = ({ modalRef }: ResumePrivacyModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");

  const handleSelectOption = () => {
    if (isLoading) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      modalRef.current?.close();
      toast.success("Resume privacy updated successfully");
    }, 2000);
  };

  return (
    <Modal
      id='update-resume-privacy-modal'
      modalRef={modalRef}
      disableClose={isLoading}
    >
      <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold'>
        Privacy Settings
      </h3>
      <p className='text-[#999] text-sm -tracking-[0.1px]'>
        Kindly Select your privacy setting
      </p>
      <div className='flex flex-col gap-8 my-5 w-full'>
        {items.map(({ title, description, Icon }) => (
          <div
            key={title}
            onClick={() => setSelectedOption(title)}
            className={cn(
              "card card-bordered max-sm:card-compact cursor-pointer hover:border-primary shadow-sm",
              selectedOption === title && "border-primary"
            )}
          >
            <div className='card-body'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Icon className='text-2xl text-[#292D32] rotate-180' />
                  <h4 className='card-title text-gray-900 max-md:break-words'>
                    {title}
                  </h4>
                </div>
                <Selected
                  isSelected={selectedOption === title}
                  className='static'
                />
              </div>
              <ul className='list-disc flex flex-col gap-3 mt-6 pl-4'>
                <li className='list-item text-sm font-medium text-[#23262F]'>
                  {description}
                </li>
              </ul>
            </div>
          </div>
        ))}
      </div>
      <Link
        target='_blank'
        href='/privacy'
        className='btn btn-link text-neutral'
      >
        Privacy Policy
      </Link>
      <div className='modal-action gap-3'>
        <form method='dialog' className='flex-1 md:flex-[0.4]'>
          <button
            className='btn btn-outline w-full border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-700'
            disabled={isLoading}
          >
            Cancel
          </button>
        </form>
        <Button
          className='btn btn-primary flex-1 md:flex-[0.4]'
          onClick={handleSelectOption}
          loading={isLoading}
          disabled={!selectedOption}
        >
          sav{isLoading ? "ing..." : "e"}
        </Button>
      </div>
    </Modal>
  );
};

export default ResumePrivacyModal;
