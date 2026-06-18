import { Metadata } from "next";
import { BlogsItems } from "./constant/blogContent";

import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description: "Insights on hiring, talent acquisition, AI in recruitment, and building remote teams in Africa.",
  openGraph: { title: "TIAAGO Blog", description: "Insights on hiring, talent acquisition, and AI in recruitment.", siteName: "TIAAGO", type: "website" },
  twitter: { card: "summary_large_image", title: "TIAAGO Blog", description: "Insights on hiring, talent acquisition, and AI in recruitment." },
};

// import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";

import BlogCard from "./components/BlogCard";
// import Shape from "./assets/shape1.png";
// import Shape2 from "./assets/shape1.png";

type Props = {};

const Page = (props: Props) => {
  const LatestBlog = BlogsItems[0];
  const AllPost = BlogsItems.slice(1);

  const latestblogIntroText = LatestBlog.content.mainparagraph[0].slice(0, 250);
  console.log(latestblogIntroText);
  const id = LatestBlog.id;
  return (
    <main className='flex justify-center flex-col items-center mb-20'>
      <div className='w-[90%] mt-10 lg:mt-16'>
        {/* Introductory header */}
        <header className='flex justify-center text-center'>
          <h1 className='text-4xl pb-5 text-center md:text-6xl font-bold font-inter '>
            Feed Your Soul with Our Insights!
          </h1>
        </header>

        {/* Latest Articles */}
        <div className='my-5 lg:my-10'>
          <Link
            href={`/blogs/${id}`}
            className='md:hidden text-[#5465FF] mt-4 lg:text-xl font-medium font-inter'
          >
            Latest Artitcle
          </Link>

          {[LatestBlog].map(blog => {
            const { id } = blog;
            return (
              <div
                className='md:flex items-center mt-5 gap-3 md:mt-0'
                key={blog.id}
              >
                <Image
                  src={blog.image}
                  alt=''
                  className=' w-[100%] md:w-[350px] lg:w-[800px] h-[250px] rounded-lg'
                />

                <div className='flex flex-col'>
                  <Link
                    href={`/blogs/${id}`}
                    className='hidden md:block text-[#5465FF] mt-4 lg:text-xl font-medium font-inter'
                  >
                    Latest Artitcle
                  </Link>

                  <h1 className='mt-4 md:mt-2 text-base md:text-xl font-inter lg:text-3xl text-[#010809] font-bold'>
                    {LatestBlog.title}
                  </h1>
                  <h6 className='mt-4 md:mt-2 text-base md:text-base lg:text-xl text-[#353B3C] font-inter font-normal'>
                    {latestblogIntroText}.....
                  </h6>
                </div>
              </div>
            );
          })}
        </div>

        <div className='w-[100%] mt-5'>
          <h2 className='font-bold text-3xl text-[#010809] font-inter mb-10'>
            All Posts
          </h2>

          {/* Blogcard post */}
          <div className='grid gap-4 lg:gap-6 mt-5 md:grid-cols-2 lg:grid-cols-3'>
            {AllPost.map(blog => (
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

        {/* Input form for blogs writter */}
        {/* <div className='hidden md:flex flex-col items-center relative mb-10 mt-16'>
          <div className='w-[90%] bg-blogWriters  rounded-xl'>
            <Image src={Shape} alt='' className='absolute top-0 left-12' />
            <div className='flex flex-col items-center py-10 mb-5'>
              <div className='w-[70%]'>
                <h1 className='font-semibold md:text-5xl font-inter text-center px-12'>
                  Become one of our blog writers
                </h1>
                <h6 className='font-normal text-xl font-inter text-center text-[#555E5F] my-5'>
                  Use your creative voice to contribute compelling and
                  insightful content that enlightens the tech space and empowers
                  individuals.
                </h6>
                <form action=''>
                  <input
                    type='text'
                    placeholder='First name'
                    className='rounded-3xl w-full p-2 border-[1px] border-[#555E5F] outline-none'
                  />
                  <input
                    type='email'
                    placeholder='Email address'
                    className='rounded-3xl w-full p-2 my-5 border-[1px] border-[#555E5F] outline-none'
                  />
                  <button
                    type='submit'
                    className='px-4 py-2 border border-[#5465FF] text-white rounded-full w-[100%] text-xs text-center font-semibold bg-[#5465FF]'
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>

            <Image
              src={Shape2}
              alt=''
              className='absolute right-14 bottom-0 '
            />
          </div>
        </div>

        // Pagination
        <div className='mt-20 mb-10 md:mt-10'>
          <div className='flex justify-between items-center gap-4'>
            <p className='font-bold text-sm'>Page 1 of 30</p>

            <div className='w-[30%] md:w-[40%]'>
              <ul className='flex justify-between'>
                {[1, 2, 3, 4, 5, 6].map((nu, i) => (
                  <li
                    key={i}
                    className='text-[#C0C5C6] font-ubuntu font-normal text-sm'
                  >
                    {nu}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className=' bg-[#C0C5C6]
          flex items-center justify-between md:flex:1'
            >
              <FaChevronLeft className='me-4 text-white text-3xl p-2' />
              <FaChevronRight className='ms-4 text-white  text-3xl p-2' />
            </div>
          </div>
        </div> */}
      </div>
    </main>
  );
};

export default Page;
