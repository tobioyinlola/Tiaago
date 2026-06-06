import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import ScrollArea from "@/app/common/components/ScrollArea";
import ServerPagination from "@/app/common/components/ServerPagination";
import StatusBadge from "@/app/common/components/StatusBadge";
import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";
import { getReferralWithdrawals } from "@/app/common/services/profile";
import { formatPrice, handleServerApiCallError } from "@/app/common/utils";
import { format } from "date-fns";
import AdminReferralWithdrawalActions from "./_components/AdminReferralWithdrawalActions";

export const metadata = {
  title: "Referral Withdrawal Requests",
};

const formatCurrency = (value?: string | number | null) => {
  return formatPrice({
    price: value ? +value : 0,
    noOfDigits: 0,
  });
};

const formatDateTime = (value?: string | null) =>
  value ? format(new Date(value), "yyyy-MM-dd HH:mm a") : "-";

const ReferralWithdrawalRequestsPage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const _page = resolvedSearchParams?.page
    ? parseInt(resolvedSearchParams.page as string, 10)
    : 1;
  const page = Number.isNaN(_page) ? 1 : _page;

  const withdrawalRes = await getReferralWithdrawals(page).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get referral withdrawals error (admin): ", error);
    errors.push({
      title: "Error getting referral withdrawals",
      message: error,
    });
    return null;
  });

  const withdrawals = withdrawalRes?.results ?? [];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <div className='flex max-sm:flex-col-reverse sm:items-center sm:justify-between'>
          <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
            Referral Withdrawal Requests
          </h1>
        </div>
        <h4 className='text-gray-900 text-sm md:text-base'>
          View and track referral reward withdrawal requests
        </h4>
      </div>
      <ScrollArea className='mb-8 dashboard-content-constraint'>
        <table className='table table-zebra text-sm text-center border rounded'>
          <thead>
            <tr>
              <th>Talent</th>
              <th>Email</th>
              {/* <th>Amount</th>
              <th>Fee</th> */}
              <th>Net Amount</th>
              <th>Bank</th>
              <th>Account Number</th>
              <th>Account Name</th>
              <th>Reference</th>
              <th>Status</th>
              <th>Requested</th>
              <th />
              {/* <th className='max-lg:hidden'>Last Updated</th> */}
            </tr>
          </thead>
          <tbody className='text-[#101828] text-xs'>
            {withdrawals.length ? (
              withdrawals.map(withdrawal => (
                <tr key={withdrawal.id}>
                  <td>{withdrawal.talent_name || "-"}</td>
                  <td>{withdrawal.talent_email || "-"}</td>
                  {/* <td>{formatCurrency(withdrawal.amount)}</td>
                  <td>{formatCurrency(withdrawal.fee)}</td> */}
                  <td>{formatCurrency(withdrawal.net_amount)}</td>
                  <td>{withdrawal.bank_name || "-"}</td>
                  <td className='font-mono'>
                    {withdrawal.account_number || "-"}
                  </td>
                  <td className='font-mono text-xs'>
                    {withdrawal.account_name || "-"}
                  </td>
                  <td className='font-mono text-xs'>
                    {withdrawal.reference || "-"}
                  </td>
                  <td className='capitalize'>
                    <StatusBadge
                      status={withdrawal.status.toLowerCase() as any}
                    />
                  </td>
                  <td>{formatDateTime(withdrawal.date_created)}</td>
                  {/* <td className='max-lg:hidden'>
                    {formatDateTime(withdrawal.date_modified)}
                  </td> */}
                  <td>
                    <AdminReferralWithdrawalActions id={withdrawal.id} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11}>
                  <EmptyStateV3 text='No referral withdrawal requests found...' />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="h-36" />
      </ScrollArea>
      {!!withdrawalRes && (
        <ServerPagination
          pagedResource={withdrawalRes}
          searchParams={resolvedSearchParams}
        />
      )}
    </>
  );
};

export default ReferralWithdrawalRequestsPage;
