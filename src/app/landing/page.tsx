'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useEffect, useRef } from 'react'; // useRef for StarCanvas

/* ─── Translations ────────────────────────────── */
const T = {
  en: {
    heroEyebrow: 'Astrology & Celestial Guidance',
    heroTitle1: 'Know yourself',
    heroTitle2: 'like the stars know you.',
    heroParagraph: 'Your natal chart is a snapshot of the exact sky the minute you were born. Lumina calculates it with the same precision used to navigate spacecraft — then helps you understand what it means for your life, today and always.',
    heroCta: 'Discover your chart',
    heroSub: 'Free · 60 seconds · No account needed',

    // Credibility
    cred1: 'JPL DE421',
    cred1b: 'Ephemeris',
    cred1d: 'The astronomical models trusted by space agencies',
    cred2: '10 Planets',
    cred2b: '12 Houses',
    cred2d: 'Your complete celestial blueprint, not just your Sun sign',
    cred3: 'Real',
    cred3b: 'Astrologer',
    cred3d: 'Human insight and years of experience reading charts',

    // Benefits
    ben1Tag: 'Self-knowledge',
    ben1Title: 'Finally understand why you are the way you are',
    ben1P: 'Your Sun sign is 1/12th of the story. Your full natal chart reveals your emotional patterns, how you love, how you communicate, what drives you, and the hidden strengths you haven\'t discovered yet.',

    ben2Tag: 'Daily guidance',
    ben2Title: 'Wake up knowing what the day holds for you',
    ben2P: 'Not a generic paragraph for all Tauruses. Your daily reading is based on today\'s planetary transits interacting with YOUR specific chart. Because your Monday is different from every other Taurus\'s Monday.',

    ben3Tag: 'The year ahead',
    ben3Title: 'See the themes and opportunities coming your way',
    ben3P: 'Solar return charts reveal the story of your personal year — from birthday to birthday. Know what energies are at play so you can move with them, not against them.',

    // How it works
    howTitle: 'Begin in 60 seconds',
    step1: 'Share your birth moment',
    step1d: 'Date, exact time, and place. The sky was unique that minute — so is your chart.',
    step2: 'Receive your natal chart',
    step2d: 'Full planetary positions, house placements, and aspects — calculated in real time from astronomical data.',
    step3: 'Go as deep as you want',
    step3d: 'Explore daily readings on your own, or book a personal session with our astrologer for the insights only a human can see.',

    // Precision
    precTitle: 'Why precision matters',
    precP: 'Your Ascendant sign changes roughly every two hours. Your Moon sign shifts every two and a half days. A chart calculated from "sometime in the morning" is a fundamentally different chart than one calculated from 9:47 AM. Lumina uses the JPL DE421 planetary ephemeris to calculate every planet, every house cusp, and every aspect with sub-degree precision. This isn\'t a lookup table — it\'s real-time astronomical calculation.',

    // Consultation
    consultTitle: 'When you\'re ready to go deeper',
    consultP: 'Technology calculates the chart. A human reads the story. Our astrologer brings years of experience working with clients across cultures and languages — seeing patterns that no algorithm can.',
    consultWritten: 'Written reading',
    consultWrittenPrice: '€25',
    consultWrittenD: 'Detailed natal chart analysis, delivered within 48 hours',
    consultVideo: 'Personal session',
    consultVideoPrice: '€35',
    consultVideoD: '40-minute live video consultation',
    consultDeep: 'Deep dive',
    consultDeepPrice: '€55',
    consultDeepD: '60-minute comprehensive chart analysis',
    consultCta: 'View all options',

    // Final
    finalTitle: 'The sky remembers the moment you arrived.',
    finalP: 'Your chart is waiting.',
    finalCta: 'Begin your reading',
  },
  ru: {
    heroEyebrow: 'Астрология и небесное руководство',
    heroTitle1: 'Познайте себя',
    heroTitle2: 'так, как звёзды знают вас.',
    heroParagraph: 'Натальная карта — это снимок неба в точную минуту вашего рождения. Lumina рассчитывает её с той же точностью, что используется для навигации космических аппаратов — и помогает понять, что это значит для вашей жизни.',
    heroCta: 'Узнайте свою карту',
    heroSub: 'Бесплатно · 60 секунд · Без регистрации',

    cred1: 'JPL DE421', cred1b: 'Эфемериды', cred1d: 'Астрономические модели, которым доверяют космические агентства',
    cred2: '10 планет', cred2b: '12 домов', cred2d: 'Полный небесный чертёж, а не только знак Солнца',
    cred3: 'Настоящий', cred3b: 'астролог', cred3d: 'Человеческий взгляд и многолетний опыт',

    ben1Tag: 'Самопознание',
    ben1Title: 'Наконец поймите, почему вы — это вы',
    ben1P: 'Знак Солнца — это 1/12 истории. Полная натальная карта раскрывает ваши эмоциональные паттерны, стиль любви, способ общения и скрытые сильные стороны.',

    ben2Tag: 'Ежедневное руководство',
    ben2Title: 'Просыпайтесь, зная, что несёт день',
    ben2P: 'Не общий абзац для всех Тельцов. Ваше чтение основано на сегодняшних транзитах планет к ВАШЕЙ конкретной карте.',

    ben3Tag: 'Год вперёд',
    ben3Title: 'Увидьте темы и возможности, которые вас ждут',
    ben3P: 'Карта соляра раскрывает историю вашего личного года — от дня рождения до дня рождения.',

    howTitle: 'Начните за 60 секунд',
    step1: 'Укажите момент рождения', step1d: 'Дата, точное время и место. Небо было уникальным в ту минуту.',
    step2: 'Получите натальную карту', step2d: 'Полные позиции планет, дома и аспекты — в реальном времени.',
    step3: 'Погружайтесь так глубоко, как хотите', step3d: 'Исследуйте ежедневные чтения или запишитесь на сессию с астрологом.',

    precTitle: 'Почему точность важна',
    precP: 'Ваш Асцендент меняется примерно каждые два часа. Луна меняет знак каждые 2,5 дня. Карта «где-то утром» — это совершенно другая карта, чем карта в 9:47. Lumina использует эфемериды JPL DE421 для расчёта каждой планеты с точностью до долей градуса.',

    consultTitle: 'Когда вы готовы к глубине',
    consultP: 'Технология рассчитывает карту. Человек читает историю. Наш астролог имеет многолетний опыт работы с клиентами разных культур.',
    consultWritten: 'Письменное чтение', consultWrittenPrice: '€25', consultWrittenD: 'Детальный анализ натальной карты за 48 часов',
    consultVideo: 'Личная сессия', consultVideoPrice: '€35', consultVideoD: '40-минутная видеоконсультация',
    consultDeep: 'Глубокий анализ', consultDeepPrice: '€55', consultDeepD: '60-минутный комплексный разбор',
    consultCta: 'Все варианты',

    finalTitle: 'Небо помнит момент, когда вы появились.',
    finalP: 'Ваша карта ждёт.',
    finalCta: 'Начать чтение',
  },
};

