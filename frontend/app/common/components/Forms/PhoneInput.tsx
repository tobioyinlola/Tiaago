"use client";
import { Field } from "formik";
import PhoneInput from "react-phone-input-2";
import { usePathname } from "next/navigation";

import { cn } from "../../utils";

type Props = {
  name: string;
  placeholder?: string;
  disabled?: boolean;
};

const PhoneInputField = ({ name, placeholder, disabled }: Props) => {
  const pathName = usePathname();
  const inTalentDashboard = pathName.includes("talents/dashboard");
  return (
    <Field name={name}>
      {({
        field: { value, onChange },
        form: { errors, touched, setFieldTouched },
      }: any) => {
        const error = errors[name];
        const hasError = !!error && !!touched[name];
        return (
          <PhoneInput
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            // FormikField already renders a proper <label> above this field;
            // react-phone-input-2's own built-in floating label ("Phone" by
            // default) is redundant, and our position:static container/input
            // overrides below break its absolute-positioned overlay, causing
            // it to render as stray visible text next to the input instead.
            specialLabel=""
            inputProps={{
              name,
              onBlur: () => setFieldTouched(name, true),
              onChange,
            }}
            containerStyle={{
              display: "flex",
              justifyContent: "space-between",
              flexDirection: "row-reverse",
            }}
            inputStyle={{
              position: "static",
              flex: 0.95,
              backgroundColor: "#fff",
            }}
            buttonClass='!px-1 sm:!px-[14px]'
            buttonStyle={{
              position: "static",
              backgroundColor: "#fff",
              borderRadius: "0.5rem",
              borderColor: hasError
                ? "var(--error)"
                : inTalentDashboard
                ? "#BDC3C7"
                : "var(--primary)",
            }}
            inputClass={cn(
              "!input !input-bordered !border-[#BDC3C7] dark:bg-white",
              !inTalentDashboard && "!input-primary",
              hasError && "!input-error"
            )}
            countryCodeEditable={false}
            enableSearch
          />
        );
      }}
    </Field>
  );
};

export default PhoneInputField;
