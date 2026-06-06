"use client";

import { Loader2 } from "lucide-react";

export interface CustomButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  fullWidth = false,
  icon,
  onClick,
  type = "button",
  disabled = false,
  className = "",
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-colors duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variantStyles = {
    primary:
      "bg-primary text-white hover:bg-primary-dark focus:ring-primary-light",
    secondary:
      "bg-secondary text-white hover:bg-secondary-dark focus:ring-secondary-light",
    outline:
      "border border-gray-300 bg-transparent hover:bg-gray-50 focus:ring-gray-500",
    ghost: "bg-transparent hover:bg-gray-100 focus:ring-gray-500",
  };

  const sizeStyles = {
    sm: "text-xs px-3 py-2",
    md: "text-sm px-4 py-2",
    lg: "text-base px-6 py-3",
  };

  const widthStyles = fullWidth ? "w-full" : "";
  const disabledStyles =
    disabled || isLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${disabledStyles} ${className}`}
    >
      {isLoading && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
      {!isLoading && icon && <span className='mr-2'>{icon}</span>}
      {children}
    </button>
  );
};

export default CustomButton;
