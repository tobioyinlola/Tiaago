import { format, isAfter } from "date-fns";
import type { PropsWithChildren } from "react";

import SortIcon from "@/app/common/icons/SortIcon";
import { cn, formatPrice } from "@/app/common/utils";
import DeleteContractModal from "./DeleteContractModal";
import { Contract, TalentRole } from "@/app/common/types";
import SearchBar from "@/app/common/components/SearchBar";
import ScrollArea from "@/app/common/components/ScrollArea";
import StatusBadge from "@/app/common/components/StatusBadge";
import EmptyState from "@/app/common/components/dashboard/EmptyState";

type BaseProps = PropsWithChildren<{
  data: Contract[];
  className?: string;
}>;

const BaseTable = ({ data, children, className }: BaseProps) => {
  return (
    <>
      <ScrollArea
        className={cn(
          "border mb-8 border-t-0 rounded-b-lg dashboard-content-constraint",
          className
        )}
      >
        <table className='table table-zebra'>
          {/* head */}
          <thead>
            <tr>
              <th className='max-sm:hidden'>S/N</th>
              <th>Talent</th>
              <th className='max-sm:hidden'>Role</th>
              <th>Date Employed</th>
              <th>Expires</th>
              <th>Pay</th>
              <th>Status</th>
              {/* <th /> */}
            </tr>
          </thead>
          <tbody>
            {data.length ? (
              children
            ) : (
              <tr>
                <td colSpan={7}>
                  <EmptyState text="You currently don't any hired talents..." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
    </>
  );
};

export const TalentDetailsTable = ({
  data = [],
  title = "Talents",
}: Omit<BaseProps, "children"> & {
  title?: string;
}) => {
  return (
    <>
      <div className='w-full rounded-t-lg pl-6 pr-2 h-20 bg-[#EBECEE] mt-8 flex items-center justify-between'>
        <h4 className='text-base font-semibold'>{title}</h4>
        <div className='border-l flex items-center'>
          <button className='btn btn-sm btn-ghost bg-white mx-[14px]'>
            <SortIcon />
          </button>
          <button className='btn btn-ghost bg-white'>View All</button>
        </div>
      </div>
      <BaseTable data={data} />
    </>
  );
};

export const EmployedTalentsTable = ({
  data = [],
}: Omit<BaseProps, "children" | "className">) => {
  const className =
    "select select-sm select-bordered text-[#2E2E2E] font-medium join-item focus:outline-none max-sm:grow";
  return (
    <>
      <div className='w-full pl-6 pr-2 py-[14px] bg-[#D9DDFF] mb-8 flex max-sm:flex-col sm:items-center gap-1 justify-between'>
        <SearchBar />
        <div className='border-l flex items-center join'>
          <select className={className} defaultValue=''>
            <option disabled value=''>
              Filter
            </option>
          </select>
          <select className={className} defaultValue=''>
            <option disabled value=''>
              From
            </option>
          </select>
          <select className={className} defaultValue=''>
            <option disabled value=''>
              To
            </option>
          </select>
        </div>
      </div>
      <BaseTable data={data} className='border-t rounded'>
        {data.map((contract, index) => {
          return (
            <tr key={contract.id}>
              <td className='max-sm:hidden'>{index + 1}</td>
              <td>{contract.full_name}</td>
              <td className='max-sm:hidden'>{contract.role_name}</td>
              <td>
                <div className='font-medium w-fit'>
                  <h6>{format(new Date(contract.created), "MMM dd, yyyy")}</h6>
                  <p className='text-[#667085] text-center'>
                    {format(new Date(contract.created), "hh:mm a")}
                  </p>
                </div>
              </td>
              <td>
                <div className='font-medium w-fit'>
                  <h6>{format(new Date(contract.expires), "MMM dd, yyyy")}</h6>
                  <p className='text-[#667085] text-center'>
                    {format(new Date(contract.expires), "hh:mm a")}
                  </p>
                </div>
              </td>
              <td>
                {formatPrice({
                  price: contract.value,
                  noOfDigits: 0,
                })}
              </td>
              <td>
                <StatusBadge
                  status={
                    isAfter(new Date(), new Date(contract.expires))
                      ? "expired"
                      : "active"
                  }
                />
              </td>
              <td>
                <DeleteContractModal id={contract.id} />
              </td>
            </tr>
          );
        })}
      </BaseTable>
    </>
  );
};

// export default TalentDetailsTable;
