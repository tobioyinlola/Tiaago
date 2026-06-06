"use client";

import React, { useEffect, useState } from "react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity'
      role='dialog'
      aria-modal='true'
      aria-labelledby='modal-title'
    >
      <div className='relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200 overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900 dark:border dark:border-gray-800'>
        <div className='h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500' />

        <div className='p-6 sm:p-8'>
          <div className='mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30'>
            <svg
              className='h-8 w-8 text-indigo-600 dark:text-indigo-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={2}
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
              />
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
              />
            </svg>
          </div>

          <div className='text-center'>
            <h2
              id='modal-title'
              className='mb-2 text-xl font-bold text-gray-900 dark:text-white'
            >
              Upgrading Our Systems
            </h2>
            <p className='mb-6 text-sm text-gray-600 dark:text-gray-400 leading-relaxed'>
              We are currently upgrading to bring you an even better experience.
              <br />
              <strong>
                Sign-up and Sign-in are temporarily disabled.
              </strong>{" "}
              <br className='hidden sm:block' />
              Please check back in a little while!
            </p>
          </div>

          <button
            onClick={onClose}
            className='w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900'
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
