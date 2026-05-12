import { cn } from '@/lib/utils'

const STEPS = [
  { n: 1, label: 'Praxis-URL' },
  { n: 2, label: 'Planung' },
  { n: 3, label: 'Kontext' },
]

interface WizardLayoutProps {
  currentStep: 1 | 2 | 3
  children: React.ReactNode
}

export function WizardLayout({ currentStep, children }: WizardLayoutProps) {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Step-Indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((step, idx) => (
          <div key={step.n} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition',
                  currentStep > step.n
                    ? 'bg-tiefblau text-white'
                    : currentStep === step.n
                    ? 'bg-cognac text-white'
                    : 'bg-stone text-stahlgrau'
                )}
              >
                {currentStep > step.n ? '✓' : step.n}
              </div>
              <span
                className={cn(
                  'text-xs whitespace-nowrap',
                  currentStep === step.n ? 'text-cognac font-semibold' : 'text-stahlgrau'
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={cn('flex-1 h-px mx-2 mb-4', currentStep > step.n ? 'bg-tiefblau' : 'bg-stone')} />
            )}
          </div>
        ))}
      </div>

      {/* Step-Content */}
      <div className="bg-white border border-stone rounded-xl p-6 animate-fade-in">
        {children}
      </div>
    </div>
  )
}
