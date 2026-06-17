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
import { FaShieldAlt, FaFileAlt, FaCheck } from "react-icons/fa";
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

type FormState = {
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

const INITIAL_FORM: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  linkedin: "",
  portfolio: "",
  current_role: "",
  experience_level: "",
  location: "",
  current_pay: "",
  currency: "USD",
  frameworks: "",
  summary: "",
};

const STEP_LABELS = [
  "Your Name",
  "Contact Details",
  "Portfolio & Resume",
  "Professional Info",
  "Compensation & Summary",
];

export function InviteApplicationForm({
  token,
  categoryName,
  companyName,
}: InviteApplicationFormProps) {
  const router = useRouter();
  const user = useUserStore((s) => s.profile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showMobileSplash, setShowMobileSplash] = useState(true);
  const touchStartY = useRef(0);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(() => ({
    ...INITIAL_FORM,
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    email: user?.email || "",
  }));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY(token));
      if (saved) {
        const parsed = JSON.parse(saved) as FormState;
        setForm(parsed);
        setStep(5);
        sessionStorage.removeItem(SESSION_STORAGE_KEY(token));
      }
    } catch {
      // ignore
    }
  }, [token]);

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 1) {
      if (!form.first_name.trim()) newErrors.first_name = "First name is required";
      if (!form.last_name.trim()) newErrors.last_name = "Last name is required";
    }
    if (step === 2) {
      if (!form.email.trim()) newErrors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        newErrors.email = "Enter a valid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", { description: "Max 5MB." });
      e.target.value = "";
      return;
    }
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.type)) {
      toast.error("Invalid file type", { description: "PDF, DOC, or DOCX only." });
      e.target.value = "";
      return;
    }
    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      toast.error("Required fields missing", {
        description: "Please fill in your name and email.",
      });
      setStep(!form.first_name.trim() || !form.last_name.trim() ? 1 : 2);
      return;
    }

    if (!user) {
      sessionStorage.setItem(SESSION_STORAGE_KEY(token), JSON.stringify(form));
      toast.info("Please create an account first", {
        description: "You'll be redirected to sign up, then back here.",
      });
      router.push(`/talents/signup?next=/sourcing/invite/${token}`);
      return;
    }

    const formData = new FormData();
    formData.append("first_name", form.first_name);
    formData.append("last_name", form.last_name);
    formData.append("email", form.email);
    if (form.phone) formData.append("phone", form.phone);
    if (form.linkedin) formData.append("linkedin_url", form.linkedin);
    if (form.portfolio) formData.append("portfolio_url", form.portfolio);
    if (selectedFile) formData.append("resume", selectedFile);
    if (form.current_role) formData.append("current_role", form.current_role);
    if (form.experience_level) formData.append("experience_level", form.experience_level);
    if (form.location) formData.append("country", form.location);
    if (form.current_pay) {
      formData.append("current_pay", form.current_pay);
      formData.append("pay_currency", form.currency);
    }
    if (form.frameworks) formData.append("skills", form.frameworks);
    if (form.summary) formData.append("summary", form.summary);

    setIsSubmitting(true);
    try {
      const result = await submitInviteApplication(token, formData);
      if (result.success) {
        setIsSuccess(true);
      } else {
        toast.error("Submission failed", {
          description: result.error || "Something went wrong.",
        });
      }
    } catch {
      toast.error("Submission failed", {
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Input helper
  const inputBox = (
    icon: React.ReactNode,
    children: React.ReactNode,
    error?: string
  ) => (
    <>
      <div
        className={`w-full bg-white input input-bordered ${error ? "border-error" : "border-[#D0D5DD]"} placeholder:text-[#7E8285] flex items-center gap-2 focus-within:shadow-none min-h-10 h-10`}
      >
        {icon}
        {children}
      </div>
      {error && (
        <p className='text-error text-xs font-onest mt-1'>{error}</p>
      )}
    </>
  );

  if (isSuccess) {
    return (
      <div className='h-[100svh] w-[100svw] bg-white relative overflow-hidden'>
        <Image
          src='/assets/images/Pricing Background pattern.png'
          alt='Bg'
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
                  Your profile is now visible to {companyName}&apos;s team
                </li>
                <li className='flex items-start gap-2'>
                  <FaCheck className='h-4 w-4 text-success mt-0.5 shrink-0' />
                  You&apos;ll be notified when a role matches
                </li>
                <li className='flex items-start gap-2'>
                  <FaCheck className='h-4 w-4 text-success mt-0.5 shrink-0' />
                  Keep your TIAAGO profile updated for best matches
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

  const [splashExiting, setSplashExiting] = useState(false);

  const dismissSplash = () => {
    setSplashExiting(true);
    setTimeout(() => setShowMobileSplash(false), 500);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (delta > 60) dismissSplash();
  };

  return (
    <>
      {/* Mobile Splash — gradient, rolls up on dismiss */}
      {showMobileSplash && (
        <div
          className={`fixed inset-0 z-50 md:hidden bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-primary flex flex-col items-center justify-between text-center px-6 py-12 transition-transform duration-500 ease-in-out ${
            splashExiting ? "-translate-y-full" : "translate-y-0"
          }`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <Image
            src='/assets/images/Auth Background pattern.png'
            alt=''
            className='object-cover opacity-20'
            fill
          />
          <div className='relative' />
          <div className='relative space-y-6 max-w-sm'>
            <BrandLink
              isAlt
              className='text-white'
              containerClassName='block w-fit mx-auto'
            />
            <div className='space-y-3'>
              <p className='text-primary-content/70 text-xs font-onest uppercase tracking-widest'>
                Exclusive Invite
              </p>
              <h1 className='text-white font-onest font-bold text-3xl leading-tight'>
                {companyName
                  ? `Join ${companyName}'s ${categoryName} Talent Network`
                  : `Join the ${categoryName} Talent Network`}
              </h1>
              <p className='text-white/60 text-sm font-onest'>
                Get early access to opportunities, connect directly with the
                recruiting team, and be first in line for roles.
              </p>
            </div>
            <div className='flex items-center justify-center gap-6 text-white/50 text-xs font-onest'>
              <span className='flex items-center gap-1.5'>
                <IoSparkles className='h-3.5 w-3.5' /> Early Access
              </span>
              <span className='flex items-center gap-1.5'>
                <FaShieldAlt className='h-3 w-3' /> Privacy First
              </span>
            </div>
          </div>
          <div className='relative'>
            <button
              onClick={dismissSplash}
              className='btn btn-white bg-white text-black border-0 w-full font-onest font-semibold'
            >
              Get Started
            </button>
          </div>
        </div>
      )}

    <div className='h-[100svh] w-[100svw] bg-white scrollbar-none md:scrollbar-thin relative overflow-x-hidden'>
      <Image
        src='/assets/images/Pricing Background pattern.png'
        alt='Bg'
        className='object-cover'
        fill
      />
      <div className='relative grid md:grid-cols-2 max-md:items-start h-full'>
        {/* Left Panel */}
        <div className='pl-5 py-[30px] flex max-md:hidden'>
          <div className='bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-primary rounded-[30px] flex-1 pt-[65px] pb-20 px-[60px] relative overflow-hidden'>
            <Image
              src='/assets/images/Auth Background pattern.png'
              alt='Bg'
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
                  {companyName
                    ? `Join ${companyName}'s Talent Network`
                    : `Join the ${categoryName} Talent Network`}
                </h2>
                <p className='text-[#E4DBDB] font-onest text-xl max-w-[480px]'>
                  {companyName
                    ? `You've been invited to join the ${categoryName.toLowerCase()} talent community. Get early access to opportunities and connect directly with the recruiting team.`
                    : `You've been invited to join an exclusive ${categoryName.toLowerCase()} talent community. Complete your profile to get started.`}
                </p>
              </div>
              {/* Animated Illustration */}
              <div className='mt-10 flex items-center justify-center'>
                <object
                  type='image/svg+xml'
                  data='/assets/Invite-amico.svg'
                  className='w-full max-w-[420px]'
                  aria-label='Invite illustration'
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <main className='min-h-[100svh] overflow-y-auto flex flex-col'>
          <div className='px-4 py-5 md:hidden'>
            <BrandLink containerClassName='block w-fit' />
          </div>

          <div className='w-full md:max-w-[454px] mx-auto px-4 md:pt-16 pb-12 flex-1 flex flex-col justify-center'>
            <h1 className='text-2xl md:text-4xl font-semibold text-left font-onest text-black'>
              Create Your Profile
            </h1>
            <p className='text-[#5F6264] text-sm font-onest mt-2 mb-6'>
              Step {step} of 5 &mdash; {STEP_LABELS[step - 1]}.{" "}
              <Link
                href='/talents/signin'
                className='font-semibold text-primary hover:underline'
              >
                Already have an account?
              </Link>
            </p>

            {/* Progress Bar */}
            <div className='flex items-center gap-1.5 mb-8'>
              {STEP_LABELS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                    i + 1 < step
                      ? "bg-success"
                      : i + 1 === step
                        ? "bg-primary"
                        : "bg-[#E4E7EC]"
                  }`}
                />
              ))}
            </div>

            {/* Step 1: Name */}
            {step === 1 && (
              <div className='space-y-5 animate-in fade-in duration-200'>
                <div>
                  <h2 className='text-base font-semibold font-onest text-black'>
                    What&apos;s your name?
                  </h2>
                  <p className='text-xs text-[#5F6264] font-onest mt-0.5'>
                    {companyName
                    ? `This is how ${companyName}'s team will know you`
                    : "This is how the recruiting team will know you"}
                  </p>
                </div>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    First Name <span className='text-error'>*</span>
                  </label>
                  {inputBox(
                    <IoPersonSharp className='text-base text-[#98A2B3]' />,
                    <input
                      placeholder='John'
                      value={form.first_name}
                      onChange={(e) => update("first_name", e.target.value)}
                      className='grow bg-transparent outline-none text-sm font-onest'
                      autoFocus
                    />,
                    errors.first_name
                  )}
                </div>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    Last Name <span className='text-error'>*</span>
                  </label>
                  {inputBox(
                    <IoPersonSharp className='text-base text-[#98A2B3]' />,
                    <input
                      placeholder='Doe'
                      value={form.last_name}
                      onChange={(e) => update("last_name", e.target.value)}
                      className='grow bg-transparent outline-none text-sm font-onest'
                    />,
                    errors.last_name
                  )}
                </div>
                <button
                  type='button'
                  onClick={handleNext}
                  className='btn btn-primary text-white w-full'
                >
                  Continue
                </button>
              </div>
            )}

            {/* Step 2: Contact */}
            {step === 2 && (
              <div className='space-y-5 animate-in fade-in duration-200'>
                <div>
                  <h2 className='text-base font-semibold font-onest text-black'>
                    How can we reach you?
                  </h2>
                  <p className='text-xs text-[#5F6264] font-onest mt-0.5'>
                    Your email is required, the rest is optional
                  </p>
                </div>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    Email <span className='text-error'>*</span>
                  </label>
                  {inputBox(
                    <IoMail className='text-base text-[#98A2B3]' />,
                    <input
                      type='email'
                      placeholder='john@example.com'
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      className='grow bg-transparent outline-none text-sm font-onest'
                      autoFocus
                    />,
                    errors.email
                  )}
                </div>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    Phone
                  </label>
                  {inputBox(
                    <IoCall className='text-base text-[#98A2B3]' />,
                    <input
                      type='tel'
                      placeholder='+234 800 000 0000'
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      className='grow bg-transparent outline-none text-sm font-onest'
                    />
                  )}
                </div>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    LinkedIn
                  </label>
                  {inputBox(
                    <IoIosLink className='text-base text-[#98A2B3]' />,
                    <input
                      type='url'
                      placeholder='https://linkedin.com/in/johndoe'
                      value={form.linkedin}
                      onChange={(e) => update("linkedin", e.target.value)}
                      className='grow bg-transparent outline-none text-sm font-onest'
                    />
                  )}
                </div>
                <div className='flex gap-3'>
                  <button
                    type='button'
                    onClick={handleBack}
                    className='btn btn-ghost flex-1'
                  >
                    Back
                  </button>
                  <button
                    type='button'
                    onClick={handleNext}
                    className='btn btn-primary text-white flex-1'
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Portfolio & Resume */}
            {step === 3 && (
              <div className='space-y-5 animate-in fade-in duration-200'>
                <div>
                  <h2 className='text-base font-semibold font-onest text-black'>
                    Show your work
                  </h2>
                  <p className='text-xs text-[#5F6264] font-onest mt-0.5'>
                    Optional — but helps the team learn about you faster
                  </p>
                </div>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    Portfolio / Website
                  </label>
                  {inputBox(
                    <IoIosLink className='text-base text-[#98A2B3]' />,
                    <input
                      type='url'
                      placeholder='https://johndoe.com'
                      value={form.portfolio}
                      onChange={(e) => update("portfolio", e.target.value)}
                      className='grow bg-transparent outline-none text-sm font-onest'
                      autoFocus
                    />
                  )}
                </div>
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
                      className='w-full flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-[#D0D5DD] hover:border-primary/50 bg-white hover:bg-primary/5 p-5 transition-colors cursor-pointer'
                    >
                      <div className='w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center'>
                        <FaFileAlt className='h-5 w-5 text-primary' />
                      </div>
                      <div className='text-center'>
                        <p className='text-sm font-medium font-onest text-black'>
                          Click to upload
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
                    accept='.pdf,.doc,.docx'
                    onChange={handleFileChange}
                    className='hidden'
                  />
                </div>
                <div className='flex gap-3'>
                  <button type='button' onClick={handleBack} className='btn btn-ghost flex-1'>
                    Back
                  </button>
                  <button type='button' onClick={handleNext} className='btn btn-primary text-white flex-1'>
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Professional Info */}
            {step === 4 && (
              <div className='space-y-5 animate-in fade-in duration-200'>
                <div>
                  <h2 className='text-base font-semibold font-onest text-black'>
                    Your professional background
                  </h2>
                  <p className='text-xs text-[#5F6264] font-onest mt-0.5'>
                    {companyName
                    ? `Helps ${companyName} match you to the right roles`
                    : "Helps the team match you to the right roles"}
                  </p>
                </div>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    Current Role
                  </label>
                  {inputBox(
                    <IoBriefcase className='text-base text-[#98A2B3]' />,
                    <input
                      placeholder='e.g. Senior Software Engineer'
                      value={form.current_role}
                      onChange={(e) => update("current_role", e.target.value)}
                      className='grow bg-transparent outline-none text-sm font-onest'
                      autoFocus
                    />
                  )}
                </div>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    Experience Level
                  </label>
                  <select
                    value={form.experience_level}
                    onChange={(e) => update("experience_level", e.target.value)}
                    className='w-full bg-white input input-bordered border-[#D0D5DD] min-h-10 h-10 text-sm font-onest focus:shadow-none'
                  >
                    <option value='' disabled>Select level</option>
                    {EXPERIENCE_LEVELS.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    Applying For
                  </label>
                  <div className='w-full bg-[#F9FAFB] input input-bordered border-[#D0D5DD] flex items-center gap-2 min-h-10 h-10 cursor-not-allowed'>
                    <IoBriefcase className='text-base text-[#98A2B3]' />
                    <span className='text-sm font-onest text-[#5F6264]'>
                      {categoryName}
                    </span>
                  </div>
                </div>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    Location / Country
                  </label>
                  {inputBox(
                    <IoLocation className='text-base text-[#98A2B3]' />,
                    <input
                      placeholder='e.g. Lagos, Nigeria'
                      value={form.location}
                      onChange={(e) => update("location", e.target.value)}
                      className='grow bg-transparent outline-none text-sm font-onest'
                    />
                  )}
                </div>
                <div className='flex gap-3'>
                  <button type='button' onClick={handleBack} className='btn btn-ghost flex-1'>
                    Back
                  </button>
                  <button type='button' onClick={handleNext} className='btn btn-primary text-white flex-1'>
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Compensation & Summary */}
            {step === 5 && (
              <div className='space-y-5 animate-in fade-in duration-200'>
                <div>
                  <h2 className='text-base font-semibold font-onest text-black'>
                    Almost done!
                  </h2>
                  <p className='text-xs text-[#5F6264] font-onest mt-0.5'>
                    Optional details to strengthen your profile
                  </p>
                </div>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    Current Pay (Annual)
                  </label>
                  <div className='flex gap-2'>
                    <select
                      value={form.currency}
                      onChange={(e) => update("currency", e.target.value)}
                      className='bg-white input input-bordered border-[#D0D5DD] min-h-10 h-10 text-sm font-onest focus:shadow-none w-20 shrink-0 px-2'
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <div className='flex-1 bg-white input input-bordered border-[#D0D5DD] placeholder:text-[#7E8285] flex items-center focus-within:shadow-none min-h-10 h-10'>
                      <input
                        type='number'
                        placeholder='e.g. 80000'
                        min='0'
                        value={form.current_pay}
                        onChange={(e) => update("current_pay", e.target.value)}
                        className='grow bg-transparent outline-none text-sm font-onest w-full'
                        autoFocus
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    Frameworks / Tools
                  </label>
                  {inputBox(
                    <IoBriefcase className='text-base text-[#98A2B3]' />,
                    <input
                      placeholder='e.g. React, Node.js, Python (comma-separated)'
                      value={form.frameworks}
                      onChange={(e) => update("frameworks", e.target.value)}
                      className='grow bg-transparent outline-none text-sm font-onest'
                    />
                  )}
                </div>
                <div>
                  <label className='label-text text-black font-medium font-onest mb-1 block'>
                    Professional Summary
                  </label>
                  <textarea
                    placeholder="Briefly describe your experience and what you're looking for..."
                    rows={3}
                    value={form.summary}
                    onChange={(e) => update("summary", e.target.value)}
                    className='w-full bg-white textarea textarea-bordered border-[#D0D5DD] placeholder:text-[#7E8285] text-sm font-onest focus:shadow-none resize-none'
                  />
                </div>
                <div className='flex gap-3'>
                  <button type='button' onClick={handleBack} className='btn btn-ghost flex-1'>
                    Back
                  </button>
                  <button
                    type='button'
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className='btn btn-primary text-white flex-1'
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : companyName ? `Join ${companyName}'s Network` : "Submit Application"}
                  </button>
                </div>
                <p className='text-xs text-[#7E8285] text-center font-onest'>
                  By submitting, you agree to share your information with{" "}
                  {companyName
                    ? `${companyName}'s recruiting team`
                    : "the recruiting team"}{" "}
                  through TIAAGO.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
    </>
  );
}
