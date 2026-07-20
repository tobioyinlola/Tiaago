import { CustomAuthButton } from "@/app/common/components/AuthButton";

const BlogCtaCard = () => {
  return (
    <div className='rounded-2xl bg-gradient-to-br from-[#5465FF] to-[#3A47B8] p-5 text-white'>
      <h3 className='text-base font-bold mb-1.5'>Hire smarter with AI</h3>
      <p className='text-sm text-white/80 mb-4 leading-relaxed'>
        Screen resumes and run skill assessments automatically -- free to start.
      </p>
      <CustomAuthButton
        variant='ghost'
        fullWidth
        className='rounded-lg bg-white text-[#5465FF] font-semibold hover:bg-gray-50'
      >
        Get Started
      </CustomAuthButton>
    </div>
  );
};

export default BlogCtaCard;
