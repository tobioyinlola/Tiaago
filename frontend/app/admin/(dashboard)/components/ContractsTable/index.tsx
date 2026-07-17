import { isAfter } from "date-fns";
import { PiHandCoins } from "react-icons/pi";
import type { PropsWithChildren } from "react";

import { Contract } from "@/app/common/types";
import { cn, formatPrice } from "@/app/common/utils";
import SearchBar from "@/app/common/components/SearchBar";
import { ButtonModal } from "@/app/common/components/Modal";
import ScrollArea from "@/app/common/components/ScrollArea";
import StatusBadge from "@/app/common/components/StatusBadge";
import CopyToClipboard from "@/app/common/components/CopyToClipboard";
import EmptyState from "@/app/common/components/dashboard/EmptyState";
import DeleteContractModal from "@/app/recruiter/dashboard/components/TalentDetailsTable/DeleteContractModal";

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
              <th className='max-sm:hidden'>Contract ID</th>
              <th>Recruiter</th>
              <th>Talent</th>
              <th>Project/Role</th>
              <th>Value</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.length ? (
              children
            ) : (
              <tr>
                <td colSpan={7}>
                  <EmptyState text='There are currently no contracts...' />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
    </>
  );
};

const ContractsTable = ({
  data = [],
}: Omit<BaseProps, "children" | "className">) => {
  const className =
    "select select-sm select-bordered text-[#2E2E2E] font-medium join-item focus:outline-none";
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
        {data.map(contract => {
          return (
            <tr key={contract.id}>
              <td className='max-sm:hidden'>{contract.id}</td>
              <td className='capitalize'>{contract.company}</td>
              <td>{contract.full_name}</td>
              <td className='max-sm:hidden'>{contract.role_name}</td>
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
              <td className='flex items-center gap-2'>
                <DeleteContractModal id={contract.id} />
                <ButtonModal
                  id={`contract-payment-details-${contract.id}`}
                  icon={<PiHandCoins />}
                  buttonClassName='bg-transparent border-none'
                >
                  <div className='w-[80svw] max-w-md'>
                    <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold mb-2'>
                      View Payment Details
                    </h3>
                    <p className='text-[#999] text-sm -tracking-[0.1px]'>
                      Kindly view the payment details for this contract
                    </p>
                    <div className='mt-6 border-t py-8'>
                      <div className='form-control w-full'>
                        <label className='label label-text text-gray-700 font-medium'>
                          Account Name
                        </label>
                        <input
                          className='input input-bordered w-full input-primary bg-white'
                          disabled
                          value={contract.account_name ?? "N/A"}
                        />
                      </div>
                      <div className='form-control w-full'>
                        <label className='label label-text text-gray-700 font-medium'>
                          Account Number
                        </label>
                        <div className='flex'>
                          <input
                            className='input input-bordered w-full input-primary bg-white'
                            disabled
                            value={contract.account_number ?? "N/A"}
                          />
                          <CopyToClipboard text={contract.account_number} />
                        </div>
                      </div>
                      <div className='form-control w-full'>
                        <label className='label label-text text-gray-700 font-medium'>
                          Bank Name
                        </label>
                        <input
                          className='input input-bordered w-full input-primary bg-white'
                          disabled
                          value={contract.bank_name ?? "N/A"}
                        />
                      </div>

                      {/* amount to pay */}
                      <div className='form-control w-full'>
                        <label className='label label-text text-gray-700 font-medium'>
                          Amount to Pay
                        </label>
                        <input
                          className='input input-bordered w-full input-primary bg-white'
                          disabled
                          value={formatPrice({
                            price: contract.value,
                          })}
                        />
                      </div>

                      <div className='form-control w-full'>
                        <label className='label label-text text-gray-700 font-medium'>
                          Company
                        </label>
                        <input
                          className='input input-bordered w-full input-primary bg-white'
                          disabled
                          value={contract.company ?? "N/A"}
                        />
                      </div>
                      <div className='form-control w-full'>
                        <label className='label label-text text-gray-700 font-medium'>
                          Company Email
                        </label>
                        <input
                          className='input input-bordered w-full input-primary bg-white'
                          disabled
                          value={(contract as any).company_email ?? "N/A"}
                        />
                      </div>
                      <div className='form-control w-full'>
                        <label className='label label-text text-gray-700 font-medium'>
                          Talent Email
                        </label>
                        <input
                          className='input input-bordered w-full input-primary bg-white'
                          disabled
                          value={contract.talent_email ?? "N/A"}
                        />
                      </div>
                      <div className='form-control w-full'>
                        <label className='label label-text text-gray-700 font-medium'>
                          Talent
                        </label>
                        <input
                          className='input input-bordered w-full input-primary bg-white'
                          disabled
                          value={contract.full_name ?? "N/A"}
                        />
                      </div>
                    </div>
                  </div>
                </ButtonModal>
              </td>
            </tr>
          );
        })}
      </BaseTable>
    </>
  );
};

export default ContractsTable;
