"use client";

import dynamic from "next/dynamic";
import makeAnimated from "react-select/animated";

const ReactSelect = dynamic(() => import("react-select"), {
  ssr: false,
  loading: () => <div className="select select-bordered w-full skeleton h-12" />,
});

const animatedComponents = makeAnimated();

export type SelectOption = {
  label: string;
  value: string;
  colour?: string;
};

// Matches the styling convention established in Forms/FormikSelectField.tsx's
// ValinnaFormikSelect -- reused here for a plain (non-Formik) controlled
// react-select, since this codebase's only existing react-select wrapper is
// Formik-coupled and everything built for tags/segments/campaigns is plain
// React state.
const buildStyles = (hasError?: boolean) => ({
  control: (provided: any) => ({
    ...provided,
    borderColor: hasError ? "var(--error)" : "#D0D5DD",
    minHeight: "2.75rem",
    borderRadius: "0.5rem",
    paddingLeft: 4,
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isFocused ? "var(--primary)" : "#fff",
    color: state.isFocused ? "#fff" : "#111827",
  }),
  menu: (provided: any) => ({ ...provided, zIndex: 30 }),
});

const Dot = ({ colour }: { colour?: string }) =>
  colour ? (
    <span className="w-2 h-2 rounded-full inline-block mr-2 shrink-0" style={{ backgroundColor: colour }} />
  ) : null;

const formatOptionLabel = (data: unknown) => {
  const option = data as SelectOption;
  return (
    <span className="flex items-center">
      <Dot colour={option.colour} />
      {option.label}
    </span>
  );
};

type SingleProps = {
  options: SelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  isClearable?: boolean;
  isSearchable?: boolean;
  hasError?: boolean;
  size?: "sm" | "md";
};

export const SelectInput = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
  isClearable = true,
  isSearchable = true,
  hasError,
  size = "md",
}: SingleProps) => (
  <ReactSelect
    instanceId={`select-${placeholder}`}
    classNamePrefix="react-select"
    options={options}
    value={options.find(o => o.value === value) ?? null}
    onChange={(opt: any) => onChange(opt?.value ?? null)}
    placeholder={placeholder}
    isClearable={isClearable}
    isSearchable={isSearchable}
    formatOptionLabel={formatOptionLabel}
    styles={{
      ...buildStyles(hasError),
      control: (provided: any) => ({
        ...buildStyles(hasError).control(provided),
        minHeight: size === "sm" ? "2.25rem" : "2.75rem",
      }),
    }}
  />
);

type MultiProps = {
  options: SelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  hasError?: boolean;
};

export const MultiSelectInput = ({ options, value, onChange, placeholder = "Select...", hasError }: MultiProps) => (
  <ReactSelect
    instanceId={`multi-select-${placeholder}`}
    classNamePrefix="react-select"
    isMulti
    options={options}
    value={options.filter(o => value.includes(o.value))}
    onChange={(opts: any) => onChange((opts ?? []).map((o: SelectOption) => o.value))}
    placeholder={placeholder}
    formatOptionLabel={formatOptionLabel}
    components={animatedComponents}
    styles={buildStyles(hasError)}
  />
);

export default SelectInput;
