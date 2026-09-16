import React from 'react';
import { Card } from './Card';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 w-full h-full min-h-[300px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
      <p className="text-slate-500 font-medium">{message}</p>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="w-full">
      <div className="flex border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mr-4 animate-pulse"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mr-4 animate-pulse"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mr-4 animate-pulse"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 animate-pulse"></div>
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex py-4 border-b border-slate-50 dark:border-slate-800/50">
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/4 mr-4 animate-pulse"></div>
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/4 mr-4 animate-pulse"></div>
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/4 mr-4 animate-pulse"></div>
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/4 animate-pulse"></div>
        </div>
      ))}
    </div>
  );
};
