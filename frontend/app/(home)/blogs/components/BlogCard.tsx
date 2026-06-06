import Image from "next/image";
import Link from "next/link";
import React from "react";

type contentType = {
  mainparagraph: string[];
  subtext: {
    num: number;
    subtext_title: string;
    subtext_body: string[];
  }[];
};
const BlogCard = ({
  id,
  image,
  title,
  content,
}: {
  id: number;
  image: any;
  title: string;
  content: contentType;
}) => {
  const blogIntroText = content.mainparagraph[0].slice(0, 180);
  return (
    <div className='h-auto  w-[100%] shadow-lg rounded-2xl'>
      <div className='flex flex-col gap-2 justify-between'>
        <div className='h-[40%]'>
          <Image src={image} alt='' className='w-[100%] h-[250px] ' />
        </div>
        <div className='m-3 mt-0'>
          <div className='md:h-[100px]'>
            <h1 className='font-inter text-xl md:text-2xl leading-7 font-bold text-[#010809] py-2 '>
              {title}
            </h1>
          </div>
          <div className='md:mt-3 flex flex-col justify-between'>
            <div className='card:h-[200px] xl:h-[170px]'>
              <p className='text-[#353B3C] text-clip font-inter text-base md:text-lg mt-1 font-normal mb-3'>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{blogIntroText}...
              </p>
            </div>

            <div className='mt-10 md:mt-0 lg:mt-9 xl:mt-5'>
              <Link
                href={`/blogs/${id}`}
                className='px-4 py-2 md:mt-0 border border-[#5465FF] text-[#5465FF] rounded-full w-32 font-semibold text-sm font-inter'
              >
                Read Article
              </Link>

              <ul className='flex mt-7 mb-2'>
                <li className='me-4 font-semibold text-xs  text-[#010809]'>
                  Technology
                </li>
                <li className='me-4 text-[#691B0D] font-semibold text-xs '>
                  AI
                </li>
                <li className='me-4 text-[#5465FF] font-semibold text-xs '>
                  StartUp
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* <div className='m-3 flex flex-col gap-5 justify-between'>
            <h1 className='font-inter text-xl md:text-2xl leading-7 font-bold text-[#010809] py-2 '>
              {title}
            </h1>

            <p className='text-[#353B3C] font-inter text-base md:text-lg mt-1 font-normal mb-3'>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{blogIntroText}...
            </p>

            <Link
              href={`/blogs/${id}`}
              className='px-4 py-2 border border-[#5465FF] text-[#5465FF] rounded-full w-32 font-semibold text-sm font-inter'
            >
              Read Article
            </Link>

            <ul className='flex mt-7 mb-2'>
              <li className='me-4 font-semibold text-xs  text-[#010809]'>
                Technology
              </li>
              <li className='me-4 text-[#691B0D] font-semibold text-xs '>AI</li>
              <li className='me-4 text-[#5465FF] font-semibold text-xs '>
                StartUp
              </li>
            </ul>
          </div> */}
      </div>
    </div>
  );
};

export default BlogCard;
