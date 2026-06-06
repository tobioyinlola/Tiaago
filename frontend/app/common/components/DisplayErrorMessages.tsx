"use client";
import { toast } from "sonner";
import { useEffect } from "react";

import { formatErrorMessage } from "../utils";

const truncate = (str: string, len: number) => {
  const _str = str.slice(0, len);
  return _str.length < str.length ? `${_str}...` : _str;
};

export type DisplayErrorMessagesProps = {
  errors: {
    message: string;
    title: string;
  }[];
};

const DisplayErrorMessages = ({ errors }: DisplayErrorMessagesProps) => {
  useEffect(() => {
    errors.forEach(error =>
      toast.error(error.title, {
        description: formatErrorMessage(
          // limit length of error.message
          truncate(error.message, 200)
        ),
        duration: Infinity,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default DisplayErrorMessages;
