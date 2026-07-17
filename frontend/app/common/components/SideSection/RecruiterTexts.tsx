const Hire = () => (
  <span className='relative'>
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='96'
      height='63'
      viewBox='0 0 96 63'
      fill='none'
      className='absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2'
    >
      <path
        fillRule='evenodd'
        clipRule='evenodd'
        d='M52.0947 62.1268C56.2912 62.1268 60.6481 61.8478 65.1344 61.2847C82.3029 59.1344 92.6278 53.2016 94.9947 44.1313C95.9586 40.4338 95.5383 36.2952 93.7782 32.1616C89.4841 22.0772 77.8046 12.4469 62.5365 6.40003C45.2026 -0.464931 25.6085 -1.74311 7.36437 2.80053C7.0524 2.87854 6.83567 3.38461 6.88015 3.93068C6.92464 4.47776 7.20981 4.86381 7.52464 4.7808C47.9049 -5.27761 85.0411 14.9882 92.8639 33.3588C94.381 36.9203 94.7483 40.2648 93.9567 43.2992C92.7116 48.0739 87.2997 56.503 65.0534 59.2904C29.9539 63.688 8.57578 50.0141 2.96133 34.512C1.43509 30.2994 1.2195 26.2218 2.33794 22.7203C4.30277 16.5655 10.1785 13.011 18.0526 13.244H18.0617C18.3726 13.244 18.6269 12.8069 18.6321 12.2598C18.6372 11.7078 18.3857 11.2527 18.0708 11.2437C9.65088 11.0107 3.54821 14.8362 1.3427 21.7422C0.0257721 25.8658 0.258469 30.7814 1.99801 35.5841C5.01113 43.9043 11.9967 51.0983 21.6669 55.8379C30.1638 60.0035 40.5201 62.1268 52.0947 62.1268Z'
        fill='#F3C74A'
      />
    </svg>
    Hire
  </span>
);

const RecruiterTexts = () => {
  return (
    <div className='text-center'>
      <h1 className='font-space-grotesk text-4xl font-bold'>
        <Hire /> top tech & non tech talents in minutes
      </h1>
      <p className='text-sm mt-4'>
        We help companies build top-tier teams by hiring, developing and
        managing tech talent remotely.
      </p>
    </div>
  );
};

export default RecruiterTexts;
