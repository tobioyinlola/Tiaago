"use client";
import { m } from "framer-motion";
import Image from "next/image";
import quote_left from "/public/assets/images/home/quote_left.png";


interface testimonial_interface {
    content: string;
    from: string;
    x:number;
    delay: number;
  }

  const testimonial_content: testimonial_interface[] = [
    {
      content:
        "Tiaago has revolutionized our hiring process. The quality of candidates is outstanding, and the platform makes it easy to find and connect with the right talent.",
      from: "Trust, CMO at Qpay",
      x:100,
      delay: 0.25
    },
    {
      content:
        "We were able to hire highly skilled developers in a fraction of the time it used to take. Tiaago's vetting process ensures we only see the best candidates.",
      from: "J.B, Founder at Planetbase",
      x:75,
      delay: 0.50
    },
    {
      content:
        "The streamlined communication and scheduling features are game-changers. We've significantly improved our recruitment efficiency thanks to Tiaago.",
      from: "Temitayo, Founder at Brandom",
      x:50,
      delay: 0.75
    },
  ];





const TestimonialSection = () => {
    return ( 
        <div className='py-6 md:px-16 min-[300px]:px-4'>
        <h1 className='text-center font-semibold md:text-3xl min-[300px]:text-2xl  my-3'>
          Testimonials from Companies
        </h1>

        <div className='flex lg:flex-row min-[300px]:flex-col gap-10 items-center justify-center'>
          {testimonial_content.map((content, index) => {
            return (
              <m.div
              key={index}
              className='lg:w-2/6 min-[300px]:w-full py-10 px-6 pt-14 rounded-xl bg-[#F5F6FF]'
              variants={{
                hidden: { opacity: 0, x:content.x },
                visible: { opacity:1, x:0, }
              }}
        
              initial="hidden"
              whileInView="visible"
              transition={{ duration: 1, delay: content.delay }}
              viewport={{ once: true, amount: 0.1 }}

              
              >
                <Image src={quote_left} alt='Quote' />
                <p className='text-lg ms-8 my-2'>{content.content}</p>

                <h3 className='text-xl font-semibold text-end'>
                  ~{content.from}
                </h3>
              </m.div>
            );
          })}
        </div>
      </div>
     );
}
 
export default TestimonialSection;