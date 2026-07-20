"use client";
import { Field } from "formik";
import { useState, useRef } from "react";
import { IoIosLink } from "react-icons/io";
import { usePathname } from "next/navigation";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";

import { cn } from "../../utils";
import { FormField } from "../../types";
import PhoneInputField from "./PhoneInput";
import PasswordHelpers from "./PasswordHelpers";
import RichTextInputField from "./RichTextInput";
import { ValinnaFormikSelect } from "./FormikSelectField";
import FormikYearPickerField from "./FormikYearPickerField";

type RichtextProps = {
  maxChars?: number;
  minHeight?: number;
};

export type FormikFieldProps = FormField & {
  error?: string;
  touched?: boolean;
  disablePasswordHelpers?: boolean;
  value: any;
  children?: React.ReactNode;
  richtextProps?: RichtextProps;
};

const InputContainer = ({
  children,
  className,
  hideContainer,
  containerRef,
}: {
  children: React.ReactNode;
  className?: string;
  hideContainer?: boolean;
  containerRef?: React.RefObject<HTMLDivElement>;
}) => {
  if (hideContainer) return children;
  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};

const FormikField = (props: FormikFieldProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const pathName = usePathname();
  const inTalentDashboard = pathName.includes("talents/dashboard");

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
    const input = containerRef.current?.querySelector("input");
    if (input) {
      // focus on the input field
      input.focus();
      const length = input.value.length;
      // cursor should be at the end of text
      input.setSelectionRange(length, length);
    }
  };

  const {
    label,
    name,
    type = "text",
    error,
    touched,
    value,
    className,
    disablePasswordHelpers,
    placeholder,
    children,
    leftIcon,
    rightIcon,
    richtextProps,
    disabled,
    autoFocus,
    inputContainerClassName,
  } = props;
  const isTextarea = type === "textarea";
  return (
    <div className={cn("form-control w-full", className)}>
      {!!label && (
        <label
          htmlFor={name}
          className='label-text text-black font-medium font-onest mb-1'
        >
          {label}
        </label>
      )}
      {children ? (
        children
      ) : type === "tel" ? (
        <PhoneInputField {...{ name, placeholder, disabled }} />
      ) : type === "richtext" ? (
        <RichTextInputField
          {...{ name, placeholder }}
          maxChars={richtextProps?.maxChars}
          minHeight={richtextProps?.minHeight}
        />
      ) : props.type === "select" ? (
        <ValinnaFormikSelect
          {...{ name, value, error, touched, label, placeholder }}
          selectProps={{
            autoFocus,
            placeholder,
            isDisabled: disabled,
            ...props.selectFieldProps,
          }}
        />
      ) : type === "year" ? (
        <FormikYearPickerField
          name={name}
          value={value}
          error={error}
          touched={touched}
          disabled={disabled}
          inputContainerClassName={inputContainerClassName}
        />
      ) : (
        <div className='flex'>
          <InputContainer
            containerRef={containerRef}
            className={cn(
              "w-full bg-white input input-bordered border-[#D0D5DD] placeholder:text-[#7E8285] flex items-center gap-2 focus-within:shadow-none",
              error && touched && "border-error",
              disabled &&
                "cursor-not-allowed border-[#BDC3C7] text-secondary-black",
              inputContainerClassName
            )}
            hideContainer={isTextarea}
          >
            {type === "url" && !leftIcon && (
              <IoIosLink className='text-base text-[#98A2B3]' />
            )}
            {!!leftIcon && leftIcon}
            <Field
              className={cn(
                isTextarea
                  ? "w-full textarea textarea-bordered border-[#BDC3C7]  min-h-[150px]"
                  : "grow",
                !inTalentDashboard &&
                  isTextarea &&
                  "textarea-primary border-primary",
                error && touched && isTextarea && "textarea-error border-error",
                disabled &&
                  "cursor-not-allowed border-[#BDC3C7] text-secondary-black"
              )}
              // id={name}
              {...{
                placeholder:
                  placeholder ?? (isTextarea ? "Add a description" : ""),
                name,
                disabled,
                autoFocus,
              }}
              type={showPassword ? "text" : type === "url" ? "text" : type}
              cols={isTextarea ? 4 : undefined}
              as={isTextarea ? "textarea" : "input"}
            />
            {type === "password" && !rightIcon && (
              <button
                type='button'
                className='text-xl text-secondary-black'
                onClick={togglePasswordVisibility}
              >
                {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
              </button>
            )}
            {!!rightIcon && rightIcon}
          </InputContainer>
        </div>
      )}
      {["new_password1", "password1"].includes(name) &&
      !disablePasswordHelpers ? (
        <PasswordHelpers value={value} />
      ) : (
        <p
          className={cn(
            "text-xs text-error m-0.5 mb-2 transition-opacity opacity-0",
            {
              "opacity-100": error && touched,
              hidden: type === "richtext",
            }
          )}
        >
          {error || "error"}
        </p>
      )}
    </div>
  );
};

export default FormikField;
