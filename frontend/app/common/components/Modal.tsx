"use client";
import React, { createRef } from "react";

import { cn, openModal } from "../utils";
import ScrollArea from "./ScrollArea";

export type ModalProps = {
  id: string;
  children: React.ReactNode;
  modalRef?: React.RefObject<HTMLDialogElement>;
  disableBackdropClick?: boolean;
  disableClose?: boolean;
  disablePadding?: boolean;
  disableBorderRadius?: boolean;
  autoHeight?: boolean;
  className?: string;
  scrollAreaClassName?: string;
  scrollAreaId?: string;
};

const Modal = ({
  children,
  modalRef,
  id,
  disableBackdropClick,
  disableClose,
  disablePadding,
  disableBorderRadius,
  className,
  scrollAreaClassName,
  scrollAreaId,
  autoHeight,
}: ModalProps) => {
  return (
    <dialog
      ref={modalRef}
      id={id}
      className='modal backdrop-blur bg-black/20'
      onKeyDown={e => {
        if (disableClose) e.preventDefault();
      }}
    >
      <div
        className={cn(
          "relative max-w-[100svw] md:max-w-lg -mb-[2em] max-sm:px-2 sm:-mb-[3.5em]",
          className
        )}
        style={{ gridColumnStart: 1, gridRowStart: 1 }}
      >
        <form
          method='dialog'
          className='absolute right-2 top-0 -translate-y-[calc(100%+8px)] sm:-translate-y-[calc(100%+16px)]'
        >
          <button
            className='btn btn-sm btn-circle btn-ghost bg-white text-black hover:bg-gray-200 text-base'
            disabled={disableClose}
            aria-label='close modal'
          >
            ✕
          </button>
        </form>
        <ScrollArea
          className={cn(
            "modal-box w-full h-[calc(100svh-12em)] sm:h-[calc(100svh-6em)] text-black",
            disablePadding && "p-0",
            disableBorderRadius && "rounded-none",
            autoHeight && "h-fit sm:h-fit",
            scrollAreaClassName
          )}
          verticalScrollClassName='mr-1 my-2'
          id={scrollAreaId}
        >
          {children}
        </ScrollArea>
      </div>
      <form method='dialog' className='modal-backdrop'>
        <button disabled={disableBackdropClick || disableClose}>close</button>
      </form>
    </dialog>
  );
};

type ButtonModalProps = {
  buttonText?: string;
  buttonClassName?: string;
  icon?: React.ReactNode;
  modalRef?: ModalProps["modalRef"];
  unStyled?: boolean;
} & Omit<ModalProps, "modalRef">;

export const ButtonModal = ({
  buttonText,
  buttonClassName,
  icon,
  modalRef,
  unStyled,
  ...modalProps
}: ButtonModalProps) => {
  const _modalRef = modalRef ?? createRef<HTMLDialogElement>();
  return (
    <>
      <button
        type='button'
        className={cn(
          unStyled ? "" : "btn font-medium text-base",
          buttonClassName
        )}
        onClick={() => _modalRef.current?.showModal()}
      >
        {buttonText}
        {icon}
      </button>
      <Modal {...modalProps} modalRef={_modalRef} />
    </>
  );
};

type OpenModalByIdButtonProps = {
  modalId: string;
} & Omit<
  React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  >,
  "onClick"
>;

export const OpenModalByIdButton = ({
  modalId,
  ...props
}: OpenModalByIdButtonProps) => (
  <button {...props} type='button' onClick={() => openModal(modalId)} />
);

export default Modal;
