import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default' | 'accent';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '', ...props }) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-500';
      case 'warning':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500';
      case 'error':
        return 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500';
      case 'info':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-500';
      case 'accent':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-500';
      case 'default':
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <span 
      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5 w-fit ${getVariantClasses()} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
