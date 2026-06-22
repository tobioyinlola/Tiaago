import Image from "next/image";
import dynamic from "next/dynamic";
import { Metadata } from "next";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";

import {
  getPaymentCards,
  getStripeClientSecret,
} from "@/app/common/services/subscription";
import { handleServerApiCallError } from "@/app/common/utils";

const AddStripeCard = dynamic(
  () => import("./_components/AddStripeCard")
);
const AddPaystackCard = dynamic(
  () => import("./_components/AddPaystackCard")
);
import InfoCircleIcon from "@/app/common/icons/InfoCircleIcon";
import { getCurrentUser } from "@/app/common/services/profile";
import DeletePaymentCardBtn from "./_components/DeletePaymentCardBtn";
import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";
import SetDeafaultPaymentCard from "./_components/SetDeafaultPaymentCard";

export const metadata: Metadata = {
  title: "Payment",
};

const getCardBrandImage = (brand: string) => {
  switch (brand.toLowerCase()) {
    case "visa":
      return "/assets/images/card-brands/visa.png";
    case "mastercard":
      return "/assets/images/card-brands/master-card.png";
    case "verve":
      return "/assets/images/card-brands/verve.png";
    default:
      return null;
  }
};

const PaymentPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];

  // Fetch all three in parallel -- they are independent
  const [userRes, stripeSecretRes, paymentCardsRes] = await Promise.all([
    getCurrentUser("startup"),
    getStripeClientSecret().catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log(
        "Get stripe client secret error (startup payment page): ",
        error
      );
      errors.push({
        message: error,
        title: "Error getting payment setup config data",
      });
      return { client_secret: "" };
    }),
    getPaymentCards(1, 3).catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get stripe cards error (startup payment page): ", error);
      errors.push({
        message: error,
        title: "Error payment cards",
      });
      return { results: [] };
    }),
  ]);
  const currentUser = userRes.currentUser;
  const stripeClientSecret = stripeSecretRes.client_secret;
  const paymentCards = paymentCardsRes.results;

  const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
  const paystackEmail = currentUser.email;
  const usePaystack = currentUser.country.toLowerCase() === "nigeria";
  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <h1 className='text-2xl font-medium font-switzer text-primary-black'>
        Payment
      </h1>

      <div className='grid sm:items-center sm:grid-cols-2 xl:grid-cols-3 gap-8 mt-10'>
        {paymentCards.map(card => (
          <div key={card.id} className='w-full'>
            <div className='w-full h-[178px] flex flex-col gap-4 justify-between font-poppins rounded-2lg text-white p-4 relative shadow-[0px_8px_8_8px_rgba(0,0,0,0.25)] bg-[linear-gradient(107deg,#000_0.73%,rgba(0,0,0,0.90)_1.2%,rgba(0,0,0,0.54)_71.25%,#000_100%)]'>
              <Image
                src='/assets/images/card-bg.png'
                alt='card-bg'
                fill
                className='object-cover object-right-top scale-[1.47082] opacity-10'
              />
              <div className='flex items-center justify-between relative'>
                <h6 className='text-base font-medium'>
                  {[currentUser.first_name, currentUser.last_name].join(" ")}
                </h6>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='43'
                  height='28'
                  viewBox='0 0 43 28'
                  fill='none'
                  className='relative'
                >
                  <path
                    d='M1 23V22.1382V16.5366V10.935V5.01626V4.5935C1 2.60886 2.60886 1 4.5935 1H28.8433H38C40.2091 1 42 2.80712 42 5.01626V10.935V16.5366V22.1382V23C42 25.2091 40.2091 27 38 27H21.5H5C2.79086 27 1 25.2091 1 23Z'
                    fill='#CFA93C'
                  />
                  <path
                    d='M13.8507 1.21138V5.01626M13.8507 22.1382H1M13.8507 22.1382H21.5M13.8507 22.1382V16.5366M1 22.1382V23C1 25.2091 2.79086 27 5 27H21.5M1 22.1382V16.5366M42 22.1382V23C42 25.2091 40.2091 27 38 27H21.5M42 22.1382H28.8433M42 22.1382V16.5366M21.5 27V22.1382M21.5 22.1382H28.8433M1 5.01626V4.5935V4.5935C1 2.60886 2.60886 1 4.5935 1H28.8433M1 5.01626H13.8507M1 5.01626V10.935M13.8507 5.01626V10.935M1 10.935H13.8507M1 10.935V16.5366M13.8507 10.935V16.5366M1 16.5366H13.8507M28.8433 1H38C40.2091 1 42 2.80712 42 5.01626V5.01626M28.8433 1V1C28.8433 3.20914 30.6341 5.01626 32.8433 5.01626H42M42 5.01626V10.935M42 10.935H32.8433C30.6341 10.935 28.8433 12.7258 28.8433 14.935V16.5366M42 10.935V16.5366M28.8433 22.1382V16.5366M28.8433 16.5366H42'
                    stroke='#493601'
                    strokeWidth='0.5'
                  />
                </svg>
              </div>
              {paymentCards.length > 1 && !card.is_default && (
                <DeletePaymentCardBtn id={card.id} />
              )}
              <div className='relative'>
                <p className='text-sm mb-2.5'>
                  **** **** **** {card.card_last4}
                </p>
                <div className='flex items-center gap-5 text-[10px]'>
                  <p>VALIDITY</p>
                  <p>
                    {card.exp_month}/{card.exp_year.toString().slice(2)}
                  </p>

                  {/* brand image */}
                  {!!getCardBrandImage(card.card_brand) && (
                    <Image
                      src={getCardBrandImage(card.card_brand)!}
                      alt={card.card_brand}
                      width={38}
                      height={25}
                      className='object-cover ml-auto'
                    />
                  )}
                </div>
              </div>
            </div>
            {card.is_default ? (
              <div className='flex items-center text-[#88898A] gap-2 mt-2'>
                <InfoCircleIcon size={20} />
                <p className='text-base'>
                  This card will be billed for payments
                </p>
              </div>
            ) : (
              <div className='flex items-center justify-end relative mt-2'>
                <SetDeafaultPaymentCard id={card.id} />
              </div>
            )}
          </div>
        ))}
        {paymentCards.length < 3 && (
          <>
            {usePaystack ? (
              <AddPaystackCard
                publickey={paystackPublicKey ?? ""}
                email={paystackEmail ?? ""}
              />
            ) : (
              <AddStripeCard
                clientSecret={stripeClientSecret}
                publishableKey={process.env.STRIPE_PUBLISHABLE_KEY ?? ""}
              />
            )}
          </>
        )}
      </div>

      <div className='w-full rounded-t-xl pl-6 pr-2 h-20 mt-10 border border-[#F5F5F5] bg-[#EBECEE] flex items-center'>
        <h2 className='text-base md:text-lg font-semibold text-[#343A40]'>
          Payment History
        </h2>
      </div>
      <div className='bg-white border border-[#E1E3E5] rounded-b-xl flex-1'>
        <EmptyStateV3
          imgHeight={150}
          imgWidth={150}
          text='You haven’t made any payments yet'
          subText='All payment details made to talents will be displayed here'
        />
      </div>
    </>
  );
};

export default PaymentPage;
