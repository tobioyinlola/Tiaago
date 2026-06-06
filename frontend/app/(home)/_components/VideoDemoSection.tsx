const VideoDemoSection = () => {
  return (
    <section className='py-12 sm:py-16 lg:py-20 xl:py-32 bg-gradient-to-r from-primary to-secondary-2'>
      <div className='md:container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='max-w-3xl mx-auto text-center mb-12 sm:mb-16'>
          <h2 className='text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6'>
            Why We Built Tiaago
          </h2>
          <p className='text-lg sm:text-xl text-white/90 px-4 sm:px-0'>
            Hear from our founder how Tiaago is redefining hiring smarter,
            faster, and built for the future of work.
          </p>
        </div>

        <div className='max-w-4xl mx-auto'>
          <div className='relative rounded-xl sm:rounded-2xl overflow-hidden bg-white shadow-2xl mx-4 sm:mx-0'>
            <div className='aspect-video'>
              <iframe
                loading='lazy'
                className='w-full h-full object-cover'
                src='https://www.youtube.com/embed/WcUA0cD1ZDY'
                title='Why We Built Tiaago'
                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                referrerPolicy='strict-origin-when-cross-origin'
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoDemoSection;
