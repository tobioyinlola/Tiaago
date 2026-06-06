import { toast } from "sonner";
import { useRef } from "react";
import { FiEdit } from "react-icons/fi";
import { PiDotsThreeVerticalBold } from "react-icons/pi";

import TrashIcon from "@/app/common/icons/TrashIcon";
import { useAlert } from "@/app/common/store/useAlert";
import { handleFormSubmissionError } from "@/app/common/utils";
import WorkExperienceModalForm from "./WorkExperienceModalForm";
import { useTalentStore } from "@/app/talents/(dashboard)/store";
import { TalentPortfolioWorkExperience } from "@/app/common/types";
import { deletePortfolioExperience } from "@/app/common/services/talents";

type Props = {
  experience: TalentPortfolioWorkExperience;
};

const ExperienceMenu = ({ experience }: Props) => {
  const modalRef = useRef<HTMLDialogElement>(null);
  const removeExperience = useTalentStore(s => s.removeExperience);
  const onEdit = () => modalRef.current?.showModal();
  const setAlert = useAlert(state => state.setAlert);

  const handleDelete = async () => {
    try {
      const res = await deletePortfolioExperience(experience.id);
      if (!res.success) {
        throw new Error(res.error);
      } else {
        toast.success("Work experience deleted successfully");
        removeExperience(experience.id);
      }
    } catch (error) {
      setTimeout(() => {
        handleFormSubmissionError(error, undefined, setAlert);
      }, 100);
    }
  };

  const onDelete = () =>
    setAlert({
      title: "Are you sure?",
      message: "Do you you want to delete this Work Experience?",
      icon: "warning",
      buttonText: "Delete",
      buttonAction: handleDelete,
      buttonClassName: "btn-error text-white",
    });

  return (
    <div className='ml-5'>
      <div className='dropdown dropdown-hover dropdown-left'>
        <div
          tabIndex={0}
          className='w-6 h-6 cursor-pointer'
          aria-label='open menu'
          role='button'
        >
          <PiDotsThreeVerticalBold className='text-2xl' />
        </div>
        <ul
          tabIndex={0}
          className='dropdown-content z-[1] menu shadow bg-base-100 rounded-lg w-max px-1 space-y-0.5 py-[18px]'
        >
          <li>
            <a
              onClick={onEdit}
              className='flex items-center gap-6 text-[13px] font-medium text-[#7F7F7F] hover:text-[#292D32] fill-[#7F7F7F] hover:fill-[#292D32] hover:bg-[#D9DDFF66] px-4 py-2 min-w-[190px]'
            >
              <FiEdit className='text-2xl' />
              Edit
            </a>
          </li>
          <li>
            <a
              onClick={onDelete}
              className='flex items-center gap-6 text-[13px] font-medium px-4 py-2 min-w-[190px] text-error fill-error hover:text-white hover:fill-white hover:bg-error'
            >
              <TrashIcon className='text-2xl' />
              Delete
            </a>
          </li>
        </ul>
      </div>
      <WorkExperienceModalForm
        experience={experience}
        buttonClassName='hidden'
        modalRef={modalRef}
      />
    </div>
  );
};

export default ExperienceMenu;
