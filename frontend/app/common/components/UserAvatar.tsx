import Image from "next/image";

import { cn } from "../utils";

export type UserAvatarProps = {
  className?: string;
  containerClass?: string;
  profilePic?: string;
  firstName: string;
  lastName: string;
  forCurrentUser?: boolean;
  indicator?: JSX.Element;
};

const UserAvatar = ({
  profilePic,
  firstName = "",
  lastName = "",
  className,
  forCurrentUser,
  indicator,
  containerClass,
}: UserAvatarProps) => {
  const fullName = `${firstName[0] || ""} ${lastName[0] || ""}`
    .trim()
    .toUpperCase();
  return (
    <div
      className={cn(
        "avatar",
        !profilePic && "placeholder",
        indicator && "relative",
        containerClass
      )}
    >
      <div
        className={cn(
          "w-12 rounded-full bg-gray-400/80 text-white relative text-xl font-semibold",
          className
        )}
      >
        {profilePic ? (
          <Image
            alt={forCurrentUser ? "Your avatar" : fullName}
            src={profilePic}
            fill
            sizes='100vw'
            className='object-cover'
          />
        ) : (
          <span>{fullName}</span>
        )}
      </div>
      {indicator}
    </div>
  );
};

export type AvatarWithOnlineIndicatorProps = Omit<
  UserAvatarProps,
  "indicator" | "forCurrentUser"
> & {
  online: boolean;
  isActive?: boolean;
  indicatorClass?: string;
};

export const AvatarWithOnlineIndicator = ({
  online,
  isActive,
  indicatorClass,
  ...userAvatarProps
}: AvatarWithOnlineIndicatorProps) => {
  return (
    <UserAvatar
      {...userAvatarProps}
      indicator={
        <div
          className={cn(
            "absolute w-3 h-3 bg-[#12B76A] rounded-full right-[7%] bottom-0 border-2 border-white translate-y-[25%]",
            !online && "bg-gray-400",
            isActive && "border-gray-50",
            indicatorClass
          )}
        />
      }
    />
  );
};

export type AvatarWithVerifiedBadgeProps = Omit<
  UserAvatarProps,
  "indicator"
> & {
  verified: boolean;
  size?: number;
};

export const VerifiedBadgeIndicator = ({ size }: { size: number }) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width={size}
    height={size}
    viewBox={`0 0 24 24`}
    fill='none'
    className='absolute right-[7%] bottom-0 translate-y-[25%]'
  >
    <g clipPath='url(#clip0_1060_17057)'>
      <path
        d='M18.5327 4.2506C18.7606 4.80187 19.1982 5.24006 19.7491 5.46883L21.6809 6.26902C22.2322 6.49738 22.6703 6.9354 22.8986 7.48672C23.127 8.03803 23.127 8.65748 22.8986 9.20879L22.099 11.1392C21.8705 11.6908 21.8702 12.3109 22.0997 12.8622L22.898 14.792C23.0112 15.0651 23.0695 15.3578 23.0695 15.6534C23.0696 15.949 23.0114 16.2417 22.8982 16.5148C22.7851 16.7879 22.6193 17.036 22.4102 17.245C22.2012 17.454 21.953 17.6197 21.6799 17.7327L19.7494 18.5324C19.1982 18.7603 18.76 19.1978 18.5312 19.7488L17.731 21.6806C17.5027 22.2319 17.0646 22.6699 16.5133 22.8983C15.962 23.1266 15.3426 23.1266 14.7912 22.8983L12.8608 22.0987C12.3095 21.8709 11.6902 21.8713 11.1393 22.1L9.20743 22.899C8.65642 23.1268 8.03751 23.1266 7.48665 22.8985C6.93578 22.6703 6.49801 22.2328 6.26949 21.6821L5.46906 19.7497C5.24112 19.1984 4.80359 18.7602 4.25267 18.5314L2.32083 17.7312C1.76976 17.503 1.33187 17.0652 1.10343 16.5142C0.874983 15.9632 0.874673 15.3441 1.10257 14.7929L1.90218 12.8624C2.12998 12.3111 2.12952 11.6919 1.90089 11.1409L1.10242 9.20766C0.989214 8.9346 0.930922 8.64191 0.930875 8.34631C0.930827 8.05072 0.989026 7.75801 1.10215 7.48492C1.21526 7.21182 1.38109 6.96369 1.59014 6.75471C1.79919 6.54572 2.04737 6.37998 2.3205 6.26695L4.25095 5.46733C4.80174 5.23959 5.23967 4.80261 5.4686 4.25232L6.26879 2.32049C6.49716 1.76918 6.93517 1.33116 7.48649 1.1028C8.0378 0.874436 8.65725 0.874436 9.20856 1.1028L11.139 1.90241C11.6903 2.13021 12.3096 2.12975 12.8605 1.90112L14.7932 1.10404C15.3444 0.875804 15.9637 0.87585 16.515 1.10417C17.0662 1.33248 17.5041 1.77037 17.7325 2.32154L18.5329 4.25395L18.5327 4.2506Z'
        fill='#0788F5'
      />
      <path
        fillRule='evenodd'
        clipRule='evenodd'
        d='M16.6999 8.85413C16.8602 8.6023 16.9139 8.29711 16.8492 8.00567C16.7845 7.71424 16.6067 7.46045 16.3549 7.30013C16.1031 7.1398 15.7979 7.08608 15.5064 7.15078C15.215 7.21548 14.9612 7.3933 14.8009 7.64513L10.3954 14.5676L8.37939 12.0476C8.19301 11.8145 7.92166 11.665 7.62502 11.6319C7.32838 11.5989 7.03077 11.685 6.79764 11.8714C6.56452 12.0578 6.41498 12.3291 6.38193 12.6257C6.34887 12.9224 6.43501 13.22 6.62139 13.4531L9.62139 17.2031C9.7332 17.3431 9.8768 17.4543 10.0402 17.5275C10.2037 17.6008 10.3823 17.6339 10.5611 17.6242C10.74 17.6146 10.9139 17.5623 11.0685 17.4718C11.2231 17.3814 11.3538 17.2553 11.4499 17.1041L16.6999 8.85413Z'
        fill='white'
      />
    </g>
    <defs>
      <clipPath id='clip0_1060_17057'>
        <rect width='24' height='24' fill='white' />
      </clipPath>
    </defs>
  </svg>
);

export const AvatarWithVerifiedBadge = ({
  verified,
  size = 18,
  ...userAvatarProps
}: AvatarWithVerifiedBadgeProps) => {
  return (
    <UserAvatar
      {...userAvatarProps}
      indicator={!verified ? undefined : <VerifiedBadgeIndicator size={size} />}
    />
  );
};

export default UserAvatar;
