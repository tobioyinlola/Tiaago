import Reveal from "./Reveal";

const SectionHeading = ({
  headline,
  body,
  align = "center",
}: {
  headline: string;
  body?: string;
  align?: "center" | "left";
}) => (
  <Reveal className={`max-w-2xl mb-10 md:mb-14 ${align === "center" ? "mx-auto text-center" : "text-left"}`}>
    <h2 className='text-3xl md:text-4xl font-medium font-onest text-black mb-4'>{headline}</h2>
    {body && <p className='text-base md:text-lg font-onest text-[#5F6264]'>{body}</p>}
  </Reveal>
);

export default SectionHeading;
