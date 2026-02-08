'use client';

import { useEffect, useState } from 'react';
import { translations, type Language } from '@/lib/translations';

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

  useEffect(() => {
    if (!isOpen || !planet || !sign || !Number.isFinite(house)) {
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
          body: JSON.stringify({ planet, sign, house, language }),
          signal: controller.signal,
        });

        const payload = (await response.json()) as { explanation?: string };
        setExplanation(payload.explanation || translations[language].explanationFallback);
      } catch {
        setExplanation(translations[language].explanationFallback);
      } finally {
        setLoading(false);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm animate-fadeInUp"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="glass-card relative w-full max-w-lg rounded-2xl border border-lumina-gold/30 p-6 sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 min-h-11 min-w-11 text-2xl leading-none text-cream transition hover:text-warmWhite"
          aria-label={translations[language].closeModal}
        >
          ×
        </button>

        <h2 className="pr-8 font-heading text-2xl text-lumina-champagne">{title}</h2>

        <div className="mt-5">
          {loading ? (
            <div className="space-y-3">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-11/12" />
              <div className="skeleton h-4 w-10/12" />
              <div className="skeleton h-4 w-9/12" />
              <div className="skeleton h-4 w-8/12" />
            </div>
          ) : (
            <p className="whitespace-pre-wrap leading-relaxed text-warmWhite">{explanation || translations[language].explanationFallback}</p>
          )}
        </div>
      </div>
    </div>
  );
}
