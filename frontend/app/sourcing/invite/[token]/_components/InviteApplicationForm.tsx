"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  IoPersonSharp,
  IoMail,
  IoCall,
  IoBriefcase,
  IoLocation,
  IoSparkles,
  IoClose,
} from "react-icons/io5";
import { IoIosLink } from "react-icons/io";
import { FaUsers, FaShieldAlt, FaFileAlt, FaCheck } from "react-icons/fa";
import { toast } from "sonner";
import { useUserStore } from "@/app/common/store/useUser";
import { submitInviteApplication } from "@/app/common/services/sourcing";
import BrandLink from "@/app/common/components/BrandLink";

interface InviteApplicationFormProps {
  token: string;
  categoryName: string;
  companyName: string;
}

const EXPERIENCE_LEVELS = [
  "Entry Level",
  "Junior",
  "Mid Level",
  "Senior",
  "Lead / Staff",
  "Principal / Director",
];

const CURRENCIES = ["USD", "GBP", "EUR", "NGN", "KES", "ZAR", "GHS", "EGP"];

const SESSION_STORAGE_KEY = (token: string) => `invite_form_${token}`;

type SavedFormData = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  linkedin: string;
  portfolio: string;
  current_role: string;
  experience_level: string;
  location: string;
  current_pay: string;
  currency: string;
  frameworks: string;
  summary: string;
};

