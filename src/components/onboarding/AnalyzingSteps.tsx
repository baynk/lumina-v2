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
            className="flex items-center justify-between rounded-2xl bg-[#1A1822] px-4 py-4 transition-opacity duration-300"
            style={{ opacity: completed || active ? 1 : 0.5 }}
          >
            <span className="text-sm text-[#F0EBE3]">{item}</span>
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full border"
              style={{
                borderColor: completed ? 'rgba(200,169,110,0.4)' : 'rgba(240,235,227,0.08)',
                backgroundColor: completed ? 'rgba(200,169,110,0.14)' : 'transparent',
              }}
            >
              {completed ? <Check size={14} color="#C8A96E" /> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
