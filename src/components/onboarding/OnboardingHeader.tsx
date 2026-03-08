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
    <header className="flex items-center justify-between gap-4 px-6 pb-8 pt-6">
      <div className="flex min-w-[40px] justify-start">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="profile-btn"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
        ) : null}
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <p className="font-body text-[11px] font-medium uppercase tracking-[2px] text-[#C8A4A4]">
          {currentStep} / {totalSteps}
        </p>
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }, (_, index) => {
            const step = index + 1;
            const active = step === currentStep;
            return (
              <span
                key={step}
                className="h-2 w-2 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: active ? '#C8A4A4' : 'rgba(192, 189, 214, 0.22)',
                  transform: active ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex min-w-[40px] justify-end">
        {showLanguageToggle ? <LanguageToggle /> : null}
      </div>
    </header>
  );
}
