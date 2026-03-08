'use client';

import { ArrowLeft } from 'lucide-react';
import LanguageToggle from '@/components/LanguageToggle';

type OnboardingHeaderProps = {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  showLanguageToggle?: boolean;
};

export default function OnboardingHeader({
  currentStep,
  totalSteps,
  onBack,
  showLanguageToggle = false,
}: OnboardingHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 px-5 pb-8 pt-5 sm:px-8">
      <div className="flex min-w-[40px] justify-start">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.06] bg-[#1A1822] text-[#F0EBE3]"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps }, (_, index) => {
          const step = index + 1;
          const active = step === currentStep;
          return (
            <span
              key={step}
              className="h-2 w-2 rounded-full transition-colors"
              style={{ backgroundColor: active ? '#C8A96E' : '#3A343E' }}
            />
          );
        })}
      </div>

      <div className="flex min-w-[40px] justify-end">
        {showLanguageToggle ? <LanguageToggle /> : null}
      </div>
    </header>
  );
}
