import Image from "next/image";
import hero_home from '/public/assets/images/hero-home.png';
import { useEffect } from "react";
import Typed from "typed.js";
import { m } from "framer-motion";
import AuthButton from "../AuthButton";

const HeroSection = () => {

    useEffect(() => {
        const options = {
          strings: ["curated"],
          typeSpeed: 80,
          backSpeed: 50,
          backDelay: 800,
          showCursor: false,
          loop: false
        };
    
        const typed = new Typed(".typing", options);
    
        return () => {
          typed.destroy();
        };
      }, []);


    return (
        <div className='text-center py-20 pb-4 md:px-10 min-[300px]:px-4 pb-14'>

        <m.h1 
        className={`md:text-6xl font-medium xl:w-4/5 md:w-full mx-auto min-[300px]:text-3xl min-[300px]:w-full`}
        variants={{
            hidden: { opacity: 0, y: 75 },
            visible: { opacity:1, y: 0 }
          }}

        initial="hidden"
        whileInView="visible"
        transition={{ duration: 1, delay: 0.25 }}
        viewport={{ once: true, amount: 0.1 }}
        >
 
          Forge elite teams with our {" "}
          <span className='typing text-[#5465FF]'></span> network of pre-vetted tech talent.
        </m.h1>

        <m.p
        className={`md:text-xl my-6 md:w-3/5 mx-auto min-[300px]:text-lg min-[300px]:w-full`}
        variants={{
            hidden: { opacity: 0, x: 75 },
            visible: { opacity:1, x: 0 }
          }}

        initial="hidden"
        whileInView="visible"
        transition={{ duration: 1, delay: 0.50 }}
        viewport={{ once: true, amount: 0.1 }}
        >

    
          We connect the top 3% of technical and non-technical talents with the businesses and startups to build, scale and grow.
        </m.p>
       


        <m.div
        variants={{
            hidden: { opacity: 0, y: -75 },
            visible: { opacity:1, y: 0 },
          }}

          initial="hidden"
          whileInView="visible"
          transition={{ duration: 1, delay: 0.75 }}
          viewport={{ once: true, amount: 0.1 }}
        >
        <AuthButton
          text="Hire a talent"
          className={`bg-[#5465FF] md:py-4 min-[300px]:py-3 px-8 inline-block rounded-full md:text-xl min-[300px]:text-lg  text-white transition ease-in-out duration-300 hover:bg-[var(--side-bg)]`}
        />
        </m.div>



          <m.div
          className='mt-6'

          variants={{
            hidden: { opacity: 0, scale: 0.5 },
            visible: { opacity:1, scale: 1 }
          }}

          initial="hidden"
          whileInView="visible"
          transition={{ duration: 1, delay: 1 }}
          viewport={{ once: true, amount: 0.1 }}
          >
          <div className='mt-6'>
          <Image
            src={hero_home}
            priority
            alt='Home_Hero_Section'
            className='object-cover'
          />
        </div>
          </m.div>
        
      </div>
      );
}
 
export default HeroSection;