import Link from "next/link";

export const metadata = {
  title: "Case study project",
};

const instructions = [
  "Choose your challenge: We've prepared a selection of real-world design problems (list the different design problems briefly). Pick one that ignites your passion and resonates with your skillset.",
  "Dig deep, design bold: Research, analyze, iterate, and craft a solution that truly wows. Think outside the box, experiment with unique approaches, and let your creativity run wild.",
  "Document your journey: Capture your design process every step of the way. Sketches, wireframes, mood boards, prototypes - anything that tells the story of your journey from problem to solution.",
  "Share your story: Write a compelling narrative that showcases your research, insights, and the impact of your design. Make it personal, informative, and visually engaging.",
];

const guidelines = [
  "Submit your case study in [format - e.g., PDF, online portfolio link].",
  "Include all relevant assets (designs, prototypes, research materials) for full impact.",
  "Deadline for submission is [date].",
];

const CaseStudyPage = () => {
  return (
    <div className='p-8 max-md:px-1 flex flex-col gap-6 sm:gap-8'>
      <div className='border-b border-gray-200 pb-1'>
        <h1 className='text-2xl font-space-grotesk font-semibold mb-1'>
          Case study project
        </h1>
        <p className='text-gray-900 text-base'>Start your case study project</p>
      </div>
      <h4 className='text-gray-900 text-lg font-medium'>About the project</h4>
      <article className='text-gray-500 text-base'>
        <p>Hey awesome talents,</p>
        <p className='mt-2'>
          Ready to level up your portfolio and wow future employers with your
          design prowess? We&apos;re inviting you to embark on a case study
          project, a chance to delve into a real-world design challenge and
          showcase your creative problem-solving skills in a captivating
          narrative. A well-crafted case study demonstrates your design process,
          thought leadership, and understanding of user needs. It shines a
          spotlight on your specific skillset and how you tackle complex
          problems.
        </p>
        <p className='mt-4 sm:mt-2'>Instructions</p>
        <ul className='ml-4 list-disc mt-4' key='instructions'>
          {instructions.map(instruction => (
            <li key={instruction}>{instruction}</li>
          ))}
          <li className='mt-4'>
            Submission Guidelines:
            <ul className='list-disc ml-4 pl-4' key='guidelines'>
              {guidelines.map(guideline => (
                <li key={guideline}>{guideline}</li>
              ))}
            </ul>
          </li>
        </ul>
      </article>
      <Link
        href='/talents/skill-assessment/case-study-project/select'
        className='btn btn-primary font-medium w-full max-w-md max-sm:mx-auto'
      >
        Start Case study Project
      </Link>
    </div>
  );
};

export default CaseStudyPage;
