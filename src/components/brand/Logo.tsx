import React from 'react';

interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  variant?: 'default' | 'light' | 'dark';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({
  variant = 'default',
  className = '',
  size = 'md',
  alt = 'IDEAPAD Innovation & Incubation Centre',
  ...props
}: LogoProps) {
  const sizeClasses = {
    sm: 'h-7 w-auto',
    md: 'h-9 w-auto',
    lg: 'h-12 w-auto',
    xl: 'h-16 w-auto',
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;

  return (
    <img
      src="/brand/logo.png"
      alt={alt}
      className={`object-contain transition-opacity duration-200 ${selectedSize} ${
        variant === 'dark' ? 'brightness-0 invert' : ''
      } ${className}`}
      loading="eager"
      decoding="async"
      {...props}
    />
  );
}

export default Logo;
