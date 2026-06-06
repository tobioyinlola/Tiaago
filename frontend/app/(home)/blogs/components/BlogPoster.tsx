import Image from "next/image";
import assets from "../assets/assets";

type Props = {
  id: number;
};

const BlogPoster = ({ id }: Props) => {
  return (
    <>
      <div className='md:flex justify-between items-center my-7'>
        <div className='md:flex items-center'>
          <Image src={assets.profile} alt='shear' width={80} />
          <div className='ms-2 mt-3 md:mt-0'>
            <i className='text-xl md:text-3xl text-[#010809a8] font-medium'>
              Tiaago team
            </i>

            <h3 className='text-base md:text-xl text-[#555E5F] font-normal mt-2'>
              <span>Content writer</span> | <span>6 June 2024</span>
              {""}
            </h3>
          </div>
        </div>
        <button className='flex justify-center items-center mt-5 md:my-0  px-1 py-1 border border-[#5465FF] text-[#5465FF] rounded-3xl w-40 text-sm text-center font-semibold'>
          <Image src={assets.share} alt='shear' width={30} className='me-1' />
          <p>Share article</p>
        </button>
      </div>
    </>
  );
};

export default BlogPoster;
