'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, MessageCircle, Moon, Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/context/LanguageContext';
import { loadProfile } from '@/lib/profile';

type Topic = 'love' | 'career' | 'money' | 'growth' | 'other';
type ConsultationType = 'written' | 'video-40' | 'video-60' | null;

const TOPICS: Topic[] = ['love', 'career', 'money', 'growth', 'other'];

const CALENDLY_LINKS = {
  'video-40': 'https://calendly.com/luminastrology/30min',
  'video-60': 'https://calendly.com/luminastrology/deep-dive-reading-60-min',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidBirthDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const match = DATE_RE.exec(trimmed);
  if (!match) return false;
  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isValidBirthTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return TIME_RE.test(trimmed);
}

function isConsultationType(value: string | null): value is Exclude<ConsultationType, null> {
  return value === 'written' || value === 'video-40' || value === 'video-60';
}

function ConsultationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const { language } = useLanguage();

  const [selectedType, setSelectedType] = useState<ConsultationType>(null);
  const [checkoutLoadingType, setCheckoutLoadingType] = useState<ConsultationType>(null);

  // Written reading form state
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [question, setQuestion] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [unsureBirthTime, setUnsureBirthTime] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const autoCheckoutKeyRef = useRef<string | null>(null);

  const typeParam = searchParams.get('type');
  const paidParam = searchParams.get('paid');
  const paid = paidParam === '1';
  const queryType = isConsultationType(typeParam) ? typeParam : null;

  const createCheckout = async (type: Exclude<ConsultationType, null>) => {
    setSubmitError('');
    setSelectedType(type);
    setCheckoutLoadingType(type);

    const checkoutType =
      type === 'written'
        ? 'consultation_written'
        : type === 'video-40'
          ? 'consultation_video_40'
          : 'consultation_video_60';

    try {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: checkoutType }),
      });

      const data = (await response.json()) as { error?: string; url?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error || (language === 'ru' ? 'Не удалось создать ссылку на оплату' : 'Failed to create checkout session'));
      }

      window.location.href = data.url;
    } catch (error) {
      setCheckoutLoadingType(null);
      setSubmitError(
        error instanceof Error
          ? error.message
          : language === 'ru'
            ? 'Не удалось создать ссылку на оплату'
            : 'Failed to create checkout session'
      );
    }
  };

  // Pre-fill from profile
  useEffect(() => {
    const profile = loadProfile();
    if (profile) {
      if (profile.name) setName(profile.name);
      if (profile.birthData) {
        const bd = profile.birthData;
        setBirthDate(`${String(bd.day).padStart(2, '0')}.${String(bd.month + 1).padStart(2, '0')}.${bd.year}`);
        setBirthTime(`${String(bd.hour).padStart(2, '0')}:${String(bd.minute).padStart(2, '0')}`);
      }
      if (profile.locationName) setBirthPlace(profile.locationName);
    }
  }, []);

  useEffect(() => {
    setSelectedType(queryType);
  }, [queryType]);

  useEffect(() => {
    if (!queryType || paid || sessionStatus !== 'authenticated') return;

    const autoCheckoutKey = `${queryType}:${paidParam ?? '0'}`;
    if (autoCheckoutKeyRef.current === autoCheckoutKey) return;

    autoCheckoutKeyRef.current = autoCheckoutKey;
    void createCheckout(queryType);
  }, [paid, paidParam, queryType, sessionStatus]);

  const toggleTopic = (topic: Topic) => {
    setTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const getTopicLabel = (topic: Topic): string => {
    const labels: Record<string, Record<Topic, string>> = {
      en: { love: 'Love & Relationships', career: 'Career & Purpose', money: 'Money & Abundance', growth: 'Personal Growth', other: 'Other' },
      ru: { love: 'Любовь и отношения', career: 'Карьера и предназначение', money: 'Деньги и изобилие', growth: 'Личностный рост', other: 'Другое' },
    };
    return (labels[language] || labels.en)[topic];
  };

  const handleTierSelection = async (type: Exclude<ConsultationType, null>) => {
    if (sessionStatus === 'loading') return;

    if (!session?.user?.email) {
      const callbackUrl = `/consultation?type=${type}`;
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    if (paid) {
      setSelectedType(type);
      return;
    }

    await createCheckout(type);
  };

  const handleSubmitWritten = async () => {
    if (!name.trim() || !question.trim() || !contactEmail.trim()) return;
    if (!EMAIL_RE.test(contactEmail.trim())) {
      setSubmitError(language === 'ru' ? 'Введите корректный email' : 'Please enter a valid email');
      return;
    }
    if (!isValidBirthDate(birthDate)) {
      setSubmitError(language === 'ru' ? 'Неверный формат даты рождения (ДД.ММ.ГГГГ)' : 'Invalid birth date format (DD.MM.YYYY)');
      return;
    }
    if (!unsureBirthTime && !isValidBirthTime(birthTime)) {
      setSubmitError(language === 'ru' ? 'Неверный формат времени (ЧЧ:ММ)' : 'Invalid birth time format (HH:MM)');
      return;
    }

    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          contact_email: contactEmail.trim(),
          contact_phone: contactPhone.trim() || undefined,
          contact_preference: 'email',
          topics,
          question: question.trim(),
          birthDate: birthDate.trim() || undefined,
          birthTime: unsureBirthTime ? undefined : birthTime.trim() || undefined,
          birthPlace: birthPlace.trim() || undefined,
          unsureBirthTime,
          preferredFormat: 'written',
        }),
      });
      if (res.ok) setSubmitted(true);
    } catch {
      // Handle silently
    } finally {
      setSubmitting(false);
    }
  };

  const isWrittenValid = name.trim() && question.trim() && contactEmail.trim();
  const showSelector = !selectedType;
  const showPaymentRedirectState = !!selectedType && !paid;
  const showVideoForm = paid && (selectedType === 'video-40' || selectedType === 'video-60');
  const showWrittenForm = paid && selectedType === 'written';
  const handleBack = () => {
    if (queryType) {
      router.push('/consultation');
      return;
    }

    if (selectedType) {
      setSelectedType(null);
      return;
    }

    router.back();
  };

  // Confirmation screen (written)
  if (submitted) {
    return (
      <div className="lumina-screen flex min-h-screen items-center justify-center px-4">
        <div className="aura aura-violet left-1/2 top-10 h-[380px] w-[380px] -translate-x-[62%]" />
        <div className="aura aura-indigo left-1/2 top-[24rem] h-[360px] w-[360px] -translate-x-[8%] [animation-delay:-5s]" />
        <div className="aura aura-blue left-1/2 bottom-12 h-[400px] w-[400px] -translate-x-[74%] [animation-delay:-2s]" />
        <div className="max-w-md text-center animate-fadeInUp">
          <div className="mb-6 flex justify-center text-[#C8A4A4] animate-float"><Sparkles size={40} strokeWidth={1.5} /></div>
          <h1 className="mb-4 font-heading text-3xl text-[#FDFBF7]">
            {language === 'ru' ? 'Спасибо!' : 'Thank you!'}
          </h1>
          <p className="mb-4 leading-relaxed text-[#C0BDD6]">
            {language === 'ru'
              ? 'Ваш запрос получен. Мы подготовим персональный разбор и отправим его на вашу почту в течение 48 часов.'
              : 'Your request has been received. We\'ll prepare your personalized reading and deliver it to your email within 48 hours.'}
          </p>
          <p className="mb-8 text-sm text-[#8D8B9F]">
            {language === 'ru' ? 'Проверьте папку "Спам", если не получите ответ.' : 'Check your spam folder if you don\'t hear from us.'}
          </p>
          <button type="button" onClick={() => router.push('/')} className="lumina-button px-8">
            <span className="inline-flex items-center gap-2">
              <ArrowLeft size={16} strokeWidth={1.5} />
              <span>{language === 'ru' ? 'На главную' : 'Back to Lumina'}</span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lumina-screen">
      <div className="aura aura-violet left-1/2 top-10 h-[380px] w-[380px] -translate-x-[62%]" />
      <div className="aura aura-indigo left-1/2 top-[24rem] h-[360px] w-[360px] -translate-x-[8%] [animation-delay:-5s]" />
      <div className="aura aura-blue left-1/2 bottom-12 h-[400px] w-[400px] -translate-x-[74%] [animation-delay:-2s]" />
      <div className="mx-auto max-w-2xl px-4 pb-10 pt-0 sm:px-6">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <button onClick={handleBack} className="min-h-11 rounded-full px-4 text-sm text-[#8D8B9F] transition hover:text-[#FDFBF7]">
          <span className="inline-flex items-center gap-2"><ArrowLeft size={16} strokeWidth={1.5} />{language === 'ru' ? 'Назад' : 'Back'}</span>
        </button>
        <p className="font-heading text-xl text-[#FDFBF7]">Lumina</p>
        <div className="w-20" />
      </header>

      {/* Title */}
      <section className="mb-8 text-center animate-fadeInUp">
        <h1 className="mb-2 font-heading text-2xl text-[#FDFBF7] sm:text-3xl">
          {language === 'ru' ? 'Персональная консультация' : 'Personal Consultation'}
        </h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-[#8D8B9F]">
          {language === 'ru'
            ? 'Выберите формат консультации, который подходит именно вам'
            : 'Choose the consultation format that\'s right for you'}
        </p>
      </section>

      {/* Type selector — show when no type chosen */}
      {showSelector && (
        <div className="grid gap-4 sm:grid-cols-3 animate-fadeInUp">
          {/* Written Reading */}
          <button
            type="button"
            onClick={() => void handleTierSelection('written')}
            disabled={checkoutLoadingType !== null || sessionStatus === 'loading'}
            className="glass-card group p-6 text-left transition hover:border-white/[0.16]"
          >
            <MessageCircle className="mb-3 text-[#8D8B9F]" size={28} strokeWidth={1.5} />
            <h3 className="font-heading text-lg text-lumina-soft mb-1">
              {language === 'ru' ? 'Письменный разбор' : 'Written Reading'}
            </h3>
            <p className="mb-4 text-xs leading-relaxed text-[#8D8B9F]">
              {language === 'ru'
                ? 'Детальная интерпретация натальной карты, доставка на email в течение 48 часов'
                : 'Detailed natal chart interpretation, delivered to your email within 48 hours'}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-2xl text-[#FDFBF7]">€25</span>
            </div>
            <span className="mt-5 flex w-full min-h-11 items-center justify-center rounded-full border border-white/10 px-4 text-xs uppercase tracking-[0.18em] text-[#FDFBF7] transition group-hover:border-white/20 whitespace-nowrap">
              {checkoutLoadingType === 'written'
                ? '...'
                : language === 'ru'
                  ? 'К оплате · €25'
                  : 'Continue to Payment · €25'}
            </span>
          </button>

          {/* Video 40 min */}
          <button
            type="button"
            onClick={() => void handleTierSelection('video-40')}
            disabled={checkoutLoadingType !== null || sessionStatus === 'loading'}
            className="glass-card group relative overflow-hidden p-6 text-left transition hover:border-white/[0.16]"
          >
            <div className="absolute top-3 right-3">
              <span className="badge px-2.5 py-0.5 text-[10px]">
                {language === 'ru' ? 'Популярный' : 'Popular'}
              </span>
            </div>
            <Moon className="mb-3 text-[#8D8B9F]" size={28} strokeWidth={1.5} />
            <h3 className="font-heading text-lg text-lumina-soft mb-1">
              {language === 'ru' ? 'Личная сессия' : 'Personal Session'}
            </h3>
            <p className="mb-4 text-xs leading-relaxed text-[#8D8B9F]">
              {language === 'ru'
                ? '40 минут видео-консультации — ответы на ваши главные вопросы'
                : '40 min video call — focused answers to your key questions'}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-2xl text-[#FDFBF7]">€35</span>
              <span className="text-xs text-[#8D8B9F]">/ 40 min</span>
            </div>
            <span className="mt-5 flex w-full min-h-11 items-center justify-center rounded-full border border-white/10 px-4 text-xs uppercase tracking-[0.18em] text-[#FDFBF7] transition group-hover:border-white/20 whitespace-nowrap">
              {checkoutLoadingType === 'video-40'
                ? '...'
                : language === 'ru'
                  ? 'Оплатить и продолжить · €35'
                  : 'Pay & Continue · €35'}
            </span>
          </button>

          {/* Video 60 min */}
          <button
            type="button"
            onClick={() => void handleTierSelection('video-60')}
            disabled={checkoutLoadingType !== null || sessionStatus === 'loading'}
            className="glass-card group p-6 text-left transition hover:border-white/[0.16]"
          >
            <Sparkles className="mb-3 text-[#C8A4A4]" size={28} strokeWidth={1.5} />
            <h3 className="font-heading text-lg text-lumina-soft mb-1">
              {language === 'ru' ? 'Глубокий разбор' : 'Deep Dive'}
            </h3>
            <p className="mb-4 text-xs leading-relaxed text-[#8D8B9F]">
              {language === 'ru'
                ? '60 минут видео — полный разбор карты, транзиты, прогноз'
                : '60 min video — full chart analysis, transits, and forecast'}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-2xl text-[#FDFBF7]">€55</span>
              <span className="text-xs text-[#8D8B9F]">/ 60 min</span>
            </div>
            <span className="mt-5 flex w-full min-h-11 items-center justify-center rounded-full border border-white/10 px-4 text-xs uppercase tracking-[0.18em] text-[#FDFBF7] transition group-hover:border-white/20 whitespace-nowrap">
              {checkoutLoadingType === 'video-60'
                ? '...'
                : language === 'ru'
                  ? 'Оплатить и продолжить · €55'
                  : 'Pay & Continue · €55'}
            </span>
          </button>
        </div>
      )}

      {showPaymentRedirectState && (
        <div className="animate-fadeInUp">
          <div className="glass-card p-6 sm:p-8 text-center">
            <div className="mb-4 flex justify-center">
              {selectedType === 'written'
                ? <MessageCircle className="text-[#8D8B9F]" size={30} strokeWidth={1.5} />
                : selectedType === 'video-40'
                  ? <Moon className="text-[#8D8B9F]" size={30} strokeWidth={1.5} />
                  : <Sparkles className="text-[#C8A4A4]" size={30} strokeWidth={1.5} />}
            </div>
            {submitError ? (
              <>
                <h2 className="font-heading text-xl text-[#C8A4A4] mb-2">
                  {language === 'ru' ? 'Ошибка оплаты' : 'Payment error'}
                </h2>
                <p className="mx-auto max-w-sm text-sm text-[#C8A4A4]/80 mb-4">{submitError}</p>
                <button
                  type="button"
                  onClick={() => { setSubmitError(''); void createCheckout(selectedType!); }}
                  className="lumina-button px-8"
                >
                  {language === 'ru' ? 'Попробовать снова' : 'Try again'}
                </button>
              </>
            ) : (
              <>
                <h2 className="font-heading text-xl text-lumina-soft mb-2">
                  {language === 'ru' ? 'Переход к оплате' : 'Redirecting to payment'}
                </h2>
                <p className="mx-auto max-w-sm text-sm text-cream/60">
                  {language === 'ru'
                    ? 'Мы готовим безопасную страницу Stripe Checkout для выбранной консультации.'
                    : 'Preparing a secure Stripe Checkout page for your selected consultation.'}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Video booking — redirect to Calendly */}
      {showVideoForm && (
        <div className="animate-fadeInUp">
          <div className="glass-card p-6 sm:p-8 text-center mb-6">
            <div className="mb-4 flex justify-center">
              {selectedType === 'video-40'
                ? <Moon className="text-[#8D8B9F]" size={30} strokeWidth={1.5} />
                : <Sparkles className="text-[#C8A4A4]" size={30} strokeWidth={1.5} />}
            </div>
            <h2 className="font-heading text-xl text-lumina-soft mb-2">
              {selectedType === 'video-40'
                ? (language === 'ru' ? 'Личная сессия · 40 мин' : 'Personal Session · 40 min')
                : (language === 'ru' ? 'Глубокий разбор · 60 мин' : 'Deep Dive · 60 min')}
            </h2>
            <p className="text-cream/60 text-sm mb-6 max-w-sm mx-auto">
              {language === 'ru'
                ? 'Выберите удобное время. После бронирования вы получите ссылку на Google Meet.'
                : 'Pick a time that works for you. You\'ll receive a Google Meet link after booking.'}
            </p>
            <a
              href={CALENDLY_LINKS[selectedType]}
              target="_blank"
              rel="noopener noreferrer"
              className="lumina-button inline-flex items-center gap-2 px-8"
            >
              <span>{language === 'ru' ? 'Выбрать время' : 'Choose a Time'}</span>
              <ArrowRight size={16} strokeWidth={1.5} />
            </a>
          </div>

          {/* Full intake form for the astrologer */}
          <div className="space-y-5">
            <div className="rounded-xl bg-lumina-accent/5 border border-lumina-accent/20 p-4 text-center">
              <p className="text-xs text-lumina-soft">
                {language === 'ru'
                  ? 'Заполните форму ниже, чтобы астролог подготовилась к вашей сессии'
                  : 'Fill out the form below so your astrologer can prepare for your session'}
              </p>
            </div>

            {/* Name */}
            <section className="glass-card p-5">
              <label className="lumina-label mb-2 block">{language === 'ru' ? 'Ваше имя' : 'Your name'} *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="lumina-input" placeholder={language === 'ru' ? 'Имя' : 'Name'} />
            </section>

            {/* Contact */}
            <section className="glass-card p-5">
              <label className="lumina-label mb-3 block">{language === 'ru' ? 'Контакт' : 'Contact'} *</label>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-cream/50">{language === 'ru' ? 'Email (тот же, что при бронировании)' : 'Email (same as your booking)'}</label>
                  <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="lumina-input" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-cream/50">{language === 'ru' ? 'Телефон / Telegram' : 'Phone / Telegram'} ({language === 'ru' ? 'необязательно' : 'optional'})</label>
                  <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="lumina-input" placeholder="+7 999 123 4567 / @username" />
                </div>
              </div>
            </section>

            {/* Topics */}
            <section className="glass-card p-5">
              <label className="lumina-label mb-3 block">{language === 'ru' ? 'Какие темы вас интересуют?' : 'What topics interest you?'}</label>
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

            {/* Question / goals */}
            <section className="glass-card p-5">
              <label className="lumina-label mb-2 block">{language === 'ru' ? 'Что вы хотите узнать?' : 'What do you hope to learn?'} *</label>
              <p className="text-xs text-cream/40 mb-3">
                {language === 'ru'
                  ? 'Расскажите о вашей ситуации и что вы хотите понять. Чем больше контекста — тем точнее разбор.'
                  : 'Tell us about your situation and what you want to understand. The more context, the better the reading.'}
              </p>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={4}
                className="lumina-input resize-none"
                placeholder={language === 'ru'
                  ? 'Например: Меня интересует карьерное направление. Сейчас работаю в X, но думаю о переходе в Y...'
                  : 'E.g.: I\'m curious about my career direction. Currently working in X but considering a move to Y...'}
              />
            </section>

            {/* Birth Data */}
            <section className="glass-card p-5">
              <label className="lumina-label mb-3 block">{language === 'ru' ? 'Данные рождения' : 'Birth details'} *</label>
              <p className="text-xs text-cream/40 mb-3">
                {language === 'ru'
                  ? 'Точные данные рождения необходимы для построения натальной карты.'
                  : 'Accurate birth details are essential for building your natal chart.'}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-cream/50">{language === 'ru' ? 'Дата рождения' : 'Date of birth'}</label>
                  <input type="text" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="lumina-input" placeholder="DD.MM.YYYY" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-cream/50">{language === 'ru' ? 'Время рождения' : 'Time of birth'}</label>
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
                  <input type="checkbox" checked={unsureBirthTime} onChange={(e) => setUnsureBirthTime(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-white/5 accent-lumina-accent" />
                  <span className="text-sm text-cream/70">{language === 'ru' ? 'Не знаю точное время' : 'I\'m not sure of the exact time'}</span>
                </label>
                <div>
                  <label className="mb-1 block text-xs text-cream/50">{language === 'ru' ? 'Место рождения' : 'Place of birth'}</label>
                  <input type="text" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} className="lumina-input" placeholder={language === 'ru' ? 'Город, страна' : 'City, country'} />
                </div>
              </div>
            </section>

            {/* Submit intake + open Calendly */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={async () => {
                  if (!name.trim() || !contactEmail.trim() || !question.trim()) return;
                  if (!EMAIL_RE.test(contactEmail.trim())) {
                    setSubmitError(language === 'ru' ? 'Введите корректный email' : 'Please enter a valid email');
                    return;
                  }
                  if (!isValidBirthDate(birthDate)) {
                    setSubmitError(language === 'ru' ? 'Неверный формат даты рождения (ДД.ММ.ГГГГ)' : 'Invalid birth date format (DD.MM.YYYY)');
                    return;
                  }
                  if (!unsureBirthTime && !isValidBirthTime(birthTime)) {
                    setSubmitError(language === 'ru' ? 'Неверный формат времени (ЧЧ:ММ)' : 'Invalid birth time format (HH:MM)');
                    return;
                  }

                  setSubmitError('');
                  setSubmitting(true);
                  try {
                    const response = await fetch('/api/consultation', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: name.trim(),
                        contact_email: contactEmail.trim(),
                        contact_phone: contactPhone.trim() || undefined,
                        contact_preference: 'email',
                        topics,
                        question: question.trim(),
                        birthDate: birthDate.trim() || undefined,
                        birthTime: unsureBirthTime ? undefined : birthTime.trim() || undefined,
                        birthPlace: birthPlace.trim() || undefined,
                        unsureBirthTime,
                        preferredFormat: selectedType === 'video-40' ? 'video-40min' : 'video-60min',
                      }),
                    });
                    if (!response.ok) {
                      throw new Error(language === 'ru' ? 'Не удалось отправить форму' : 'Failed to submit form');
                    }

                    window.open(CALENDLY_LINKS[selectedType!], '_blank');
                    setSubmitted(true);
                  } catch (error) {
                    setSubmitError(
                      error instanceof Error
                        ? error.message
                        : language === 'ru'
                          ? 'Не удалось отправить форму'
                          : 'Failed to submit form'
                    );
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={!name.trim() || !contactEmail.trim() || !question.trim() || submitting}
                className="lumina-button w-full"
              >
                {submitting
                  ? '...'
                  : (
                    <span className="inline-flex items-center gap-2">
                      <span>{language === 'ru' ? 'Отправить и выбрать время' : 'Submit & Choose a Time'}</span>
                      <ArrowRight size={16} strokeWidth={1.5} />
                    </span>
                  )}
              </button>
              {submitError && <p className="text-center text-xs text-red-300">{submitError}</p>}
              <p className="text-center text-[10px] text-cream/30">
                {language === 'ru'
                  ? 'После отправки откроется календарь для выбора времени сессии'
                  : 'After submitting, the calendar will open to pick your session time'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Written reading form */}
      {showWrittenForm && (
        <div className="space-y-5 animate-fadeInUp">
          <div className="glass-card p-5 text-center">
            <div className="mb-2 flex justify-center"><MessageCircle className="text-[#8D8B9F]" size={28} strokeWidth={1.5} /></div>
            <h2 className="font-heading text-lg text-lumina-soft mb-1">
              {language === 'ru' ? 'Письменный разбор · €25' : 'Written Reading · €25'}
            </h2>
            <p className="text-xs text-cream/50">
              {language === 'ru' ? 'Доставка на email в течение 48 часов' : 'Delivered to your email within 48 hours'}
            </p>
          </div>

          {/* Name */}
          <section className="glass-card p-5">
            <label className="lumina-label mb-2 block">{language === 'ru' ? 'Ваше имя' : 'Your name'}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="lumina-input" placeholder={language === 'ru' ? 'Имя' : 'Name'} />
          </section>

          {/* Contact */}
          <section className="glass-card p-5">
            <label className="lumina-label mb-3 block">{language === 'ru' ? 'Как с вами связаться' : 'How to reach you'}</label>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-cream/50">Email *</label>
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="lumina-input" placeholder="you@example.com" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-cream/50">{language === 'ru' ? 'Телефон' : 'Phone'} ({language === 'ru' ? 'необязательно' : 'optional'})</label>
                <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="lumina-input" placeholder="+1 (555) 000-0000" />
              </div>
            </div>
          </section>

          {/* Topics */}
          <section className="glass-card p-5">
            <label className="lumina-label mb-3 block">{language === 'ru' ? 'Темы' : 'Topics'}</label>
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
          <section className="glass-card p-5">
            <label className="lumina-label mb-2 block">{language === 'ru' ? 'Ваш вопрос' : 'Your question'}</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              className="lumina-input resize-none"
              placeholder={language === 'ru' ? 'Расскажите, что вас интересует...' : 'Tell us what you\'d like to know...'}
            />
          </section>

          {/* Birth Data */}
          <section className="glass-card p-5">
            <label className="lumina-label mb-3 block">{language === 'ru' ? 'Данные рождения' : 'Birth details'}</label>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-cream/50">{language === 'ru' ? 'Дата рождения' : 'Date of birth'}</label>
                <input type="text" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="lumina-input" placeholder="DD.MM.YYYY" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-cream/50">{language === 'ru' ? 'Время рождения' : 'Time of birth'}</label>
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
                <input type="checkbox" checked={unsureBirthTime} onChange={(e) => setUnsureBirthTime(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-white/5 accent-lumina-accent" />
                <span className="text-sm text-[#8D8B9F]">{language === 'ru' ? 'Не знаю точное время' : 'I\'m not sure of the exact time'}</span>
              </label>
              <div>
                <label className="mb-1 block text-xs text-[#8D8B9F]">{language === 'ru' ? 'Место рождения' : 'Place of birth'}</label>
                <input type="text" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} className="lumina-input" placeholder={language === 'ru' ? 'Город, страна' : 'City, country'} />
              </div>
            </div>
          </section>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmitWritten}
            disabled={!isWrittenValid || submitting}
            className="lumina-button w-full"
          >
            {submitting
              ? '...'
              : (language === 'ru' ? 'Отправить детали' : 'Submit Details')}
          </button>
          {submitError && <p className="text-center text-xs text-[#C8A4A4]">{submitError}</p>}
        </div>
      )}
    </div>
    </div>
  );
}

export default function ConsultationPage() {
  return (
    <Suspense
      fallback={
        <div className="lumina-screen flex min-h-screen items-center justify-center">
          <p className="font-heading text-3xl text-lumina-soft">Lumina</p>
        </div>
      }
    >
      <ConsultationPageContent />
    </Suspense>
  );
}
