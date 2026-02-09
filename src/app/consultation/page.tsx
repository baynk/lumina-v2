'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { loadProfile } from '@/lib/profile';
import LanguageToggle from '@/components/LanguageToggle';

type Topic = 'love' | 'career' | 'money' | 'growth' | 'other';
type Format = 'written' | 'video' | 'either';

const TOPICS: Topic[] = ['love', 'career', 'money', 'growth', 'other'];

export default function ConsultationPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [question, setQuestion] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [unsureBirthTime, setUnsureBirthTime] = useState(false);
  const [preferredFormat, setPreferredFormat] = useState<Format | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill from profile
  useEffect(() => {
    const profile = loadProfile();
    if (profile) {
      if (profile.name) setName(profile.name);
      if (profile.birthData) {
        const bd = profile.birthData;
        const dateStr = `${String(bd.day).padStart(2, '0')}.${String(bd.month + 1).padStart(2, '0')}.${bd.year}`;
        setBirthDate(dateStr);
        const timeStr = `${String(bd.hour).padStart(2, '0')}:${String(bd.minute).padStart(2, '0')}`;
        setBirthTime(timeStr);
      }
      if (profile.locationName) setBirthPlace(profile.locationName);
    }
  }, []);

  const toggleTopic = (topic: Topic) => {
    setTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const getTopicLabel = (topic: Topic): string => {
    const map: Record<Topic, string> = {
      love: t.topicLove,
      career: t.topicCareer,
      money: t.topicMoney,
      growth: t.topicGrowth,
      other: t.topicOther,
    };
    return map[topic];
  };

  const getFormatLabel = (format: Format): string => {
    const map: Record<Format, string> = {
      written: t.formatWritten,
      video: t.formatVideo,
      either: t.formatEither,
    };
    return map[format];
  };

  const handleSubmit = async () => {
    if (!name.trim() || !contact.trim() || !question.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          topics,
          question: question.trim(),
          birthDate: birthDate.trim() || undefined,
          birthTime: unsureBirthTime ? undefined : birthTime.trim() || undefined,
          birthPlace: birthPlace.trim() || undefined,
          unsureBirthTime,
          preferredFormat: preferredFormat || undefined,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      }
    } catch {
      // Silently handle — could add error state later
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = name.trim() && contact.trim() && question.trim();

  // Confirmation screen
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center animate-fadeInUp">
          <div className="mb-6 text-6xl animate-float">✨</div>
          <h1 className="font-heading text-3xl text-lumina-soft mb-4">
            {t.consultationThankYou}
          </h1>
          <p className="text-cream leading-relaxed mb-8">
            {t.consultationConfirmation}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="lumina-button px-6"
            >
              {t.consultationBack}
            </button>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setName('');
                setContact('');
                setTopics([]);
                setQuestion('');
                setPreferredFormat('');
              }}
              className="min-h-[48px] rounded-full border border-lumina-accent/30 px-6 text-cream transition hover:border-lumina-accent/60"
            >
              {t.consultationNewRequest}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-10 pt-6 sm:px-6">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="min-h-11 rounded-full px-4 text-sm text-cream hover:text-warmWhite"
        >
          ← {t.back}
        </button>
        <p className="font-heading text-xl text-lumina-soft">Lumina</p>
        <LanguageToggle />
      </header>

      {/* Title */}
      <section className="mb-6 text-center animate-fadeInUp">
        <h1 className="font-heading text-2xl sm:text-3xl text-lumina-soft mb-2">
          {t.consultationTitle}
        </h1>
        <p className="text-sm text-cream/60 leading-relaxed max-w-sm mx-auto">
          {t.consultationSubtitle}
        </p>
      </section>

      {/* Form */}
      <div className="space-y-5">
        {/* Name */}
        <section className="glass-card p-5 animate-stagger-1">
          <label className="lumina-label mb-2 block">{t.consultationName}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="lumina-input"
            placeholder={t.name}
          />
        </section>

        {/* Contact */}
        <section className="glass-card p-5 animate-stagger-1">
          <label className="lumina-label mb-2 block">{t.consultationContact}</label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="lumina-input"
            placeholder={t.consultationContactPlaceholder}
          />
        </section>

        {/* Topics */}
        <section className="glass-card p-5 animate-stagger-2">
          <label className="lumina-label mb-3 block">{t.consultationTopics}</label>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => toggleTopic(topic)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  topics.includes(topic)
                    ? 'border-lumina-accent bg-lumina-accent/20 text-lumina-soft'
                    : 'border-white/15 text-cream hover:border-lumina-accent/40'
                }`}
              >
                {getTopicLabel(topic)}
              </button>
            ))}
          </div>
        </section>

        {/* Question */}
        <section className="glass-card p-5 animate-stagger-2">
          <label className="lumina-label mb-2 block">{t.consultationQuestion}</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            className="lumina-input resize-none"
            placeholder={t.consultationQuestionPlaceholder}
          />
        </section>

        {/* Birth Data */}
        <section className="glass-card p-5 animate-stagger-3">
          <label className="lumina-label mb-3 block">{t.consultationBirthData}</label>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-cream/50">{t.consultationBirthDate}</label>
              <input
                type="text"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="lumina-input"
                placeholder="DD.MM.YYYY"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-cream/50">{t.consultationBirthTime}</label>
              <input
                type="text"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className={`lumina-input ${unsureBirthTime ? 'opacity-40' : ''}`}
                placeholder="HH:MM"
                disabled={unsureBirthTime}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={unsureBirthTime}
                onChange={(e) => setUnsureBirthTime(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 accent-lumina-accent"
              />
              <span className="text-sm text-cream/70">{t.consultationUnsureTime}</span>
            </label>
            <div>
              <label className="mb-1 block text-xs text-cream/50">{t.consultationBirthPlace}</label>
              <input
                type="text"
                value={birthPlace}
                onChange={(e) => setBirthPlace(e.target.value)}
                className="lumina-input"
                placeholder={t.searchCityOrPlace}
              />
            </div>
          </div>
        </section>

        {/* Preferred Format */}
        <section className="glass-card p-5 animate-stagger-3">
          <label className="lumina-label mb-3 block">
            {t.consultationFormat} <span className="normal-case tracking-normal text-cream/40">({t.optional})</span>
          </label>
          <div className="flex flex-col gap-2">
            {(['written', 'video', 'either'] as Format[]).map((format) => (
              <label
                key={format}
                className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition ${
                  preferredFormat === format
                    ? 'border-lumina-accent bg-lumina-accent/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={format}
                  checked={preferredFormat === format}
                  onChange={() => setPreferredFormat(format)}
                  className="h-4 w-4 accent-lumina-accent"
                />
                <span className="text-sm text-cream">{getFormatLabel(format)}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Submit */}
        <div className="animate-stagger-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="lumina-button w-full"
          >
            {submitting ? '...' : t.consultationSubmit}
          </button>
        </div>
      </div>
    </div>
  );
}