/* ─── Animated star canvas ────────────────────── */
function StarCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    const stars: { x: number; y: number; r: number; a: number; speed: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = document.documentElement.scrollHeight || window.innerHeight * 6;
    };

    const init = () => {
      resize();
      stars.length = 0;
      const count = Math.floor((canvas.width * canvas.height) / 4000);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.5 + 0.3,
          a: Math.random(),
          speed: Math.random() * 0.005 + 0.002,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.a += s.speed;
        const alpha = 0.3 + Math.sin(s.a) * 0.4;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 215, 235, ${Math.max(0, alpha)})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    init();
    draw();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={ref} className="pointer-events-none absolute inset-x-0 top-0 z-0 opacity-60" />;
}

/* ─── Zodiac wheel SVG (hero illustration) ────── */
function ZodiacWheel() {
  const signs = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
  return (
    <div className="relative w-56 h-56 sm:w-72 sm:h-72 lg:w-96 lg:h-96 mx-auto">
      {/* Glow */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(196,181,253,0.08)_0%,transparent_70%)]" />

      <svg viewBox="0 0 400 400" className="w-full h-full animate-[spin_300s_linear_infinite]">
        {/* Outer ring */}
        <circle cx="200" cy="200" r="185" fill="none" stroke="rgba(168,139,250,0.15)" strokeWidth="0.5" />
        <circle cx="200" cy="200" r="160" fill="none" stroke="rgba(168,139,250,0.1)" strokeWidth="0.5" />
        <circle cx="200" cy="200" r="130" fill="none" stroke="rgba(196,181,253,0.06)" strokeWidth="0.5" />

        {/* Sign divisions */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i * 30 - 90) * Math.PI / 180;
          const x1 = 200 + 160 * Math.cos(angle);
          const y1 = 200 + 160 * Math.sin(angle);
          const x2 = 200 + 185 * Math.cos(angle);
          const y2 = 200 + 185 * Math.sin(angle);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(168,139,250,0.12)" strokeWidth="0.5" />;
        })}

        {/* Zodiac symbols */}
        {signs.map((s, i) => {
          const angle = ((i * 30) + 15 - 90) * Math.PI / 180;
          const x = 200 + 172 * Math.cos(angle);
          const y = 200 + 172 * Math.sin(angle);
          return <text key={s} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="rgba(168,139,250,0.4)" fontSize="16" className="font-heading">{s}</text>;
        })}

        {/* Inner decorative elements */}
        <circle cx="200" cy="200" r="60" fill="none" stroke="rgba(196,181,253,0.04)" strokeWidth="0.5" />

        {/* Aspect lines (decorative) */}
        {[[0,120],[30,150],[60,240],[90,270],[0,180]].map(([a,b], i) => {
          const r = 125;
          const x1 = 200 + r * Math.cos((a-90)*Math.PI/180);
          const y1 = 200 + r * Math.sin((a-90)*Math.PI/180);
          const x2 = 200 + r * Math.cos((b-90)*Math.PI/180);
          const y2 = 200 + r * Math.sin((b-90)*Math.PI/180);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i%2===0 ? "rgba(100,149,237,0.08)" : "rgba(220,80,80,0.06)"} strokeWidth="0.5" />;
        })}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="font-heading text-3xl sm:text-4xl text-[rgba(168,139,250,0.5)] tracking-[0.15em]">✦</p>
      </div>
    </div>
  );
}

