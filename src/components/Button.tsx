import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantStyles = {
    primary: 'bg-[#E3A872] text-white hover:bg-[#D89860] focus:ring-[#E3A872] shadow-sm hover:shadow-md',
    secondary: 'bg-[#E8D5C4] text-[#D89860] hover:bg-[#E3A872] hover:text-white focus:ring-[#E3A872] shadow-sm hover:shadow-md',
    outline: 'border border-[#E3A872] bg-white text-[#E3A872] hover:bg-[#FDF8F3] focus:ring-[#E3A872] shadow-sm hover:shadow-md',
  };
  
  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm rounded-lg sm:rounded-xl',
    md: 'px-3 py-2 text-sm sm:px-4 sm:py-2.5 sm:text-base rounded-xl sm:rounded-2xl',
    lg: 'px-4 py-2.5 text-base sm:px-6 sm:py-3 sm:text-lg rounded-xl sm:rounded-2xl',
  };
  
  const widthStyle = fullWidth ? 'w-full' : '';
  
  const loadingStateStyles = isLoading ? 'opacity-70 cursor-not-allowed' : '';
  
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${widthStyle}
        ${loadingStateStyles}
        ${disabledStyles}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-3 w-3 sm:h-4 sm:w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xs sm:text-sm">Carregando...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
