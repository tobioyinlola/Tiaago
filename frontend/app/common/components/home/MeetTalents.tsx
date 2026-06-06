import { useEffect, useRef, useState } from "react";
import { m, useAnimation, useInView } from "framer-motion";
import Image from "next/image";
import nigeria_flag from "/public/assets/images/home/flag/nigeria_flag.png";
import canada_flag from "/public/assets/images/home/flag/canada_flag.png";
import egypt_flag from "/public/assets/images/home/flag/egypt_flag.png";
import ghana_flag from "/public/assets/images/home/flag/ghana_flag.png";



const MeetTalents = () => {

const divRef = useRef<HTMLDivElement>(null);
const controls = useAnimation();
const inView = useInView(divRef, { once:true, amount: 0.1 });


useEffect(() => {
  const startAnimation = async() => {
    const width = divRef.current ? divRef.current.scrollWidth / 2 : 0;

    await controls.start({
      x:-width,
      transition: { duration: 24, ease: 'linear' }
    });

    controls.set({ x: 0 });

    startAnimation();
  };

  if (inView) {
    startAnimation();
  }

},[controls, inView]);






    return ( 
        <div className=''>
        <h1 className='text-[#010809] font-semibold text-center lg:text-4xl min-[300px]:text-2xl my-10'>
          MEET OUR AMAZING TALENTS
        </h1>


        {/* Meet our amazing talents carousel */}
        
        
        <m.div 
        className='carousel w-full h-[700px] overflow-x-visible'
        ref={divRef} 
        style={{ whiteSpace: 'nowrap'}}
        animate={controls}
        >
          
          <div
            id='slide1'
            className={`carousel-item relative md:w-2/5 min-[300px]:w-3/4 h-full`}
          >
            <m.div
            className="bg-[url('/assets/images/home/talents_pic/talent_img1.png')] bg-cover bg-center col-start-1 col-end-2 row-start-1 row-end-3 w-full rounded-3xl p-4 h-full relative"
            variants={{
              hidden: { opacity: 0, x:-75 },
              visible: { opacity:1, x:0, }
            }}
      
            initial="hidden"
            whileInView="visible"
            transition={{ duration: 1, delay: 0.25 }}
            viewport={{ once: true, amount: 0.1 }}
            
            >
              <Image src={nigeria_flag} alt='Nigeria Flag' />

              <div className='md:w-1/2 min-[300px]:w-4/5 border-solid border-2 border-whhite rounded-xl py-2.5 px-4 shadow-inner shadow-white backdrop-blur-[1px] absolute bottom-4 right-4'>
                <h4 className='text-lg font-semibold text-center text-white'>
                  Chidinma Wellington
                </h4>
                <p className='text-center text-xs text-white my-1'>
                  Product designer
                </p>
                <p className='text-center text-xs text-white'>
                  3 years experience
                </p>
              </div>
            </m.div>
          </div>

          <div
            id='slide2'
            className={`carousel-item relative md:w-2/5 min-[300px]:w-3/4 mx-6 h-full`}
          >
            <div className='flex flex-col items-between w-full h-full'>
              <m.div
              className="bg-[url('/assets/images/home/talents_pic/talent_img2.png')] bg-cover bg-center col-start-2 col-end-3 row-start-1 row-end-2 rounded-3xl p-4 relative w-full h-1/2 mb-3"
              variants={{
                hidden: { opacity: 0, y:75 },
                visible: { opacity:1, y:0, }
              }}
        
              initial="hidden"
              whileInView="visible"
              transition={{ duration: 1, delay: 0.50 }}
              viewport={{ once: true, amount: 0.1 }}
              >
                <Image src={ghana_flag} alt='Ghana Flag' />

                <div className='md:w-1/2 min-[300px]:w-4/5 border-solid border-2 border-whhite rounded-xl py-2.5 px-4 shadow-inner shadow-white backdrop-blur-[1px] absolute bottom-4 right-4'>
                  <h4 className='text-lg font-semibold text-center text-white'>
                    Kofi Nana
                  </h4>
                  <p className='text-center text-xs text-white my-1'>
                    Fullstack developer
                  </p>
                  <p className='text-center text-xs text-white'>
                    3 years experience
                  </p>
                </div>
              </m.div>
              


              <m.div
              className="bg-[url('/assets/images/home/talents_pic/talent_img3.png')] bg-cover bg-center col-start-2 col-end-3 row-start-2 row-end-3 rounded-3xl p-4 relative w-full h-1/2 mt-3"
              variants={{
                hidden: { opacity: 0, y:-75 },
                visible: { opacity:1, y:0, }
              }}
        
              initial="hidden"
              whileInView="visible"
              transition={{ duration: 1, delay: 0.75 }}
              viewport={{ once: true, amount: 0.1 }}
              >
                <Image src={canada_flag} alt='Canada Flag' />

                <div className='md:w-1/2 min-[300px]:w-4/5 border-solid border-2 border-whhite rounded-xl py-2.5 px-4 shadow-inner shadow-white backdrop-blur-[1px] absolute bottom-4 right-4'>
                  <h4 className='text-lg font-semibold text-center text-white'>
                    Juliet Godson
                  </h4>
                  <p className='text-center text-xs text-white my-1'>
                    Product manager
                  </p>
                  <p className='text-center text-xs text-white'>
                    6 years experience
                  </p>
                </div>
              </m.div>
      
            </div>
          </div>

          <div
            id='slide3'
            className={`carousel-item relative md:w-2/5 min-[300px]:w-3/4 h-full`}
          >

            <m.div
            className="bg-[url('/assets/images/home/talents_pic/talent_img4.png')] bg-cover bg-center col-start-3 col-end-4 row-start-1 row-end-3 rounded-3xl p-4 relative h-full w-full"
            variants={{
              hidden: { opacity: 0, x:75 },
              visible: { opacity:1, x:0, }
            }}
      
            initial="hidden"
            whileInView="visible"
            transition={{ duration: 1, delay: 1 }}
            viewport={{ once: true, amount: 0.1 }}
            >
              <Image src={egypt_flag} alt='Egypt Flag' />

              <div className='md:w-1/2 min-[300px]:w-4/5 border-solid border-2 border-whhite rounded-xl py-2.5 px-4 shadow-inner shadow-white backdrop-blur-[1px] absolute bottom-4 right-4'>
                <h4 className='text-lg font-semibold text-center text-white'>
                  Chidinma Wellington
                </h4>
                <p className='text-center text-xs text-white my-1'>
                  Product designer
                </p>
                <p className='text-center text-xs text-white'>
                  3 years experience
                </p>
              </div>
            </m.div>


          </div>
        </m.div>
      </div>
     );
}
 
export default MeetTalents;