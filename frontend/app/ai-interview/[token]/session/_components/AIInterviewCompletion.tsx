import { CheckCircle2 } from "lucide-react";

const AIInterviewCompletion = ({ candidateFirstName }: { candidateFirstName: string }) => (
  <div className='min-h-[100svh] w-full bg-white flex items-center justify-center px-6'>
    <div className='max-w-md w-full text-center'>
      <CheckCircle2 className='mx-auto h-16 w-16 text-primary mb-6 animate-[scale-in_0.4s_ease-out]' strokeWidth={1.5} />
      <h1 className='text-2xl md:text-[28px] font-bold text-primary-black font-space-grotesk mb-3'>
        Interview complete
      </h1>
      <p className='text-secondary-black leading-7 mb-1'>Thank you, {candidateFirstName || "there"}.</p>
      <p className='text-secondary-black leading-7'>
        Our team will review your interview and be in touch about next steps.
      </p>
      <p className='text-secondary-black leading-7 mt-4 text-sm'>You can close this tab.</p>
    </div>
  </div>
);

export default AIInterviewCompletion;
