"use client";

import { toast } from "sonner";
import { Button } from "react-daisyui";
import { LuPlus } from "react-icons/lu";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { loadStripe, Stripe, StripeCardElement } from "@stripe/stripe-js";

import Modal from "@/app/common/components/Modal";
import { useAlert } from "@/app/common/store/useAlert";
import { cn, handleFormSubmissionError } from "@/app/common/utils";
import { addStripePaymentMethod } from "@/app/common/services/subscription";

const AddStripeCard = ({
  clientSecret,
  publishableKey,
  btnClassName,
  refresh = true,
  onSuccess,
}: {
  publishableKey: string;
  clientSecret: string;
  btnClassName?: string;
  refresh?: boolean;
  onSuccess?: () => void;
}) => {
  const router = useRouter();
  const setAlert = useAlert(s => s.setAlert);
  const modalRef = useRef<HTMLDialogElement>(null);

  const [loading, setLoading] = useState(false);
  const [stripe, setStripe] = useState<Stripe>();
  const [stripeCardEl, setStripeCardEl] = useState<StripeCardElement>();

  useEffect(() => {
    loadStripe(publishableKey)
      .then(stripe => {
        if (!stripe) {
          console.log(publishableKey);
          toast.error("Unable to initialize stipe.");
          return;
        }
        setStripe(stripe);
        const elements = stripe.elements();
        const card = elements.create("card");
        setStripeCardEl(card);
        card.mount("#card-element");
      })
      .catch(e => {
        handleFormSubmissionError(e);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeModal = () => modalRef.current?.close();
  const openModal = () => modalRef.current?.showModal();

  const hanndleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const { setupIntent, error } = await stripe!.confirmCardSetup(
        clientSecret,
        {
          payment_method: {
            card: stripeCardEl!,
          },
        }
      );

      if (error) {
        handleFormSubmissionError(error, undefined, setAlert);
      } else {
        const res = await addStripePaymentMethod(
          `${setupIntent.payment_method}`
        );
        // console.log({ res });
        toast.success("Card added successfully.");
        closeModal();
        if (refresh) router.refresh();
        onSuccess?.();
      }
    } catch (error) {
      handleFormSubmissionError(error, undefined, setAlert);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={openModal}
        className={cn(
          "w-full cursor-pointer h-[174px] flex flex-col items-center justify-center gap-2 font-poppins rounded-xl text-[#FEFEFF] px-6 py-3.5 bg-[#EBECEE]",
          btnClassName
        )}
      >
        <div className='w-[28px] h-[28px] bg-[#88898A] rounded-full flex items-center justify-center'>
          <LuPlus className='text-xl text-white' />
        </div>
        <p className='text-center text-lg text-[#88898A]'>Add a card</p>
      </button>
      <Modal
        id='add-stripe-card-modal'
        modalRef={modalRef}
        autoHeight
        disableClose={loading}
      >
        <form onSubmit={hanndleFormSubmit} className='w-[90svw] max-w-md'>
          <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold mb-2'>
            Add credit/debit card
          </h3>
          <p className='text-[#999] text-sm -tracking-[0.1px]'>
            All transactions are secure and encrypted
          </p>
          <div className='mt-6 border-t py-8'>
            <div
              id='card-element'
              className='border border-[#E1E3E5] rounded-2lg px-2 py-4'
            />
          </div>
          <Button
            loading={loading}
            disabled={!stripe || !stripeCardEl}
            className='btn btn-primary w-full my-6'
          >
            {loading ? "Adding..." : "Add Card"}
          </Button>
        </form>
      </Modal>
    </>
  );
};

export default AddStripeCard;
