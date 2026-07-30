const Loading = () => {
  return (
    <div className='p-8 max-md:px-1 flex flex-col gap-6 sm:gap-8 dashboard-content-constraint'>
      <div className='flex flex-col gap-2'>
        <div className='skeleton skeleton-neutral h-6 w-40' />
        <div className='skeleton skeleton-neutral h-4 w-72' />
      </div>
      <div className='skeleton skeleton-neutral h-10 w-full max-w-md' />
      <div className='flex flex-col gap-4'>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className='skeleton skeleton-neutral h-28 w-full' />
        ))}
      </div>
    </div>
  );
};

export default Loading;
