const Loading = () => {
  return (
    <div className='flex flex-col gap-4'>
      <div className='skeleton skeleton-neutral h-4 w-28' />
      <div className='skeleton skeleton-neutral h-4 w-full' />
      <div className='skeleton skeleton-neutral h-4 w-full' />
      <div className='skeleton skeleton-neutral h-32 w-full' />
    </div>
  );
};

export default Loading;
