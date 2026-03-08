'use client';

import { Check } from 'lucide-react';

type AnalyzingStepsProps = {
  items: string[];
  completedCount: number;
};

export default function AnalyzingSteps({ items, completedCount }: AnalyzingStepsProps) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const completed = index < completedCount;
        const active = index === completedCount;

        return (
          <div
            key={item}
            className="glass-card flex items-center justify-between rounded-[24px] px-4 py-4 transition-opacity duration-300"
            style={{ opacity: completed || active ? 1 : 0.5 }}
          >
            <span className="text-sm text-[#FDFBF7]">{item}</span>
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full border"
              style={{
                borderColor: completed ? 'rgba(200,164,164,0.38)' : 'rgba(253,251,247,0.08)',
                backgroundColor: completed ? 'rgba(200,164,164,0.14)' : 'transparent',
              }}
            >
              {completed ? <Check size={14} color="#C8A4A4" /> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
