"use client";

import { Field } from "formik";
import dynamic from "next/dynamic";

import { cn, htmlToPlainText } from "../../utils";

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <div className='skeleton w-full h-20' />,
});

type Props = {
  name: string;
  placeholder?: string;
  maxChars?: number;
};

const RichTextInputField = ({ name, placeholder, maxChars = 255 }: Props) => {
  return (
    <Field name={name}>
      {({
        field: { value },
        form: { errors, touched, setFieldValue, setFieldTouched },
      }: any) => {
        const error = errors[name];
        const hasError = !!error && !!touched[name];
        const rawValue = htmlToPlainText(value);
        const diff = maxChars - rawValue.length;
        return (
          <div>
            <ReactQuill
              value={value}
              placeholder={placeholder}
              onChange={val => {
                setFieldValue(name, val);
              }}
              onBlur={() => setFieldTouched(name, true)}
              className={cn(hasError && "border border-error")}
            />
            <div className='flex items-center justify-between m-2'>
              <p
                className={cn(
                  "text-gray-500 text-sm mt-2",
                  rawValue.length > maxChars && "text-error",
                  !maxChars && "hidden"
                )}
              >
                {diff < 0 ? 0 : diff} characters left
              </p>
              <p
                className={cn(
                  "text-xs text-error transition-opacity opacity-0",
                  {
                    "opacity-100": hasError,
                  }
                )}
              >
                {error || "error"}
              </p>
            </div>
          </div>
        );
      }}
    </Field>
  );
};

export default RichTextInputField;
