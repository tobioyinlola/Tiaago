"use client";

import { Field } from "formik";
import dynamic from "next/dynamic";
import makeAnimated from "react-select/animated";
import { Props as SelectProps } from "react-select";

import FormikField, { FormikFieldProps } from "./FormikField";
import { SelectFieldProps } from "../../types";

const Select = dynamic(() => import("react-select"), {
  ssr: false,
  loading: () => <select className='select select-primary select-bordered' />,
});
const CreateableSelect = dynamic(() => import("react-select/creatable"), {
  ssr: false,
  loading: () => <select className='select' />,
});
const animatedComponents = makeAnimated();

type Props = FormikFieldProps & {
  selectProps: Omit<SelectProps, "styles"> & {
    createable?: boolean;
    styles?: SelectFieldProps["styles"];
  };
};

type BaseProps = {
  selectProps: Props["selectProps"];
  name: string;
  error?: string;
  touched?: boolean;
};

export const ValinnaFormikSelect = ({
  selectProps: { styles, ...selectProps },
  name,
  error,
  touched,
}: BaseProps) => {
  const hasError = !!error && !!touched;
  const SelectEl = selectProps.createable ? CreateableSelect : Select;
  return (
    <Field name={name}>
      {({ _, form }: any) => (
        <>
          <SelectEl
            instanceId={`formik-select-${name}`}
            {...selectProps}
            name={name}
            onChange={(newVal: any) => {
              const value = Array.isArray(newVal)
                ? newVal.map(v => v?.value)
                : newVal?.value;
              form.setFieldValue(name, value);
            }}
            noOptionsMessage={() =>
              selectProps.createable
                ? "Type to create a new option"
                : "No options available"
            }
            onBlur={() => form.setFieldTouched(name, true)}
            styles={{
              ...styles,
              control: provided => ({
                ...provided,
                borderColor: hasError ? "var(--error)" : "#D0D5DD",
                outlineColor: hasError ? "var(--error)" : "#D0D5DD",
                minHeight: "3rem",
                borderRadius: "0.5rem",
                paddingLeft: 16,
                ...styles?.control,
              }),
              option: (provided, state) => ({
                ...provided,
                backgroundColor: state.isFocused ? "var(--primary)" : "#fff",
                color: state.isFocused ? "#fff" : "var(--primary)",
                ...styles?.option,
              }),
            }}
            {...(selectProps.isMulti && { components: animatedComponents })}
          />
          {!!selectProps.createable && (
            <p className='text-xs font-onest text-neutral-500 mt-1'>
              You can create a new option
            </p>
          )}
        </>
      )}
    </Field>
  );
};

const FormikSelectField = ({
  selectProps,
  name,
  error,
  touched,
  value,
  disabled,
  ...props
}: Props) => {
  return (
    <FormikField
      {...props}
      name={name}
      error={error}
      touched={touched}
      value={value}
    >
      <ValinnaFormikSelect
        {...{
          selectProps: {
            isDisabled: disabled,
            ...(props.type === "select" && props.selectFieldProps),
            ...selectProps,
          },
          name,
          error,
          touched,
        }}
      />
    </FormikField>
  );
};

export default FormikSelectField;
