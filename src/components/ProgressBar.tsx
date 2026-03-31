import React from 'react';
import { cn } from '../lib/utils';

interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  colorClass: string;
  unit?: string;
}

export function ProgressBar({ label, value, max, colorClass, unit = '' }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100)) || 0;
  
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between text-xs font-medium text-gray-600">
        <span>{label}</span>
        <span>{Math.round(value)}{unit} / {max}{unit}</span>
      </div>
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500 ease-out", colorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