/* ─── Decorative Divider ──────────────────────── */
function CelestialDivider() {
  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#A78BFA]/15" />
      <svg width="20" height="20" viewBox="0 0 20 20" className="text-[#A78BFA]/20">
        <circle cx="10" cy="10" r="3" fill="currentColor" />
        <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="0.5" />
      </svg>
      <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#A78BFA]/15" />
    </div>
  );
}

/* ─── Main Page ───────────────────────────────── */
export default function LandingPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const goToApp = () => router.push('/');
  const goToConsultation = () => router.push('/consultation');

  return (
    <div className="relative overflow-hidden -mx-[calc((100vw-100%)/2)] px-[calc((100vw-100%)/2)]" style={{ background: '#080C1F', isolation: 'isolate' }}>
      {/* Opaque background to cover parent layout gradients */}
      <div className="fixed inset-0 z-[-2]" style={{ background: '#080C1F' }} />
      {/* Full-page starfield background */}
      <div className="fixed inset-0 z-[-1] opacity-25" style={{
        backgroundImage: 'url(/images/brand/deep-space.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }} />
      <StarCanvas />

      {/* ═══ HERO ═══ */}
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 sm:px-8 lg:px-12 text-center">

        <div className="relative z-10 w-full max-w-3xl lg:max-w-4xl">
          {/* Zodiac wheel */}
          <ZodiacWheel />

          {/* Eyebrow */}
          <p className="mt-6 text-[11px] sm:text-[12px] lg:text-[13px] xl:text-[14px] tracking-[0.35em] uppercase text-[#A78BFA]/50 font-medium">
            {t.heroEyebrow}
          </p>

          {/* Title */}
          <h1 className="mt-4 font-heading text-4xl sm:text-5xl lg:text-7xl xl:text-8xl leading-[1.08] text-cream">
            {t.heroTitle1}<br />
            <span className="bg-gradient-to-r from-[#A78BFA] via-[#C4B5FD] to-[#A78BFA] bg-clip-text text-transparent">
              {t.heroTitle2}
            </span>
          </h1>

          {/* Paragraph */}
          <p className="mx-auto mt-6 lg:mt-8 max-w-md lg:max-w-xl xl:max-w-2xl text-[15px] lg:text-[18px] xl:text-[20px] leading-[1.75] text-cream/50">
            {t.heroParagraph}
          </p>

          {/* CTA */}
          <button
            onClick={goToApp}
            className="mt-10 lg:mt-12 rounded-full bg-gradient-to-r from-[#A78BFA]/90 to-[#8B5CF6]/90 px-10 sm:px-14 lg:px-16 py-4 sm:py-5 lg:py-6 text-[15px] sm:text-[16px] lg:text-[18px] font-medium text-[#080C1F] shadow-[0_0_30px_rgba(168,139,250,0.15)] transition hover:shadow-[0_0_40px_rgba(168,139,250,0.25)] hover:from-[#A78BFA] hover:to-[#8B5CF6]"
          >
            {t.heroCta}
          </button>
          <p className="mt-3 text-[11px] lg:text-[13px] text-cream/25 tracking-wider">{t.heroSub}</p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 z-10 animate-bounce opacity-30">
          <svg width="18" height="28" viewBox="0 0 18 28" fill="none">
            <rect x="1" y="1" width="16" height="26" rx="8" stroke="rgba(168,139,250,0.4)" strokeWidth="1" />
            <circle cx="9" cy="8" r="1.5" fill="rgba(168,139,250,0.5)" className="animate-pulse" />
          </svg>
        </div>
      </section>

      {/* ═══ CREDIBILITY ═══ */}
      <section className="relative z-10">
        <div className="mx-auto max-w-5xl lg:max-w-6xl px-6 py-14 lg:py-24 xl:py-28 grid grid-cols-1 sm:grid-cols-3 gap-10 lg:gap-16 xl:gap-20 text-center">
          {[
            { a: t.cred1, b: t.cred1b, d: t.cred1d },
            { a: t.cred2, b: t.cred2b, d: t.cred2d },
            { a: t.cred3, b: t.cred3b, d: t.cred3d },
          ].map((item) => (
            <div key={item.a}>
              <p className="text-[13px] lg:text-[17px] xl:text-[19px] font-heading">
                <span className="text-[#A78BFA]/70">{item.a}</span>
                <span className="text-cream/30"> · </span>
                <span className="text-cream/50">{item.b}</span>
              </p>
              <p className="mt-2 text-[12px] lg:text-[15px] xl:text-[16px] leading-relaxed text-cream/30">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ BENEFITS (compact grid on desktop) ═══ */}
      <section className="relative z-10 py-16 sm:py-20 lg:py-24 px-6 lg:px-12">
        <div className="mx-auto max-w-5xl lg:max-w-6xl">
          <div className="grid gap-8 sm:gap-6 lg:grid-cols-3 lg:gap-10">
            {[
              { tag: t.ben1Tag, title: t.ben1Title, p: t.ben1P },
              { tag: t.ben2Tag, title: t.ben2Title, p: t.ben2P },
              { tag: t.ben3Tag, title: t.ben3Title, p: t.ben3P },
            ].map((ben, i) => (
              <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 lg:p-8">
                <p className="text-[10px] lg:text-[11px] tracking-[0.3em] uppercase text-[#A78BFA]/40 font-medium">{ben.tag}</p>
                <h2 className="mt-3 font-heading text-xl sm:text-2xl lg:text-2xl xl:text-3xl text-cream/90 leading-snug">
                  {ben.title}
                </h2>
                <p className="mt-3 text-[13px] lg:text-[15px] xl:text-[16px] leading-[1.8] text-cream/40">
                  {ben.p}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ DIVIDER ═══ */}
      <div className="relative z-10 py-4 lg:py-6">
        <CelestialDivider />
      </div>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="relative z-10 py-16 sm:py-20 lg:py-24 px-6 lg:px-12">
        <div className="mx-auto max-w-2xl lg:max-w-5xl text-center">
          <h2 className="font-heading text-3xl lg:text-4xl xl:text-5xl text-cream/80">{t.howTitle}</h2>

          <div className="mt-12 lg:mt-16 grid gap-8 lg:grid-cols-3 lg:gap-10 text-left">
            {[
              { n: '01', title: t.step1, desc: t.step1d },
              { n: '02', title: t.step2, desc: t.step2d },
              { n: '03', title: t.step3, desc: t.step3d },
            ].map((step) => (
              <div key={step.n} className="flex gap-5 lg:flex-col lg:text-center lg:items-center">
                <div className="flex-shrink-0 w-12 h-12 lg:w-14 lg:h-14 rounded-full border border-[#A78BFA]/20 flex items-center justify-center">
                  <span className="text-[13px] lg:text-[15px] font-heading text-[#A78BFA]/50">{step.n}</span>
                </div>
                <div>
                  <h3 className="text-[15px] lg:text-[18px] xl:text-[20px] font-semibold text-cream/80">{step.title}</h3>
                  <p className="mt-1.5 text-[13px] lg:text-[15px] xl:text-[16px] leading-relaxed text-cream/35">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRECISION + CTA combined ═══ */}
      <section className="relative z-10 py-16 sm:py-20 lg:py-24 px-6 lg:px-12">
        <div className="mx-auto max-w-2xl lg:max-w-3xl text-center">
          <p className="text-[10px] lg:text-[12px] tracking-[0.3em] uppercase text-[#A78BFA]/30">✦</p>
          <h2 className="mt-4 font-heading text-2xl lg:text-3xl xl:text-4xl text-cream/70">{t.precTitle}</h2>
          <p className="mt-5 text-[14px] lg:text-[17px] xl:text-[18px] leading-[1.9] text-cream/35">{t.precP}</p>
          <button
            onClick={goToApp}
            className="mt-10 rounded-full bg-gradient-to-r from-[#A78BFA] to-[#8B5CF6] px-10 sm:px-16 lg:px-18 py-4 sm:py-5 lg:py-5 text-[15px] sm:text-[16px] lg:text-[17px] font-medium text-[#080C1F] shadow-[0_0_30px_rgba(168,139,250,0.15)] transition hover:shadow-[0_0_40px_rgba(168,139,250,0.25)]"
          >
            {t.heroCta}
          </button>
          <p className="mt-3 text-[11px] lg:text-[12px] text-cream/25 tracking-wider">{t.heroSub}</p>
        </div>
      </section>

      {/* ═══ PRACTITIONER PROFILE ═══ */}
      <section className="relative z-10 py-16 sm:py-20 lg:py-24 px-6 lg:px-12">
        <div className="mx-auto max-w-3xl lg:max-w-4xl">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 lg:p-10 lg:flex lg:gap-10 lg:items-start">
            {/* Avatar placeholder */}
            <div className="mx-auto mb-6 lg:mb-0 lg:mx-0 flex-shrink-0 w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-[#A78BFA]/20 to-[#8B5CF6]/10 flex items-center justify-center">
              <span className="font-heading text-3xl lg:text-4xl text-[#A78BFA]/40">IR</span>
            </div>
            <div className="text-center lg:text-left">
              <p className="text-[10px] lg:text-[11px] tracking-[0.3em] uppercase text-[#A78BFA]/40 font-medium">
                {language === 'ru' ? 'Ваш астролог' : 'Your Astrologer'}
              </p>
              <h3 className="mt-2 font-heading text-2xl lg:text-3xl text-cream/90">Iryna Rudas</h3>
              <p className="mt-1 text-[12px] lg:text-[14px] text-cream/30">
                {language === 'ru' ? 'Милан, Италия' : 'Milan, Italy'}
              </p>
              <p className="mt-4 text-[14px] lg:text-[16px] xl:text-[17px] leading-[1.85] text-cream/45">
                {language === 'ru'
                  ? 'Ирина помогла сотням девушек по всему миру разобраться в себе, отношениях и важных жизненных решениях через призму классической астрологии. Она работает приватно с предпринимательницами, творческими людьми и всеми, кто хочет понять себя глубже.'
                  : 'Iryna has guided hundreds of women around the world through relationships, self-discovery, and major life decisions using classical astrology and modern psychological insight. She works privately with entrepreneurs, creatives, and anyone ready to understand themselves at a deeper level.'}
              </p>
              <p className="mt-4 text-[13px] lg:text-[15px] italic text-cream/25">
                {language === 'ru'
                  ? '«Астрология — не предсказание будущего. Это язык, который помогает вам увидеть то, что вы уже чувствуете, но не можете сформулировать.»'
                  : '"Astrology isn\'t about predicting the future. It\'s a language that helps you see what you already feel but can\'t quite articulate."'}
              </p>
              <button
                onClick={goToConsultation}
                className="mt-6 text-[13px] lg:text-[14px] text-[#A78BFA]/60 hover:text-[#A78BFA]/90 transition tracking-wider font-medium"
              >
                {language === 'ru' ? 'Записаться на консультацию →' : 'Book a consultation →'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="relative z-10 py-20 lg:py-28 px-6 text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] lg:w-[500px] lg:h-[500px] rounded-full bg-[#A78BFA]/[0.02] blur-[80px] lg:blur-[100px] pointer-events-none" />
        <div className="relative">
          <p className="font-heading text-xl sm:text-2xl lg:text-3xl xl:text-4xl text-cream/40 italic max-w-lg lg:max-w-2xl mx-auto leading-relaxed">
            {t.finalTitle}
          </p>
          <p className="mt-3 text-[14px] lg:text-[16px] xl:text-[18px] text-cream/25">{t.finalP}</p>
          <button
            onClick={goToApp}
            className="mt-8 rounded-full bg-gradient-to-r from-[#A78BFA] to-[#8B5CF6] px-10 sm:px-14 lg:px-16 py-4 sm:py-5 text-[15px] sm:text-[16px] lg:text-[17px] font-medium text-[#080C1F] shadow-[0_0_30px_rgba(168,139,250,0.15)] transition hover:shadow-[0_0_40px_rgba(168,139,250,0.25)]"
          >
            {t.finalCta}
          </button>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="relative z-10 py-10 lg:py-14 text-center">
        <p className="font-heading text-lg lg:text-xl tracking-[0.15em] text-[#A78BFA]/15">LUMINA</p>
        <p className="mt-2 text-[10px] lg:text-[12px] text-cream/10 tracking-wider">JPL DE421 · Equal House System</p>
      </footer>
    </div>
  );
}
