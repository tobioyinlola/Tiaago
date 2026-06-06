"use client";

import { toast } from "sonner";
import { Field } from "formik";
import { useState } from "react";
import { LuUploadCloud } from "react-icons/lu";

import { cn } from "../../utils";
import FormikField, { FormikFieldProps } from "./FormikField";

type Props = FormikFieldProps & {
  accept?: string;
  acceptText?: string;
  required?: boolean;
  maxFileSize?: number;
};

const FileInput = ({
  name,
  error,
  touched,
  value,
  maxFileSize,
  ...props
}: Props) => {
  const [fileName, setFileName] = useState<string>();
  return (
    <FormikField
      {...props}
      name={name}
      error={error}
      touched={touched}
      value={value}
    >
      <Field name={name}>
        {({ field: { value, ...field }, form: { setFieldValue } }: any) => (
          <div>
            <VanillaFileInput
              name={name}
              value={value}
              touched={touched}
              error={error}
              field={field}
              maxFileSize={maxFileSize}
              setFieldValue={setFieldValue}
              setFileName={setFileName}
              {...props}
              />
            {!!(fileName && value) && (
              <div className=' w-full border-2 border-primary mt-3 rounded-lg p-2'>
                <p className='text-center'>{fileName}</p>
                {/* <Progress color='primary' value={0.5} /> */}
              </div>
            )}
          </div>
        )}
      </Field>
    </FormikField>
  );
};

export default FileInput;

type VanillaFileInputProps = Props & {
  setFieldValue?: any;
  setFile?: (file: File) => Promise<void> | void;
  setFileName?: any;
  field?: any;
  labelClassName?: string;
};

export const VanillaFileInput = ({
  name,
  value,
  touched,
  error,
  maxFileSize,
  setFieldValue,
  setFile,
  setFileName,
  field,
  className,
  accept = ".png, .jpg, .jpeg",
  acceptText = "SVG, PNG, JPG or GIF (max. 800x400px)3",
  labelClassName,
  required,
}: VanillaFileInputProps) => {
  return (
    <div className={cn("flex items-center justify-center w-full", className)}>
      <label
        htmlFor={name}
        className={cn(
          "flex flex-col items-center justify-center w-full h-full border-2 border-primary rounded-lg cursor-pointer bg-white hover:bg-gray-100 relative",
          !value && "border-dashed",
          touched && error && "border-error",
          labelClassName
        )}
      >
        <div className='flex flex-col items-center justify-center pt-5 pb-6'>
          <div className='flex items-center justify-center bg-gray-100 border-gray-50 rounded-full p-3 aspect-square mb-4'>
            <LuUploadCloud className='w-8 h-8 text-gray-500 dark:text-gray-400' />
          </div>
          <p className='mb-2 text-sm'>
            <span className='font-semibold text-primary'>Click to upload</span>{" "}
            <span className=''>or drag and drop</span>
          </p>
          <p className='text-xs'>{acceptText}</p>
        </div>
        <input
          id={name}
          {...field}
          accept={accept}
          type='file'
          required={required}
          className='absolute w-full h-full opacity-0 cursor-pointer'
          onChange={e => {
            const img = e.target.files?.[0];

            if (img) {
              if (maxFileSize && img.size > maxFileSize) {
                toast.error("File size is too large", {
                  duration: 9000,
                });
                return;
              }

              !!setFieldValue && setFieldValue(name, URL.createObjectURL(img));
              !!setFileName && setFileName(img.name);
              !!setFile && setFile(img);
            }
          }}
        />
      </label>
    </div>
  );
};
