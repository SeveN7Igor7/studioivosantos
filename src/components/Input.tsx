import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = false, className = '', ...props }, ref) => {
    const inputClasses = `
      block rounded-2xl border-2 shadow-sm px-4 py-3 w-full
      transition-all duration-200 ease-in-out
      bg-white/50 backdrop-blur-sm
      focus:ring-2 focus:ring-offset-0 focus:outline-none
      ${error 
        ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' 
        : 'border-[#E8D5C4] text-gray-900 placeholder-gray-400 focus:border-[#E3A872] focus:ring-[#E3A872]/20'
      }
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `;

    const labelClasses = `
      block text-sm font-medium mb-2
      transition-colors duration-200
      ${error ? 'text-red-900' : 'text-gray-700'}
    `;

    const errorClasses = `
      mt-2 text-sm font-medium text-red-600
      animate-fade-in
    `;

    return (
      <div className={`${fullWidth ? 'w-full' : ''} group`}>
        {label && (
          <label htmlFor={props.id} className={labelClasses}>
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={inputClasses}
            {...props}
          />
          <div className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity opacity-0 group-hover:opacity-100 bg-[#E3A872]/5"></div>
        </div>
        {error && (
          <p className={errorClasses} id={`${props.id}-error`}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';