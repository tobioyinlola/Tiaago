import { CountryCitiesMap } from "../../types";
import { FormikFieldProps } from "@/app/common/components/Forms/FormikField";
import FormikSelectField from "@/app/common/components/Forms/FormikSelectField";

type Props = FormikFieldProps & {
  countryCitiesMaps: CountryCitiesMap;
  country: string;
};

const CitySelect = ({ countryCitiesMaps, country, ...props }: Props) => {
  return (
    <FormikSelectField
      {...props}
      selectProps={{
        placeholder: "Select City",
        ...(props.type === "select" && props.selectFieldProps),
        options: countryCitiesMaps[country]?.map(city => ({
          label: city,
          value: city,
        })),
        isDisabled: !country,
      }}
    />
  );
};

export default CitySelect;
