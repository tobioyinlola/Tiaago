"use client";
import { Field } from "formik";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css"; // Import the styles

import { cn } from "../../utils";
import { format } from "date-fns";

type Props = {
  name: string;
  value: any;
  error?: string;
  touched?: boolean;
  disabled?: boolean;
  inputContainerClassName?: string;
};

const FormikYearPickerField = ({
  name,
  value,
  error,
  touched,
  disabled,
  inputContainerClassName,
}: Props) => {
  return (
    <Field name={name}>
      {({ _, form }: any) => (
        <DatePicker
          selected={value ? new Date(value) : null}
          onChange={date =>
            form.setFieldValue(name, date ? format(date, "yyyy-MM-dd") : "")
          }
          dateFormat='yyyy' // Format to display only the year
          showYearPicker // Enable the year picker view
          onBlur={() => form.setFieldTouched(name, true)}
          className={cn(
            "w-full bg-white input input-bordered border-[#BDC3C7] flex items-center gap-2",
            error && touched && "input-error border-error",
            disabled &&
              "cursor-not-allowed border-[#BDC3C7] text-secondary-black",
            inputContainerClassName
          )}
          // maxDate={new Date()}
          placeholderText='Select a year'
        />
      )}
    </Field>
  );
};

export default FormikYearPickerField;
