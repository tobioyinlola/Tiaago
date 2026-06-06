import { toast } from "sonner";
import { useRef } from "react";
import { FiEdit } from "react-icons/fi";
import { PiDotsThreeVerticalBold } from "react-icons/pi";

import TrashIcon from "@/app/common/icons/TrashIcon";
import { useAlert } from "@/app/common/store/useAlert";
import { TalentPortfolioEducation } from "@/app/common/types";
import { handleFormSubmissionError } from "@/app/common/utils";
import { useTalentStore } from "@/app/talents/(dashboard)/store";
import TalentEducationModalForm from "./TalentEducationModalForm";
import { deleteTalentPortfolioEducation } from "@/app/common/services/talents";

type Props = {
  education: TalentPortfolioEducation;
};

const EducationMenu = ({ education }: Props) => {
  const modalRef = useRef<HTMLDialogElement>(null);
  const removeEducation = useTalentStore(s => s.removeEducation);
  const onEdit = () => modalRef.current?.showModal();
  const setAlert = useAlert(state => state.setAlert);

  const handleDelete = async () => {
    try {
      const res = await deleteTalentPortfolioEducation(education.id);
      if (res.success) {
        toast.success("Education deleted successfully");
        removeEducation(education.id);
      } else {
        setTimeout(() => {
          handleFormSubmissionError(res.error, undefined, setAlert);
        }, 100);
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
      message: "Do you you want to delete this Education?",
      icon: "warning",
      buttonText: "Delete",
      buttonAction: handleDelete,
      buttonClassName: "btn-error text-white",
    });

  return (
    <div className='ml-auto'>
      <div className='dropdown dropdown-hover max-md:dropdown-left'>
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
          className='dropdown-content z-[1] menu shadow bg-base-100 rounded-lg w-max px-[2px] py-[18px]'
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
      <TalentEducationModalForm
        education={education}
        buttonClassName='hidden'
        modalRef={modalRef}
      />
    </div>
  );
};

export default EducationMenu;
