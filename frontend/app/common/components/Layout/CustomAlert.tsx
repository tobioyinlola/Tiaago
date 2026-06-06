"use client";
import { Button } from "react-daisyui";
import { useRouter } from "next/navigation";
import { BsXCircleFill } from "react-icons/bs";
import { useEffect, useRef, useState } from "react";
import { HiMiniInformationCircle } from "react-icons/hi2";

import Modal from "../Modal";
import { cn } from "../../utils";
import SuccessIcon from "../../icons/SuccessIcon";
import RetryIcon from "@/app/common/icons/RetryIcon";
import { Alert, useAlert } from "../../store/useAlert";
import WarningIcon from "@/app/common/icons/WarningIcon";

const CustomAlert = () => {
  const [alert, setAlert] = useAlert(state => [state.alert, state.setAlert]);
  const [loading, setLoading] = useState(false);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (alert) modalRef.current?.showModal();
    else modalRef.current?.close();
  }, [alert]);

  return (
    <Modal
      modalRef={modalRef}
      autoHeight
      id='custom-alert-modal'
      disableClose={loading}
    >
      {!alert ? null : (
        <AlertContent
          alert={alert}
          setAlert={setAlert}
          loading={loading}
          setLoading={setLoading}
          secondaryLoading={secondaryLoading}
          setSecondaryLoading={setSecondaryLoading}
        />
      )}
    </Modal>
  );
};

export default CustomAlert;

type AlertContentProps = {
  alert: Alert;
  setAlert: (alert?: Alert) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  secondaryLoading: boolean;
  setSecondaryLoading: (loading: boolean) => void;
};

const AlertContent = ({
  alert,
  setAlert,
  loading,
  setLoading,
  secondaryLoading,
  setSecondaryLoading,
}: AlertContentProps) => {
  const router = useRouter();
  const {
    title,
    message,
    icon,
    buttonText = "Ok",
    buttonAction,
    buttonLink,
    buttonClassName,
    secondaryButton,
    messageClassName,
    titleClassName,
  } = alert;

  const getIcon = () => {
    switch (icon) {
      case "error":
        return <BsXCircleFill className='text-8xl text-red-500' />;
      case "warning":
        return <WarningIcon />;
      case "info":
        return <HiMiniInformationCircle className='text-8xl text-primary' />;
      case "success":
        return <SuccessIcon />;
      case "retry":
        return <RetryIcon />;
      default:
        return null;
    }
  };

  const Icon = getIcon();
  const onClick = async () => {
    if (loading) return;
    if (secondaryLoading) return;
    setLoading(true);
    await buttonAction?.();
    setLoading(false);
    buttonLink && router.push(buttonLink);
    setAlert();
  };

  const onSecondaryButtonClick = async () => {
    if (loading) return;
    if (secondaryLoading) return;
    setSecondaryLoading(true);
    await secondaryButton?.action?.();
    setSecondaryLoading(false);
    setAlert();
  };

  return (
    <>
      <div className='flex flex-col items-center w-[80svw] max-w-md'>
        {Icon}
        <h3
          className={cn(
            "text-2xl font-medium mb-2 font-space-grotesk text-center",
            message && "text-3xl font-semibold",
            Icon && "mt-5",
            titleClassName
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            "text-[#999] text-sm -tracking-[0.1px] text-center",
            messageClassName
          )}
        >
          {message}
        </p>
      </div>
      <div className='modal-action'>
        {secondaryButton && (
          <Button
            disabled={loading}
            loading={secondaryLoading}
            className={cn("btn flex-1", secondaryButton.className)}
            onClick={onSecondaryButtonClick}
          >
            {secondaryLoading ? "Loading..." : secondaryButton.text}
          </Button>
        )}
        <Button
          loading={loading}
          disabled={secondaryLoading}
          className={cn("btn btn-primary flex-1", buttonClassName)}
          onClick={onClick}
        >
          {loading ? "Loading..." : buttonText}
        </Button>
      </div>
    </>
  );
};
