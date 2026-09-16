import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, icon, actions }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2.5 bg-accent/10 text-accent rounded-xl">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
};
