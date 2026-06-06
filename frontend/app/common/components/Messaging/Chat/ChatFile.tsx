import Image from "next/image";

const ChatFile = ({ attachment }: { attachment: string }) => {
  const name = attachment.split("/").pop();
  return (
    <div className='flex gap-4 items-center'>
      <div className='flex items-center justify-center bg-[#d5cbe3bc] rounded-full w-8 h-8'>
        <Image
          alt='File icon'
          src='/assets/icons/file-icons/file.svg'
          width={16}
          height={16}
          aria-hidden
        />
      </div>
      <div>
        <h6 className='font-medium text-sm text-gray-700'>{name}</h6>
        {/* <p className='text-sm text-gray-500'>{size}</p> */}
      </div>
    </div>
  );
};

export default ChatFile;
