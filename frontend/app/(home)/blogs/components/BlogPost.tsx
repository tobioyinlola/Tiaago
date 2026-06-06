import Image from "next/image";

import { BlogsItems } from "../constant/blogContent";

type Props = {
  id: number;
};

type blogType = {
  id: number;
  image: any;
  blogimg: any;
  title: string;
  content: {
    mainparagraph: string[];
    subtext: {
      num: number;
      subtext_title: string;
      subtext_body: string[];
    }[];
  };
};

type contentType = {
  mainparagraph: string[];
  subtext: {
    num: number;
    subtext_title: string;
    subtext_body: string[];
  }[];
};

const BlogPost = ({ id }: Props) => {
  const blogs: blogType[] = BlogsItems.filter(blog => blog.id == id);
  let blog = blogs[0];
  let blogContents: contentType = blog.content;

  return (
    <>
      {blogs.map(blog => (
        <article className='mt-7' key={blog.id}>
          <div className='w-full'>
            <Image
              src={blog.image}
              alt=''
              className='w-[100%] h-[300px] md:h-[500px] mb-6'
            />
          </div>
          {/* Blog Title */}
          <div className='text-center'>
            <h1 className='font-bold text-[#010809] text-xl md:text-3xl'>
              {blog.title}
            </h1>
          </div>

          <div className='text-justify mt-5'>
            {/* main text */}
            {blogContents.mainparagraph.map((text: string, i: number) => (
              <p
                key={i}
                className='text-[#353B3C] font-normal mt-3 mb-3 text-base md:text-xl font-urbanist'
              >
                <span className='me-14'></span>
                {text}
              </p>
            ))}

            <Image
              src={blog.blogimg}
              alt={blog.title}
              className='w-full md:w-[50%] object-contain md:float-left my-5 me-5 hover:scale-50 cursor-pointer'
            />

            {/* sub text */}
            {blogContents.subtext.map((sub: any, i: number) => (
              <>
                <h2
                  key={i}
                  className='font-bold text-[#010809] text-lg md:text-2xl mt-3 mb-2'
                >
                  {sub.subtext_title}
                </h2>
                <p className='text-[#353B3C] font-normal mt-2 text-base md:text-xl font-urbanist'>
                  <span className='me-14'></span>
                  {sub.subtext_body}
                </p>
              </>
            ))}
          </div>
        </article>
      ))}
    </>
  );
};

export default BlogPost;
