import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  label: string;
  description?: string;
}

interface ProgressBarProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

function ProgressBar({ steps, currentStep, className }: ProgressBarProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors',
                  index < currentStep
                    ? 'bg-brand-primary border-brand-primary text-white'
                    : index === currentStep
                    ? 'border-brand-primary text-brand-primary bg-white'
                    : 'border-gray-300 text-gray-400 bg-white'
                )}
              >
                {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span className={cn(
                'text-xs mt-1 hidden sm:block text-center max-w-[80px]',
                index <= currentStep ? 'text-brand-primary font-medium' : 'text-gray-400'
              )}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 mx-2',
                index < currentStep ? 'bg-brand-primary' : 'bg-gray-200'
              )} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export { ProgressBar, type Step };
