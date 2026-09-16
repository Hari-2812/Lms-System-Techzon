import React from 'react';
import { 
  Cloud, 
  Brain, 
  Coffee, 
  Terminal, 
  Code, 
  Monitor, 
  Database, 
  BarChart, 
  BookOpen,
  Server,
  Cpu
} from 'lucide-react';

interface CourseDomainVisualProps {
  courseName: string;
  className?: string;
}

export const CourseDomainVisual: React.FC<CourseDomainVisualProps> = ({ courseName, className = '' }) => {
  const normalized = courseName ? courseName.toLowerCase() : '';

  let Icon = BookOpen;
  let label = 'Course';
  let gradient = 'from-slate-800 to-slate-900';
  let iconColor = 'text-slate-400';

  if (normalized.includes('aws') || normalized.includes('cloud')) {
    Icon = Cloud;
    label = 'Cloud / AWS';
    gradient = 'from-[#FF9900]/20 to-[#FF9900]/5 dark:from-[#FF9900]/30 dark:to-slate-900';
    iconColor = 'text-[#FF9900]';
  } else if (normalized.includes('ai') || normalized.includes('artificial intelligence') || normalized.includes('machine learning')) {
    Icon = Brain;
    label = 'AI / ML';
    gradient = 'from-purple-500/20 to-purple-500/5 dark:from-purple-500/30 dark:to-slate-900';
    iconColor = 'text-purple-500';
  } else if (normalized.includes('java') && !normalized.includes('javascript')) {
    Icon = Coffee;
    label = 'Java';
    gradient = 'from-red-500/20 to-red-500/5 dark:from-red-500/30 dark:to-slate-900';
    iconColor = 'text-red-500';
  } else if (normalized.includes('python')) {
    Icon = Terminal;
    label = 'Python';
    gradient = 'from-blue-500/20 to-yellow-500/5 dark:from-blue-500/30 dark:to-slate-900';
    iconColor = 'text-blue-500';
  } else if (normalized.includes('mern') || normalized.includes('full stack') || normalized.includes('web')) {
    Icon = Monitor;
    label = 'Web Dev';
    gradient = 'from-green-500/20 to-green-500/5 dark:from-green-500/30 dark:to-slate-900';
    iconColor = 'text-green-500';
  } else if (normalized.includes('data')) {
    Icon = BarChart;
    label = 'Data Science';
    gradient = 'from-teal-500/20 to-teal-500/5 dark:from-teal-500/30 dark:to-slate-900';
    iconColor = 'text-teal-500';
  } else if (normalized.includes('sql') || normalized.includes('database')) {
    Icon = Database;
    label = 'Database';
    gradient = 'from-blue-600/20 to-blue-600/5 dark:from-blue-600/30 dark:to-slate-900';
    iconColor = 'text-blue-600';
  } else {
    // Default fallback - Techzon accent colors (Orange)
    gradient = 'from-accent/20 to-accent/5 dark:from-accent/30 dark:to-slate-900';
    iconColor = 'text-accent';
    label = courseName && courseName.length < 15 ? courseName : 'Techzon Course';
  }

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${gradient} ${className}`}>
      <Icon className={`w-12 h-12 mb-2 ${iconColor} drop-shadow-md`} />
      <span className={`text-sm font-bold uppercase tracking-widest ${iconColor} opacity-90`}>
        {label}
      </span>
    </div>
  );
};
