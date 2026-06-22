const Loading = () => {
  return (
    <div className='flex flex-col gap-4 animate-pulse'>
      <div className='h-8 w-48 bg-gray-200 rounded' />
      <div className='h-4 w-full bg-gray-200 rounded' />
      <div className='h-4 w-3/4 bg-gray-200 rounded' />
      <div className='h-64 w-full bg-gray-200 rounded-xl' />
    </div>
  );
};

export default Loading;
