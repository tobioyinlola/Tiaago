// Remove Trash2 import since it's now in the DeleteCouponButton component

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import CouponModalForm from "./_components/CouponModalForm";
import ScrollArea from "@/app/common/components/ScrollArea";
import { handleServerApiCallError } from "@/app/common/utils";
import AddCommunityModal from "./_components/AddCommunityModal";
import { DeleteCouponButton } from "./_components/DeleteCouponButton";
import ServerPagination from "@/app/common/components/ServerPagination";
import { getCommunities, getCoupons } from "@/app/common/services/payments";
import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";
// import { useAlert } from "@/app/common/store/useAlert";

export const metadata = {
  title: "Coupons",
};

const CouponsPage = async ({
  searchParams,
}: {
  searchParams: Promise<any>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const _page = resolvedSearchParams.page
    ? parseInt(resolvedSearchParams.page as string)
    : 1;
  const page = isNaN(_page) ? 1 : _page;

  const [communitiesRes, couponsRes] = await Promise.all([
    getCommunities(undefined, 1000000).catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get communities error (admin => coupons): ", error);
      errors.push({
        message: error,
        title: "Error getting communities",
      });
      return null;
    }),
    getCoupons(page).catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get coupons error (admin => coupons): ", error);
      errors.push({
        message: error,
        title: "Error getting coupons",
      });
      return null;
    }),
  ]);

  const communities = communitiesRes?.results || [];
  const coupons = couponsRes?.results || [];

  // Delete handler (server action)
  //   async function handleDeleteCoupon(id: number) {
  //     const alertStore = useAlert();
  //     alertStore.setAlert({
  //       title: "Delete Coupon",
  //       message: "Are you sure you want to delete this coupon?",
  //       icon: "warning",
  //       buttonText: "Delete",
  //       buttonAction: async () => {
  //         await deleteCoupon(id);
  //         // Optionally refresh page or show success
  //       },
  //     });
  //   }

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <div className='flex max-sm:flex-col-reverse sm:items-center sm:justify-between'>
          <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
            Coupons
          </h1>
          <div className='flex items-center gap-2'>
            <AddCommunityModal refresh />
            <CouponModalForm communities={communities} refresh />
          </div>
        </div>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Manage coupons for communities
        </h4>
      </div>
      <ScrollArea className='border mb-8 rounded dashboard-content-constraint'>
        <table className='table table-zebra text-sm text-center'>
          <thead>
            <tr>
              <th>Code</th>
              <th>Community</th>
              <th>Discount (NGN)</th>
              <th>Discount (USD)</th>
              <th>Discount (%)</th>
              <th>Max Usage</th>
              <th>Used</th>
              <th className='max-lg:hidden'>Remaining Uses</th>
              <th>Expires At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className='text-[#101828] text-xs'>
            {coupons.length ? (
              coupons.map(coupon => (
                <tr key={coupon.id}>
                  <td>{coupon.code}</td>
                  <td>{coupon.community_name}</td>
                  <td>{coupon.discount_amount_ngn || "-"}</td>
                  <td>{coupon.discount_amount_usd || "-"}</td>
                  <td>{coupon.discount_percent || "-"}</td>
                  <td>{coupon.max_usage}</td>
                  <td>{coupon.used_count}</td>
                  <td className='max-lg:hidden'>{coupon.remaining_uses}</td>
                  <td>{coupon.expires_at?.slice(0, 10)}</td>
                  <td className='flex gap-2'>
                    <CouponModalForm
                      coupon={coupon}
                      communities={communities}
                      refresh
                    />
                    <DeleteCouponButton couponId={coupon.id} refresh />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10}>
                  <EmptyStateV3 text='No coupons found...' />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
      {!!couponsRes && (
        <ServerPagination
          pagedResource={couponsRes}
          searchParams={resolvedSearchParams}
        />
      )}
    </>
  );
};

export default CouponsPage;
