import { GroupBase } from "react-select";

import { CountryField } from "@/app/common/types";
import { FormikFieldProps } from "@/app/common/components/Forms/FormikField";
import FormikSelectField from "@/app/common/components/Forms/FormikSelectField";

type Props = FormikFieldProps & {
  options: GroupBase<CountryField>[];
};

const CountrySelect = ({ options, ...props }: Props) => {
  const formatGroupLabel = (data: any) => (
    <div className='flex justify-between'>
      <span className='font-onest'>{data.label}</span>
      <span className='text-gray-500 font-onest'>{data.options.length}</span>
    </div>
  );

  return (
    <FormikSelectField
      {...props}
      selectProps={{
        placeholder: props.placeholder || "Select Country",
        ...(props.type === "select" && props.selectFieldProps),
        options,
        formatGroupLabel,
        value: options
          .flatMap(g => g.options)
          .find(c => c.value === props.value),
      }}
    />
  );
};

export default CountrySelect;
