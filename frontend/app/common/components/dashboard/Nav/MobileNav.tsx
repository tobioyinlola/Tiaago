import { HiOutlineMenuAlt1 } from "react-icons/hi";

const MobileNav = () => {
  return (
    <div className='lg:hidden'>
      <label
        htmlFor='mobile-drawer'
        id='mobile-drawer-open'
        aria-label='open sidebar'
        className='btn btn-primary drawer-button btn-square'
      >
        <HiOutlineMenuAlt1 className='text-2xl' />
      </label>
      <label
        id='mobile-drawer-close'
        htmlFor='mobile-drawer'
        aria-label='close sidebar'
        className='btn btn-primary drawer-button btn-square hidden'
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='25'
          height='25'
          viewBox='0 0 25 25'
          fill='none'
        >
          <path
            d='M9.95453 16.08C9.76453 16.08 9.57453 16.01 9.42453 15.86C9.13453 15.57 9.13453 15.09 9.42453 14.8L15.0845 9.13999C15.3745 8.84999 15.8545 8.84999 16.1445 9.13999C16.4345 9.42999 16.4345 9.90998 16.1445 10.2L10.4845 15.86C10.3445 16.01 10.1445 16.08 9.95453 16.08Z'
            fill='white'
          />
          <path
            d='M15.6145 16.08C15.4245 16.08 15.2345 16.01 15.0845 15.86L9.42453 10.2C9.13453 9.90998 9.13453 9.42999 9.42453 9.13999C9.71453 8.84999 10.1945 8.84999 10.4845 9.13999L16.1445 14.8C16.4345 15.09 16.4345 15.57 16.1445 15.86C15.9945 16.01 15.8045 16.08 15.6145 16.08Z'
            fill='white'
          />
          <path
            d='M15.7852 23.25H9.78516C4.35516 23.25 2.03516 20.93 2.03516 15.5V9.5C2.03516 4.07 4.35516 1.75 9.78516 1.75H15.7852C21.2152 1.75 23.5352 4.07 23.5352 9.5V15.5C23.5352 20.93 21.2152 23.25 15.7852 23.25ZM9.78516 3.25C5.17516 3.25 3.53516 4.89 3.53516 9.5V15.5C3.53516 20.11 5.17516 21.75 9.78516 21.75H15.7852C20.3952 21.75 22.0352 20.11 22.0352 15.5V9.5C22.0352 4.89 20.3952 3.25 15.7852 3.25H9.78516Z'
            fill='white'
          />
        </svg>
      </label>
    </div>
  );
};

export default MobileNav;
