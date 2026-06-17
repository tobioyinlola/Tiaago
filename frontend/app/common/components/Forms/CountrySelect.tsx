import { useEffect } from "react";
import { GroupBase } from "react-select";
import { useFormikContext } from "formik";

import { CountryField } from "@/app/common/types";
import { FormikFieldProps } from "@/app/common/components/Forms/FormikField";
import FormikSelectField from "@/app/common/components/Forms/FormikSelectField";
import { useGeoCountry } from "@/app/common/hooks/useGeoCountry";

type Props = FormikFieldProps & {
  options: GroupBase<CountryField>[];
};

const CountrySelect = ({ options, ...props }: Props) => {
  const geoCountry = useGeoCountry();
  const { setFieldValue, values } = useFormikContext<Record<string, string>>();
  const fieldName = props.name || "country";
  const currentValue = values[fieldName];

  useEffect(() => {
    if (geoCountry && !currentValue) {
      const match = options
        .flatMap((g) => g.options)
        .find(
          (c) => c.value.toLowerCase() === geoCountry.toLowerCase()
        );
      if (match) setFieldValue(fieldName, match.value);
    }
  }, [geoCountry, currentValue, fieldName, options, setFieldValue]);

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
          .flatMap((g) => g.options)
          .find((c) => c.value === (props.value || currentValue)),
      }}
    />
  );
};

export default CountrySelect;
