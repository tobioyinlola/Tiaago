import { format, isAfter } from "date-fns";

import { Contract } from "@/app/common/types";
import { formatPrice } from "@/app/common/utils";
import ScrollArea from "@/app/common/components/ScrollArea";
import StatusBadge from "@/app/common/components/StatusBadge";
import EmptyState from "@/app/common/components/dashboard/EmptyState";

const JobContractsTable = ({ data = [] }: { data: Contract[] }) => {
  return (
    <ScrollArea className='border rounded-lg mb-8 dashboard-content-constraint'>
      <table className='table table-zebra'>
        {/* head */}
        <thead>
          <tr>
            <th className='max-sm:hidden'>S/N</th>
            <th>Company</th>
            <th className='max-sm:hidden'>Role</th>
            <th>Expires</th>
            <th>Pay</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.length ? (
            data.map((contract, index) => {
              return (
                <tr key={contract.id}>
                  <td className='max-sm:hidden'>{index + 1}</td>
                  <td className='capitalize'>{contract.company}</td>
                  <td className='max-sm:hidden'>{contract.role_name}</td>
                  <td>
                    <div className='font-medium w-fit'>
                      <h6>
                        {format(new Date(contract.expires), "MMM dd, yyyy")}
                      </h6>
                      <p className='text-[#667085] text-center'>
                        {format(new Date(contract.expires), "hh:mm a")}
                      </p>
                    </div>
                  </td>
                  <td>
                    {formatPrice({
                      price: contract.value,
                      noOfDigits: 0,
                      currencyCode: contract.currency,
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
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6}>
                <EmptyState text='No job contracts here...' />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </ScrollArea>
  );
};

export default JobContractsTable;
