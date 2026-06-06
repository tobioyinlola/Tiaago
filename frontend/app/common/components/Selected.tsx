import { BsCheck } from "react-icons/bs";

import { cn } from "../utils";

const Selected = ({ isSelected = false, className = "" }) => {
  return (
    <div
      className={cn(
        "absolute right-5 top-5 w-4 h-4 border border-gray-300 rounded-full flex items-center justify-center",
        isSelected && "border-primary bg-primary",
        className
      )}
    >
      <BsCheck className='text-2xl text-white' />
    </div>
  );
};

export default Selected;
