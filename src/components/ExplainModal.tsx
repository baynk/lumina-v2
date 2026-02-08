'use client';

import { useEffect, useState } from 'react';
import { translations, type Language } from '@/lib/translations';
import { getPlanetWhyItMatters, getHouseTheme } from '@/lib/education';

type ExplainModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  planet?: string;
  sign?: string;
  house?: number;
  language: Language;
};

export default function ExplainModal({
  isOpen,
  onClose,
  title,
  planet,
  sign,
  house,
  language,
}: ExplainModalProps) {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState('');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !planet || !sign) {
      return;
    }

    const controller = new AbortController();

    const fetchExplanation = async () => {
      setLoading(true);
      setExplanation('');

      try {
        const response = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planet, sign, house: house ?? 1, language }),
          signal: controller.signal,
        });

        const payload = (await response.json()) as { explanation?: string };
        setExplanation(payload.explanation || translations[language].explanationFallback);
      } catch {
        if (!controller.signal.aborted) {
          setExplanation(translations[language].explanationFallback);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchExplanation();

    return () => controller.abort();
  }, [house, isOpen, language, planet, sign]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl border border-lumina-gold/30 bg-[#0d1229]/95 backdrop-blur-xl p-5 sm:p-7 overflow-hidden flex flex-col animate-slideUp sm:animate-fadeInUp"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="flex items-start justify-between mb-4 flex-shrink-0">
          <h2 className="pr-4 font-heading text-2xl text-lumina-champagne">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 flex items-center justify-center text-2xl leading-none text-cream/60 transition hover:text-warmWhite flex-shrink-0"
            aria-label={translations[language].closeModal}
          >
            ×
          </button>
        </div>

        {/* Why this matters context */}
        {planet && (
          <div className="mb-4 flex-shrink-0 rounded-xl border border-lumina-gold/20 bg-white/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lumina-champagne/80 mb-1.5">
              {language === 'en' ? 'Why this matters' : 'Почему это важно'}
            </p>
            {getPlanetWhyItMatters(planet, language) && (
              <p className="text-sm text-cream/70">{getPlanetWhyItMatters(planet, language)}</p>
            )}
            {house && getHouseTheme(house, language) && (
              <p className="mt-1 text-sm text-cream/50">
                {language === 'en' ? 'House' : 'Дом'} {house}: {getHouseTheme(house, language)}
              </p>
            )}
          </div>
        )}

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 -mr-2 pr-2 overscroll-contain">
          {loading ? (
            <div className="space-y-3 py-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-11/12" />
              <div className="skeleton h-4 w-10/12" />
              <div className="skeleton h-4 w-9/12" />
              <div className="skeleton h-4 w-8/12" />
              <div className="skeleton h-4 w-full mt-4" />
              <div className="skeleton h-4 w-10/12" />
            </div>
          ) : (
            <div className="whitespace-pre-wrap leading-relaxed text-warmWhite text-[15px] pb-4">
              {explanation || translations[language].explanationFallback}
            </div>
          )}
        </div>

        {/* Bottom safe area for mobile */}
        <div className="h-2 flex-shrink-0 sm:hidden" />
      </div>
    </div>
  );
}
