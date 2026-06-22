"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FaEyeSlash } from "react-icons/fa";
import { TfiHelpAlt } from "react-icons/tfi";
import { useState, ChangeEvent, FormEvent, FocusEvent } from "react";
import { IoLockClosed, IoMail, IoPersonSharp } from "react-icons/io5";

import { useAlert } from "@/app/common/store/useAlert";
import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { TalentRole as StartupRole } from "@/app/common/types";
import { companySizeOptions } from "../constants/form.contants";
import { cn, handleFormSubmissionError } from "@/app/common/utils";
import { trackSignup } from "@/app/common/services/mixpanel.services";
import Button from "@/app/common/components/DaisyButton";

interface FormData {
  name: string;
  email: string;
  role: string;
  size: string;
  url: string;
  password: string;
  acceptance: boolean;
}

interface Errors {
  name?: string;
  email?: string;
  role?: string;
  size?: string;
  url?: string;
  password?: string;
  acceptance?: string;
}

const SignupFormV2 = ({ startupRoles }: { startupRoles: StartupRole[] }) => {
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    role: "",
    size: "",
    url: "",
    password: "",
    acceptance: false,
  });

  const [errors, setErrors] = useState<Errors>({});

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleFocus = (e: FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    if (errors[name as keyof Errors]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newErrors = { ...errors };

    if (type === "checkbox") {
      if (!formData.acceptance)
        newErrors.acceptance =
          "You must accept the Terms of Service and Privacy Policy";
    } else if (!value) {
      newErrors[name as keyof Errors] = `${
        name.charAt(0).toUpperCase() + name.slice(1)
      } is required`;
    }

    setErrors(newErrors);
  };

  const validate = (): Errors => {
    const newErrors: Errors = {};
    if (!formData.name) newErrors.name = "Full name is required";
    if (!formData.email) newErrors.email = "Work email address is required";
    if (!formData.role) newErrors.role = "Role is required";
    if (!formData.size) newErrors.size = "Size of employees is required";
    if (!formData.url) newErrors.url = "Company URL is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (!formData.acceptance)
      newErrors.acceptance =
        "You must accept the Terms of Service and Privacy Policy";

    return newErrors;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      // Submit form data
      if (submitting) return;
      new Promise(async (resolve, reject) => {
        toast.dismiss();
        setSubmitting(true);
        try {
          const data = await clientKyInstance.post(
            "auth/register/",
            {
              json: {
                email: formData.email,
                role: formData.role,
                size: formData.size,
                full_name: formData.name,
                website: formData.url,
                password1: formData.password,
                password2: formData.password,
              },
              searchParams: { user_type: "company" },
            }
          ).json();
          const [first_name = "", last_name = ""] = formData.name.split(" ");
          try {
            if (process.env.NODE_ENV === "production")
              await trackSignup({
                user_type: "startup",
                role: formData.role,
                email: formData.email,
                first_name,
                last_name,
                size: formData.size,
                website: formData.url,
              });
          } catch (error) {
            if (process.env.NODE_ENV === "development") console.error(error);
          }
          resolve(data);
        } catch (err) {
          console.log(err);
          reject(err);
        }
      })
        .then(() => {
          router.push(`/verify-email?email=${formData.email}`);
        })
        .catch(err => handleFormSubmissionError(err, undefined, setAlert))
        .finally(() => setSubmitting(false));
    }
  };

  return (
    <form className='flex flex-col gap-5' onSubmit={handleSubmit}>
      <div className='flex flex-col gap-1'>
        <label className='text-[#344054] text-[14px]' htmlFor='name'>
          Full name
        </label>
        <div
          className={`flex gap-2 justify-between border-2 items-center rounded-md p-2 nameDiv ${
            errors.name ? "border-red-500" : "border-[#BDC3C7]"
          }`}
        >
          <div className='flex gap-2 flex-grow items-center'>
            <IoPersonSharp className='text-base text-[#98A2B3]' />
            <input
              className='flex-grow outline-none bg-[#f8f9fa]'
              type='text'
              name='name'
              placeholder='Scott Owens'
              value={formData.name}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
          <TfiHelpAlt className='text-base text-[#98A2B3]' />
        </div>
        {errors.name && <p className='text-red-500 text-sm'>{errors.name}</p>}
      </div>
      <div className='flex flex-col gap-1'>
        <label className='text-[#344054] text-[14px]' htmlFor='email'>
          Work Email Address
        </label>
        <div
          className={`flex gap-2 justify-between border-2 items-center rounded-md p-2 nameDiv ${
            errors.email ? "border-red-500" : "border-[#BDC3C7]"
          }`}
        >
          <div className='flex gap-2 flex-grow items-center'>
            <IoMail className='text-base text-[#98A2B3]' />
            <input
              className='flex-grow outline-none bg-[#f8f9fa]'
              type='email'
              name='email'
              placeholder='scottowens@gmail.com'
              value={formData.email}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
          <TfiHelpAlt className='text-base text-[#98A2B3]' />
        </div>
        {errors.email && <p className='text-red-500 text-sm'>{errors.email}</p>}
      </div>
      <div className='flex flex-col gap-1'>
        <label className='text-[#344054] text-[14px]' htmlFor='role'>
          Select Role
        </label>
        <div
          className={`flex gap-2 justify-between border-2 items-center rounded-md p-2 nameDiv ${
            errors.role ? "border-red-500" : "border-[#BDC3C7]"
          }`}
        >
          <IoPersonSharp className='text-base text-[#98A2B3]' />
          <select
            name='role'
            className='flex-grow outline-none bg-[#f8f9fa]'
            value={formData.role}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            <option value=''>Select Role</option>
            {startupRoles.map(({ title, slug }) => (
              <option key={slug} value={slug}>
                {title}
              </option>
            ))}
          </select>
        </div>
        {errors.role && <p className='text-red-500 text-sm'>{errors.role}</p>}
      </div>
      <div className='flex flex-col gap-1'>
        <label className='text-[#344054] text-[14px]' htmlFor='size'>
          Size of Employees
        </label>
        <div
          className={`flex gap-2 justify-between border-2 items-center rounded-md p-2 nameDiv ${
            errors.size ? "border-red-500" : "border-[#BDC3C7]"
          }`}
        >
          <IoPersonSharp className='text-base text-[#98A2B3]' />
          <select
            name='size'
            className='flex-grow outline-none bg-[#f8f9fa]'
            value={formData.size}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            <option value=''>Select Size</option>
            {companySizeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {errors.size && <p className='text-red-500 text-sm'>{errors.size}</p>}
      </div>
      <div className='flex flex-col gap-1'>
        <label className='text-[#344054] text-[14px]' htmlFor='url'>
          Company Url
        </label>
        <div
          className={`flex gap-2 justify-between border-2 items-center rounded-md p-2 nameDiv ${
            errors.url ? "border-red-500" : "border-[#BDC3C7]"
          }`}
        >
          <div className='flex gap-2 flex-grow items-center'>
            <IoMail className='text-base text-[#98A2B3]' />
            <input
              className='flex-grow outline-none bg-[#f8f9fa]'
              type='url'
              name='url'
              placeholder='https://www.tiaago.com'
              value={formData.url}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
          <TfiHelpAlt className='text-base text-[#98A2B3]' />
        </div>
        {errors.url && <p className='text-red-500 text-sm'>{errors.url}</p>}
      </div>
      <div className='flex flex-col gap-1'>
        <label className='text-[#344054] text-[14px]' htmlFor='password'>
          Password
        </label>
        <div
          className={`flex gap-2 justify-between nameDiv border-2 rounded-md p-2 ${
            errors.password ? "border-red-500" : "border-[#BDC3C7]"
          }`}
        >
          <div className='flex gap-2 flex-grow items-center'>
            <IoLockClosed className='text-base text-[#98A2B3]' />
            <input
              className='flex-grow outline-none bg-[#f8f9fa]'
              type='password'
              name='password'
              placeholder='********'
              value={formData.password}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
          <FaEyeSlash className='text-base text-[#98A2B3]' />
        </div>
        {errors.password && (
          <p className='text-red-500 text-sm'>{errors.password}</p>
        )}
      </div>
      <div className='flex gap-1 text-sm'>
        <input
          type='checkbox'
          name='acceptance'
          checked={formData.acceptance}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        <span>
          I accept Tiaago&apos;s{" "}
          <Link href='/terms' className='text-primary'>
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href='/privacy' className='text-primary'>
            Privacy Policy.
          </Link>
        </span>
      </div>
      {errors.acceptance && (
        <p className='text-red-500 text-sm'>{errors.acceptance}</p>
      )}
      <Button
        loading={submitting}
        color='primary'
        type='submit'
        className='my-2'
      >
        {submitting ? "Submitting..." : "Create account"}
      </Button>
      <p className='text-center'>
        Click{" "}
        <Link href='/talents/signup' className='text-primary'>
          here
        </Link>{" "}
        to Sign Up as a Talent instead.
      </p>
    </form>
  );
};

export default SignupFormV2;
