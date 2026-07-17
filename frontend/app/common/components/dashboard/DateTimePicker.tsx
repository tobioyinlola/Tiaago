"use client";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { cn } from "@/app/common/utils";

type Props = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  placeholder?: string;
  className?: string;
};

// Mirrors the styling convention in Forms/FormikYearPickerField.tsx (the
// codebase's only other react-datepicker usage) -- extended here with time
// selection for the campaign wizard's schedule step.
const DateTimePicker = ({ value, onChange, minDate, placeholder = "Select date and time", className }: Props) => (
  <DatePicker
    selected={value}
    onChange={onChange}
    showTimeSelect
    timeIntervals={15}
    dateFormat="MMM d, yyyy h:mm aa"
    minDate={minDate}
    placeholderText={placeholder}
    className={cn("w-full bg-white input input-bordered border-[#D0D5DD]", className)}
  />
);

export default DateTimePicker;
