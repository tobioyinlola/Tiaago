"use client";

import * as Yup from "yup";
import { toast } from "sonner";
import { Formik } from "formik";
import dynamic from "next/dynamic";
import Button from "@/app/common/components/DaisyButton";
import { useRouter } from "next/navigation";

import ToolMenu from "./ToolMenu";
import { getTools } from "@/app/common/services";
import { useAlert } from "@/app/common/store/useAlert";
import { TalentPortfolioTool } from "@/app/common/types";
import { handleFormSubmissionError } from "@/app/common/utils";
import { updatePortfolio } from "@/app/common/services/talents";
import { useTalentStore } from "@/app/talents/(dashboard)/store";
import FormikField from "@/app/common/components/Forms/FormikField";
import TalentToolDisplay from "@/app/common/components/TalentToolDisplay";

const AsyncSelect = dynamic(() => import("react-select/async"), {
  ssr: false,
  loading: () => <select className='select' />,
});

const Tools = ({
  tools,
  refresh,
}: {
  tools: TalentPortfolioTool[];
  refresh?: boolean;
}) => {
  const toolOptions = tools.map(tool => ({
    label: tool.name,
    value: tool.id,
  }));
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);
  const [setPortfolio, talentTools] = useTalentStore(s => [
    s.setPortfolio,
    s.portfolio?.tools || [],
  ]);
  return (
    <section className='w-full max-md:max-w-md max-md:mx-auto'>
      <h2 className='text-base font-bold text-primary-black'>Tools</h2>
      <p className='text-sm text-secondary-black mb-6 md:border-b border-outline pb-4'>
        Softwares that you work with
      </p>
      <div className='flex items-center gap-3 flex-wrap'>
        {talentTools.map((tool, i) => (
          <TalentToolDisplay
            tool={tool}
            key={i}
            className='rounded-lg border-[#EAECF0] border py-6 pl-8 pr-4 w-full'
          >
            <ToolMenu tool={tool} />
          </TalentToolDisplay>
        ))}
        {!talentTools.length && (
          <p className='text-sm text-secondary-black'>No tools added yet.</p>
        )}
      </div>
      <Formik
        initialValues={{
          tool: "",
        }}
        onSubmit={(input, { setFieldError, resetForm, setSubmitting }) => {
          updatePortfolio({
            tools: [...talentTools.map(({ id }) => id), +input.tool] as any,
          })
            .then(res => {
              if (res.success) {
                toast.success(`Tools updated successfully`);
                resetForm();
                setPortfolio(res.data!);
                if (refresh) router.refresh();
              } else {
                handleFormSubmissionError(res.error, setFieldError, setAlert);
              }
            })
            .catch(err =>
              handleFormSubmissionError(err, setFieldError, setAlert)
            )
            .finally(() => {
              setSubmitting(false);
            });
        }}
        validationSchema={Yup.object().shape({
          tool: Yup.string().required("Tool is required"),
        })}
      >
        {({
          handleSubmit,
          errors,
          touched,
          values,
          isSubmitting,
          setFieldValue,
          setFieldTouched,
        }) => (
          <form onSubmit={handleSubmit} className='my-5 p-6'>
            <FormikField
              name='tool'
              label='Select Tool'
              error={errors.tool}
              touched={touched.tool}
              value={values.tool}
            >
              <AsyncSelect
                className='w-full'
                cacheOptions
                value={toolOptions.find(option => option.value == values.tool)}
                defaultOptions={toolOptions}
                loadOptions={(inputValue, callback) => {
                  getTools(inputValue)
                    .then(data => {
                      const filteredOptions = data.map(tool => ({
                        label: tool.name,
                        value: tool.id,
                      }));
                      callback(filteredOptions);
                    })
                    .catch(err => {
                      console.error(err);
                      callback([]);
                    });
                }}
                onChange={(newVal: any) => {
                  const value = Array.isArray(newVal)
                    ? newVal.map(v => v?.value)
                    : newVal?.value;
                  setFieldValue("tool", value);
                }}
                onBlur={() => setFieldTouched("tool", true)}
                placeholder='Select a tool'
                isSearchable
                // isClearable
                noOptionsMessage={() => "No options available"}
                styles={{
                  control: provided => ({
                    ...provided,
                    borderColor: errors.tool
                      ? "var(--error)"
                      : "var(--primary)",
                    outlineColor: errors.tool
                      ? "var(--error)"
                      : "var(--primary)",
                    minHeight: "3rem",
                    borderRadius: "0.5rem",
                    paddingLeft: 16,
                  }),
                  option: (provided, state) => ({
                    ...provided,
                    backgroundColor: state.isFocused
                      ? "var(--primary)"
                      : "#fff",
                    color: state.isFocused ? "#fff" : "var(--primary)",
                  }),
                }}
              />
            </FormikField>
            <div className='w-full flex justify-end'>
              <Button
                // disabled={isSubmitting}
                loading={isSubmitting}
                type='submit'
                color='primary'
                className='mt-4 max-md:w-full'
              >
                {isSubmitting ? "Adding..." : "Add"}
              </Button>
            </div>
          </form>
        )}
      </Formik>
    </section>
  );
};

export default Tools;
