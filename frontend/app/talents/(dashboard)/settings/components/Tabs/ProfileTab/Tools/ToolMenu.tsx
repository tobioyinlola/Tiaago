import { toast } from "sonner";
import { PiDotsThreeVerticalBold } from "react-icons/pi";

import TrashIcon from "@/app/common/icons/TrashIcon";
import { useAlert } from "@/app/common/store/useAlert";
import { TalentPortfolioTool } from "@/app/common/types";
import { handleFormSubmissionError } from "@/app/common/utils";
import { updatePortfolio } from "@/app/common/services/talents";
import { useTalentStore } from "@/app/talents/(dashboard)/store";

type Props = {
  tool: TalentPortfolioTool;
};

const ToolMenu = ({ tool }: Props) => {
  const [tools, setPortfolio] = useTalentStore(s => [
    s.portfolio?.tools || [],
    s.setPortfolio,
  ]);
  const setAlert = useAlert(state => state.setAlert);

  const handleDelete = async () => {
    try {
      const res = await updatePortfolio({
        tools: tools.filter(t => t.id !== tool.id).map(({ id }) => id) as any,
      });
      if (res.success) {
        toast.success("Tool deleted successfully");
        setPortfolio(res.data!);
      } else {
        handleFormSubmissionError(res.error, undefined, setAlert);
      }
    } catch (error) {
      handleFormSubmissionError(error, undefined, setAlert);
    }
  };

  const onDelete = () =>
    setAlert({
      title: "Are you sure?",
      message: "Do you you want to delete this Tool?",
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
              onClick={onDelete}
              className='flex items-center gap-6 text-[13px] font-medium px-4 py-2 min-w-[190px] text-error fill-error hover:text-white hover:fill-white hover:bg-error'
            >
              <TrashIcon className='text-2xl' />
              Delete
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ToolMenu;
