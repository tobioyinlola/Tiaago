import React from "react";
import Image from "next/image";
import Link from "next/link";

import { FaChevronLeft } from "react-icons/fa6";
import { BsTwitter } from "react-icons/bs";
import { FiInstagram } from "react-icons/fi";
import { FaSquareXTwitter } from "react-icons/fa6";
import { FaFacebook, FaLinkedin, FaLinkedinIn } from "react-icons/fa";

import BlogPoster from "../components/BlogPoster";
import BlogCard from "../components/BlogCard";
import BlogPost from "../components/BlogPost";
import { BlogsItems } from "../constant/blogContent";
import assets from "../assets/assets";

const socialLinks = [
  //   {
  //     name: "Facebook",
  //     url: "#",
  //     Icon: FaFacebook,
  //   },
  {
    url: "https://instagram.com/talentsynchq?utm_source=qr&igshid=MzNlNGNkZWQ4Mg%3D%3D",
    Icon: FiInstagram,
  },
  {
    url: "https://twitter.com/_talentsync",
    Icon: FaSquareXTwitter,
  },
  {
    url: "https://www.linkedin.com/company/talentsyncglobal/",
    Icon: FaLinkedin,
  },
];

const page = async ({ params }: { params: Promise<{ id: number }> }) => {
  const resolvedParams = await params;
  const relatedArticles = BlogsItems.slice(1, 4);
  const blogs = BlogsItems.filter(blog => blog.id == resolvedParams.id);

  return (
    <main className='flex justify-center flex-col items-center mb-20'>
      <div className='w-[90%] mt-5'>
        <Link href='/blogs' className='flex items-center'>
          <FaChevronLeft className='text-xl' />
          <p className='ms-1 text-xl'>Back</p>
        </Link>

        <header className='mt-10'>
          <h1 className='text-xl  md:text-5xl font-bold'>
            {blogs.map(title => title.title)}
          </h1>

          {blogs.map((content, i) => (
            <p
              className='text-[#353B3C] font-normal mt-5 text-lg md:text-2xl'
              key={i}
            >
              {content.content.mainparagraph[0].slice(0, 210)}....
            </p>
          ))}

          <BlogPoster id={resolvedParams.id} />
        </header>

        <BlogPost id={resolvedParams.id} />

        <div>
          <ul className='flex mt-7 mb-2'>
            <li className='me-3 text-center bg-[#0108090a] p-2 w-28 rounded-2xl font-semibold text-xs text-[#010809]'>
              Technology
            </li>
            <li className='me-3 text-center bg-[#FDF0EE] p-2 w-20 rounded-2xl text-[#691B0D] font-semibold text-xs'>
              AI
            </li>
            <li className='me-3 text-center bg-[#5465ff2a] p-2 w-36 rounded-2xl text-[#5465FF] font-semibold text-xs'>
              Start Up
            </li>
          </ul>

          <div className='my-10 md:flex md:justify-between md:w-[100%]'>
            <div className='flex justify-between items-center'>
              <h1 className='font-normal text-xl md:text-3xl text-[#555E5F]'>
                Share This Post
              </h1>
              <button className='ms-4 flex justify-center items-center md:my-0  px-1 py-1 border border-[#5465FF] text-[#5465FF] rounded-3xl w-40 text-sm text-center font-semibold'>
                <Image
                  src={assets.share}
                  alt='shear'
                  width={30}
                  className='me-1'
                />
                <p>Share article</p>
              </button>
            </div>

            <div className='mt-5 mb-5   md:my-0 flex justify-between items-center'>
              <h1 className='text-xl md:text-2xl text-[#555E5F] w-36 me-5'>
                Follow us
              </h1>
              <ul className='flex justify-between item-center w-[50%]'>
                {socialLinks.map((social, i) => (
                  <Link
                    target='_blank'
                    href={social.url}
                    className='text-xl'
                    key={i}
                  >
                    <social.Icon />
                  </Link>
                ))}
              </ul>
            </div>
          </div>

          <div className='mb-10'>
            <h1 className='mb-4 font-bold text-4xl text-[#151718]'>
              Related Articles
            </h1>

            <div className='grid gap-4 mt-5 md:grid-cols-2 lg:grid-cols-3'>
              {relatedArticles.map(blog => (
                <BlogCard
                  key={blog.id}
                  id={blog.id}
                  image={blog.image}
                  title={blog.title}
                  content={blog.content}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default page;