export function InviteApplicationForm({
  token,
  categoryName,
  companyName,
}: InviteApplicationFormProps) {
  const router = useRouter();
  const user = useUserStore((s) => s.profile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [experienceLevel, setExperienceLevel] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [restoredData, setRestoredData] = useState<SavedFormData | null>(null);

  // Restore saved form data from sessionStorage (after auth redirect)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY(token));
      if (saved) {
        const parsed = JSON.parse(saved) as SavedFormData;
        setRestoredData(parsed);
        if (parsed.experience_level) setExperienceLevel(parsed.experience_level);
        if (parsed.currency) setCurrency(parsed.currency);
        // Clear after restoring
        sessionStorage.removeItem(SESSION_STORAGE_KEY(token));
      }
    } catch {
      // Ignore parse errors
    }
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("File too large", {
        description: "Please upload a file smaller than 5MB.",
      });
      e.target.value = "";
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Please upload a PDF, DOC, or DOCX file.",
      });
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveFormToSession = (form: HTMLFormElement) => {
    const data: SavedFormData = {
      first_name: (form.elements.namedItem("first_name") as HTMLInputElement)
        .value,
      last_name: (form.elements.namedItem("last_name") as HTMLInputElement)
        .value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      linkedin: (form.elements.namedItem("linkedin") as HTMLInputElement).value,
      portfolio: (form.elements.namedItem("portfolio") as HTMLInputElement)
        .value,
      current_role: (form.elements.namedItem("current_role") as HTMLInputElement)
        .value,
      experience_level: experienceLevel,
      location: (form.elements.namedItem("location") as HTMLInputElement).value,
      current_pay: (form.elements.namedItem("current_pay") as HTMLInputElement)
        .value,
      currency,
      frameworks: (form.elements.namedItem("frameworks") as HTMLInputElement)
        .value,
      summary: (form.elements.namedItem("summary") as HTMLTextAreaElement).value,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY(token), JSON.stringify(data));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      // Save form data before redirect
      saveFormToSession(e.currentTarget);
      toast.info("Please create an account first", {
        description:
          "You need an account to submit your application. You'll be redirected to sign up.",
      });
      router.push(`/talents/signup?next=/sourcing/invite/${token}`);
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData();

    // Personal info
    formData.append(
      "first_name",
      (form.elements.namedItem("first_name") as HTMLInputElement).value
    );
    formData.append(
      "last_name",
      (form.elements.namedItem("last_name") as HTMLInputElement).value
    );
    formData.append(
      "email",
      (form.elements.namedItem("email") as HTMLInputElement).value
    );
    const phone = (form.elements.namedItem("phone") as HTMLInputElement).value;
    if (phone) formData.append("phone", phone);
    const linkedin = (form.elements.namedItem("linkedin") as HTMLInputElement)
      .value;
    if (linkedin) formData.append("linkedin_url", linkedin);
    const portfolio = (
      form.elements.namedItem("portfolio") as HTMLInputElement
    ).value;
    if (portfolio) formData.append("portfolio_url", portfolio);
    if (selectedFile) formData.append("resume", selectedFile);

    // Professional info
    const currentRole = (
      form.elements.namedItem("current_role") as HTMLInputElement
    ).value;
    if (currentRole) formData.append("current_role", currentRole);
    if (experienceLevel) formData.append("experience_level", experienceLevel);
    const location = (form.elements.namedItem("location") as HTMLInputElement)
      .value;
    if (location) formData.append("location", location);
    const salary = (form.elements.namedItem("current_pay") as HTMLInputElement)
      .value;
    if (salary) {
      formData.append("current_pay", salary);
      formData.append("pay_currency", currency);
    }
    const frameworks = (
      form.elements.namedItem("frameworks") as HTMLInputElement
    ).value;
    if (frameworks) formData.append("frameworks", frameworks);
    const summary = (
      form.elements.namedItem("summary") as HTMLTextAreaElement
    ).value;
    if (summary) formData.append("summary", summary);

    setIsSubmitting(true);
    try {
      const result = await submitInviteApplication(token, formData);
      if (result.success) {
        setIsSuccess(true);
      } else {
        toast.error("Submission failed", {
          description:
            result.error || "Something went wrong. Please try again.",
        });
      }
    } catch {
      toast.error("Submission failed", {
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- Success State ----------
  if (isSuccess) {
    return (
      <div className='h-[100svh] w-[100svw] bg-white relative overflow-hidden'>
        <Image
          src='/assets/images/Pricing Background pattern.png'
          alt='Background pattern'
          className='object-cover'
          fill
        />
        <div className='relative flex items-center justify-center h-full px-4'>
          <div className='max-w-md w-full text-center space-y-6'>
            <div className='mx-auto w-20 h-20 rounded-full bg-success/10 flex items-center justify-center'>
              <FaCheck className='h-10 w-10 text-success' />
            </div>
            <div className='space-y-2'>
              <h1 className='text-2xl md:text-4xl font-semibold font-onest text-black'>
                Application Submitted!
              </h1>
              <p className='text-[#5F6264] text-sm font-onest'>
                You&apos;ve been added to {companyName}&apos;s {categoryName}{" "}
                pipeline. The recruiting team will review your profile and reach
                out when there&apos;s a match.
              </p>
            </div>
            <div className='rounded-xl bg-[#F9FAFB] border border-[#D0D5DD] p-5 text-left space-y-3'>
              <h3 className='font-medium text-sm font-onest text-black'>
                What happens next?
              </h3>
              <ul className='text-sm text-[#5F6264] font-onest space-y-2'>
                <li className='flex items-start gap-2'>
                  <FaCheck className='h-4 w-4 text-success mt-0.5 shrink-0' />
                  Your profile is now visible to {companyName}&apos;s recruiting
                  team
                </li>
                <li className='flex items-start gap-2'>
                  <FaCheck className='h-4 w-4 text-success mt-0.5 shrink-0' />
                  You&apos;ll be notified when a role matches your profile
                </li>
                <li className='flex items-start gap-2'>
                  <FaCheck className='h-4 w-4 text-success mt-0.5 shrink-0' />
                  Keep your TIAAGO profile updated for the best matches
                </li>
              </ul>
            </div>
            <button
              onClick={() => router.push("/talents/dashboard")}
              className='btn btn-primary text-white w-full'
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Main Form ----------
  return (
    <div className='h-[100svh] w-[100svw] bg-white scrollbar-none md:scrollbar-thin relative overflow-x-hidden'>
      <Image
        src='/assets/images/Pricing Background pattern.png'
        alt='Background pattern'
        className='object-cover'
        fill
      />
      <div className='relative grid md:grid-cols-2 max-md:items-start h-full'>
        {/* ---------- Left Panel (desktop only) ---------- */}
        <div className='pl-5 py-[30px] flex max-md:hidden'>
          <div className='bg-black rounded-[30px] flex-1 pt-[65px] pb-20 px-[60px] relative overflow-hidden'>
            <Image
              src='/assets/images/Auth Background pattern.png'
              alt='Background pattern'
              className='object-cover'
              fill
            />
            <div className='relative flex flex-col justify-between h-full'>
              <div>
                <BrandLink
                  isAlt
                  className='text-white'
                  containerClassName='block w-fit'
                />

                <h2 className='text-white font-onest font-semibold text-[60px] leading-[110%] max-w-[562px] mt-[60px] mb-8'>
                  Join {companyName}&apos;s Talent Network
                </h2>

                <p className='text-[#E4DBDB] font-onest text-xl max-w-[480px]'>
                  You&apos;ve been invited to join the{" "}
                  {categoryName.toLowerCase()} talent community. Get early
                  access to opportunities and connect directly with the
                  recruiting team.
                </p>
              </div>

              {/* Feature Cards */}
              <div className='space-y-3 mt-10'>
                <div className='bg-[#5F6264] rounded-xl p-4 flex items-start gap-3'>
                  <div className='w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0'>
                    <IoSparkles className='h-4 w-4 text-white' />
                  </div>
                  <div>
                    <h3 className='font-semibold text-sm font-onest text-white'>
                      Early Access
                    </h3>
                    <p className='text-xs text-[#DEE1E3] font-onest mt-0.5'>
                      Hear about {companyName} roles before they&apos;re posted
                      publicly.
                    </p>
                  </div>
                </div>
                <div className='bg-[#5F6264] rounded-xl p-4 flex items-start gap-3'>
                  <div className='w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0'>
                    <FaUsers className='h-4 w-4 text-white' />
                  </div>
                  <div>
                    <h3 className='font-semibold text-sm font-onest text-white'>
                      Direct Connection
                    </h3>
                    <p className='text-xs text-[#DEE1E3] font-onest mt-0.5'>
                      Connect directly with {companyName}&apos;s recruiting
                      team.
                    </p>
                  </div>
                </div>
                <div className='bg-[#5F6264] rounded-xl p-4 flex items-start gap-3'>
                  <div className='w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0'>
                    <FaShieldAlt className='h-4 w-4 text-white' />
                  </div>
                  <div>
                    <h3 className='font-semibold text-sm font-onest text-white'>
                      Privacy First
                    </h3>
                    <p className='text-xs text-[#DEE1E3] font-onest mt-0.5'>
                      Your data is secure and shared only with your consent.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- Right Panel (scrollable form) ---------- */}
        <main className='min-h-[100svh] overflow-y-auto'>
          <div className='px-3.5 py-5 md:hidden'>
            <BrandLink containerClassName='block w-fit' />
          </div>
          <div className='w-full md:max-w-[520px] mx-auto px-4 pt-8 md:pt-16 pb-12'>
            <div>
              <h1 className='text-2xl md:text-4xl font-semibold text-left font-onest text-black'>
                Create Your Profile
              </h1>
              <p className='text-[#5F6264] text-sm font-onest mt-2 mb-8'>
                Complete your profile to join {companyName}&apos;s{" "}
                {categoryName} pipeline.{" "}
                <Link
                  href='/talents/signin'
                  className='font-semibold text-primary hover:underline'
                >
                  Already have an account? Log In
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit} className='space-y-5'>
              {/* --- Personal Information --- */}
              <div className='mb-1'>
                <h2 className='text-base font-semibold font-onest text-black'>
                  Personal Information
                </h2>
                <p className='text-xs text-[#5F6264] font-onest mt-0.5'>
                  Tell us a bit about yourself
                </p>
              </div>

              <div className='grid sm:grid-cols-2 gap-4'>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    First Name <span className='text-error'>*</span>
                  </label>
                  <div className='w-full bg-white input input-bordered border-[#D0D5DD] placeholder:text-[#7E8285] flex items-center gap-2 focus-within:shadow-none min-h-10 h-10'>
                    <IoPersonSharp className='text-base text-[#98A2B3]' />
                    <input
                      name='first_name'
                      placeholder='John'
                      required
                      defaultValue={
                        restoredData?.first_name || user?.first_name || ""
                      }
                      className='grow bg-transparent outline-none text-sm font-onest'
                    />
                  </div>
                </div>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    Last Name <span className='text-error'>*</span>
                  </label>
                  <div className='w-full bg-white input input-bordered border-[#D0D5DD] placeholder:text-[#7E8285] flex items-center gap-2 focus-within:shadow-none min-h-10 h-10'>
                    <IoPersonSharp className='text-base text-[#98A2B3]' />
                    <input
                      name='last_name'
                      placeholder='Doe'
                      required
                      defaultValue={
                        restoredData?.last_name || user?.last_name || ""
                      }
                      className='grow bg-transparent outline-none text-sm font-onest'
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className='label-text text-black font-medium font-onest mb-1 block'>
                  Email <span className='text-error'>*</span>
                </label>
                <div className='w-full bg-white input input-bordered border-[#D0D5DD] placeholder:text-[#7E8285] flex items-center gap-2 focus-within:shadow-none min-h-10 h-10'>
                  <IoMail className='text-base text-[#98A2B3]' />
                  <input
                    name='email'
                    type='email'
                    placeholder='john@example.com'
                    required
                    defaultValue={restoredData?.email || user?.email || ""}
                    className='grow bg-transparent outline-none text-sm font-onest'
                  />
                </div>
              </div>

              <div className='grid sm:grid-cols-2 gap-4'>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    Phone
                  </label>
                  <div className='w-full bg-white input input-bordered border-[#D0D5DD] placeholder:text-[#7E8285] flex items-center gap-2 focus-within:shadow-none min-h-10 h-10'>
                    <IoCall className='text-base text-[#98A2B3]' />
                    <input
                      name='phone'
                      type='tel'
                      placeholder='+234 800 000 0000'
                      defaultValue={restoredData?.phone || ""}
                      className='grow bg-transparent outline-none text-sm font-onest'
                    />
                  </div>
                </div>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    LinkedIn Profile
                  </label>
                  <div className='w-full bg-white input input-bordered border-[#D0D5DD] placeholder:text-[#7E8285] flex items-center gap-2 focus-within:shadow-none min-h-10 h-10'>
                    <IoIosLink className='text-base text-[#98A2B3]' />
                    <input
                      name='linkedin'
                      type='url'
                      placeholder='https://linkedin.com/in/johndoe'
                      defaultValue={restoredData?.linkedin || ""}
                      className='grow bg-transparent outline-none text-sm font-onest'
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className='label-text text-black font-medium font-onest mb-1 block'>
                  Portfolio / Website
                </label>
                <div className='w-full bg-white input input-bordered border-[#D0D5DD] placeholder:text-[#7E8285] flex items-center gap-2 focus-within:shadow-none min-h-10 h-10'>
                  <IoIosLink className='text-base text-[#98A2B3]' />
                  <input
                    name='portfolio'
                    type='url'
                    placeholder='https://johndoe.com'
                    defaultValue={restoredData?.portfolio || ""}
                    className='grow bg-transparent outline-none text-sm font-onest'
                  />
                </div>
              </div>

              {/* Resume Upload */}
              <div>
                <label className='label-text text-black font-medium font-onest mb-1 block'>
                  CV / Resume
                </label>
                <p className='text-xs text-[#7E8285] font-onest mb-1.5'>
                  PDF, DOC, or DOCX (max 5MB)
                </p>
                {selectedFile ? (
                  <div className='flex items-center gap-3 rounded-lg border border-[#D0D5DD] bg-white p-3'>
                    <div className='w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0'>
                      <FaFileAlt className='h-5 w-5 text-primary' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium font-onest text-black truncate'>
                        {selectedFile.name}
                      </p>
                      <p className='text-xs text-[#7E8285] font-onest'>
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type='button'
                      onClick={removeFile}
                      className='p-1 rounded-md hover:bg-gray-100 text-[#98A2B3] hover:text-black transition-colors'
                    >
                      <IoClose className='h-4 w-4' />
                    </button>
                  </div>
                ) : (
                  <button
                    type='button'
                    onClick={() => fileInputRef.current?.click()}
                    className='w-full flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-[#D0D5DD] hover:border-primary/50 bg-white hover:bg-primary/5 p-6 transition-colors cursor-pointer'
                  >
                    <div className='w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center'>
                      <FaFileAlt className='h-5 w-5 text-primary' />
                    </div>
                    <div className='text-center'>
                      <p className='text-sm font-medium font-onest text-black'>
                        Click to upload your resume
                      </p>
                      <p className='text-xs text-[#7E8285] font-onest'>
                        PDF, DOC, or DOCX up to 5MB
                      </p>
                    </div>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                  onChange={handleFileChange}
                  className='hidden'
                />
              </div>

              {/* --- Professional Information --- */}
              <div className='mb-1 pt-3'>
                <h2 className='text-base font-semibold font-onest text-black'>
                  Professional Information
                </h2>
                <p className='text-xs text-[#5F6264] font-onest mt-0.5'>
                  Help the recruiting team understand your background
                </p>
              </div>

              <div className='grid sm:grid-cols-2 gap-4'>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    Current Role
                  </label>
                  <div className='w-full bg-white input input-bordered border-[#D0D5DD] placeholder:text-[#7E8285] flex items-center gap-2 focus-within:shadow-none min-h-10 h-10'>
                    <IoBriefcase className='text-base text-[#98A2B3]' />
                    <input
                      name='current_role'
                      placeholder='e.g. Senior Software Engineer'
                      defaultValue={restoredData?.current_role || ""}
                      className='grow bg-transparent outline-none text-sm font-onest'
                    />
                  </div>
                </div>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    Experience Level
                  </label>
                  <select
                    name='experience_level'
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className='w-full bg-white input input-bordered border-[#D0D5DD] min-h-10 h-10 text-sm font-onest focus:shadow-none'
                  >
                    <option value='' disabled>
                      Select level
                    </option>
                    {EXPERIENCE_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className='grid sm:grid-cols-2 gap-4'>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    Location / Country
                  </label>
                  <div className='w-full bg-white input input-bordered border-[#D0D5DD] placeholder:text-[#7E8285] flex items-center gap-2 focus-within:shadow-none min-h-10 h-10'>
                    <IoLocation className='text-base text-[#98A2B3]' />
                    <input
                      name='location'
                      placeholder='e.g. Lagos, Nigeria'
                      defaultValue={restoredData?.location || ""}
                      className='grow bg-transparent outline-none text-sm font-onest'
                    />
                  </div>
                </div>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    Current Pay (Annual)
                  </label>
                  <div className='flex gap-2'>
                    <select
                      name='pay_currency'
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className='bg-white input input-bordered border-[#D0D5DD] min-h-10 h-10 text-sm font-onest focus:shadow-none w-20 shrink-0 px-2'
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <div className='flex-1 bg-white input input-bordered border-[#D0D5DD] placeholder:text-[#7E8285] flex items-center gap-2 focus-within:shadow-none min-h-10 h-10'>
                      <input
                        name='current_pay'
                        type='number'
                        placeholder='e.g. 80000'
                        min='0'
                        defaultValue={restoredData?.current_pay || ""}
                        className='grow bg-transparent outline-none text-sm font-onest w-full'
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className='label-text text-black font-medium font-onest mb-1 block'>
                  Frameworks / Tools
                </label>
                <div className='w-full bg-white input input-bordered border-[#D0D5DD] placeholder:text-[#7E8285] flex items-center gap-2 focus-within:shadow-none min-h-10 h-10'>
                  <IoBriefcase className='text-base text-[#98A2B3]' />
                  <input
                    name='frameworks'
                    placeholder='e.g. React, Node.js, Python, AWS (comma-separated)'
                    defaultValue={restoredData?.frameworks || ""}
                    className='grow bg-transparent outline-none text-sm font-onest'
                  />
                </div>
              </div>

              <div>
                <label className='label-text text-black font-medium font-onest mb-1 block'>
                  Professional Summary
                </label>
                <textarea
                  name='summary'
                  placeholder='Briefly describe your experience, skills, and what you&#39;re looking for...'
                  rows={4}
                  defaultValue={restoredData?.summary || ""}
                  className='w-full bg-white textarea textarea-bordered border-[#D0D5DD] placeholder:text-[#7E8285] text-sm font-onest focus:shadow-none resize-none'
                />
              </div>

              {/* Submit */}
              <button
                type='submit'
                disabled={isSubmitting}
                className='btn btn-primary text-white w-full mt-6'
              >
                {isSubmitting
                  ? "Submitting..."
                  : `Join ${companyName}'s Talent Network`}
              </button>

              <p className='text-xs text-[#7E8285] text-center font-onest mt-2'>
                By submitting, you agree to share your information with{" "}
                {companyName}&apos;s recruiting team through TIAAGO.
              </p>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
