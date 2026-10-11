import { cn } from '@/lib/utils';
import { Check, Clock, Circle } from 'lucide-react';
import type { ReactNode } from 'react';

interface TimelineItem {
  title: string;
  description?: string;
  date?: string;
  status: 'completed' | 'current' | 'pending';
  icon?: ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

function Timeline({ items, className }: TimelineProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {items.map((item, index) => (
        <div key={index} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                {
                  'bg-brand-primary text-white': item.status === 'completed',
                  'bg-brand-primary/10 text-brand-primary border-2 border-brand-primary': item.status === 'current',
                  'bg-gray-100 text-gray-400': item.status === 'pending',
                }
              )}
            >
              {item.icon || (
                item.status === 'completed' ? <Check className="h-4 w-4" /> :
                item.status === 'current' ? <Clock className="h-4 w-4" /> :
                <Circle className="h-4 w-4" />
              )}
            </div>
            {index < items.length - 1 && (
              <div className={cn(
                'w-0.5 flex-1 min-h-[40px]',
                item.status === 'completed' ? 'bg-brand-primary' : 'bg-gray-200'
              )} />
            )}
          </div>
          <div className="pb-8">
            <p className={cn(
              'font-medium text-sm',
              item.status === 'pending' ? 'text-gray-400' : 'text-gray-900'
            )}>
              {item.title}
            </p>
            {item.description && (
              <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
            )}
            {item.date && (
              <p className="text-xs text-gray-400 mt-0.5">{item.date}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export { Timeline, type TimelineItem };
