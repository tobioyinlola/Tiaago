"use client";

import { format } from "date-fns";

type FormatOptions = Parameters<typeof format>[2];

type Props = {
  date: string;
  formatStr: string;
  options?: FormatOptions;
  className?: string;
};

const RenderDate = ({ date, formatStr, options, className }: Props) => {
  if (!date) return null;
  const _date = new Date(date);
  return (
    <time className={className} dateTime={_date.toString()}>
      {format(_date, formatStr, options)}
    </time>
  );
};

export default RenderDate;
