import Link from "next/link";

import { cn, toId } from "@/app/common/utils";
import { jobFilters } from "../constants/jobFilters";

const JobFilters = ({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) => {
  return (
    <div className='card card-bordered shadow border-[#1414140D]'>
      <div className='card-body p-6 rounded-lg gap-4 font-dm-sans'>
        <h3 className='text-xl font-bold text-[#141414]'>Filters</h3>
        {jobFilters.map(filter => (
          <div key={filter.name}>
            <h4
              className={cn(
                "text-lg font-medium text-[#141414]",
                filter.name !== "Salary" && "mb-3"
              )}
            >
              {filter.name}
            </h4>
            {filter.name === "Salary" && (
              <div className='join w-full my-3'>
                {["Hourly", "Monthly", "Anually"].map(item => (
                  <input
                    key={item}
                    className='btn rounded-sm !text-[#393F47] text-[13px] bg-[#1414141A] p-2 join-item checked:!bg-[#3575E233] checked:!text-[#3575E2]'
                    type='radio'
                    name='salary-type'
                    aria-label={item}
                    value={item.toLowerCase()}
                  />
                ))}
              </div>
            )}
            <div className='flex flex-col gap-2'>
              {filter.options.map(option => (
                // <Link
                //   href={{
                //     query: {
                //       ...searchParams,
                //       [toId(filter.name)]: option.value,
                //     },
                //   }}
                // >
                <label
                  className='label cursor-pointer justify-start gap-2'
                  key={option.value}
                >
                  <input
                    name={toId(filter.name)}
                    value={option.value}
                    type={
                      filter.inputType === "checkbox" ? "checkbox" : "radio"
                    }
                    defaultChecked={
                      searchParams[toId(filter.name)] === option.value
                    }
                    className={
                      filter.inputType === "checkbox"
                        ? "checkbox checkbox-primary"
                        : "radio radio-primary"
                    }
                  />
                  <span className='label-text text-[#393F47] text-base'>
                    {option.name}
                  </span>
                </label>
                // </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobFilters;
