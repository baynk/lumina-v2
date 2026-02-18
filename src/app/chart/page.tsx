'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MoonPhaseVisual from '@/components/MoonPhaseVisual';
import ExplainModal from '@/components/ExplainModal';
import BlurGate from '@/components/BlurGate';
import BirthDataForm, { type BirthDataFormResult } from '@/components/BirthDataForm';
import { useLanguage } from '@/context/LanguageContext';
import { calculateDailyCelestialData, calculateNatalChart } from '@/lib/astronomyCalculator';
import {
  formatAspectDescription,
  translateAspectType,
  translateMoonPhase,
  translatePlanet,
  translateSign,
  translateSignGenitive,
} from '@/lib/translations';
import { ZodiacImage } from '@/components/icons/ZodiacIcons';
import { getAspectIcon, getPlanetIcon } from '@/components/icons/PlanetIcons';
import { getHouseTheme, getPlanetWhyItMatters } from '@/lib/education';
import { loadProfile, saveProfile } from '@/lib/profile';
import type { BirthData, DailyCelestialData, NatalChartData } from '@/lib/types';

type StoredBirthPayload = {
  name?: string;
  locationName: string;
  birthData: BirthData;
};

type ChartTab = 'today' | 'summary' | 'planets' | 'houses';

type ExplainState = {
  title: string;
  planet: string;
  sign: string;
  house: number;
};

const STORAGE_KEY = 'lumina_birth_data';

/* ─── Daily Tip (rotates based on day + sign) ─── */
const DAILY_TIPS: Record<string, { en: string; ru: string }[]> = {
  fire: [
    { en: 'Channel your energy into one bold action today — scattered fire burns out fast.', ru: 'Направь энергию на одно смелое действие — разбросанный огонь быстро гаснет.' },
    { en: 'Your enthusiasm is magnetic today. Use it to inspire, not to overwhelm.', ru: 'Твой энтузиазм сегодня магнетичен. Используй его, чтобы вдохновлять, а не подавлять.' },
    { en: 'Impatience is your shadow today. The thing you want most needs one more day of patience.', ru: 'Нетерпение — твоя тень сегодня. То, чего ты хочешь больше всего, требует ещё дня терпения.' },
    { en: 'Trust your instincts over analysis today — your gut knows something your mind hasn\'t caught up to.', ru: 'Доверяй инстинктам больше, чем анализу — твоё чутьё знает то, до чего разум ещё не дошёл.' },
    { en: 'Movement unlocks answers today. Walk, stretch, dance — let your body think.', ru: 'Движение откроет ответы сегодня. Прогулка, растяжка, танец — позволь телу думать.' },
  ],
  earth: [
    { en: 'Small, consistent actions beat grand plans today. Build one brick at a time.', ru: 'Маленькие последовательные действия побеждают грандиозные планы. Кирпичик за кирпичиком.' },
    { en: 'Your body is asking for attention today. Listen to what it needs before pushing through.', ru: 'Твоё тело просит внимания сегодня. Послушай, что ему нужно, прежде чем напрягаться.' },
    { en: 'Something you\'ve been building quietly is about to show results. Keep going.', ru: 'То, что ты тихо строил, скоро покажет результат. Продолжай.' },
    { en: 'Ground yourself before making financial decisions today. Emotion and money don\'t mix well.', ru: 'Заземлись перед финансовыми решениями. Эмоции и деньги плохо сочетаются.' },
    { en: 'Nature recharges you faster than screens today. Even five minutes outside shifts everything.', ru: 'Природа заряжает тебя быстрее экранов сегодня. Даже пять минут на улице всё меняют.' },
  ],
  air: [
    { en: 'Your words carry extra weight today. Choose them with care — they\'ll be remembered.', ru: 'Твои слова имеют особый вес сегодня. Выбирай их аккуратно — их запомнят.' },
    { en: 'Too many open tabs in your mind? Pick three priorities and close the rest.', ru: 'Слишком много открытых вкладок в голове? Выбери три приоритета и закрой остальные.' },
    { en: 'A conversation today could change your perspective on something you thought was settled.', ru: 'Разговор сегодня может изменить твой взгляд на то, что казалось решённым.' },
    { en: 'Write down the idea that keeps circling your mind. It\'s more important than it seems.', ru: 'Запиши идею, которая крутится в голове. Она важнее, чем кажется.' },
    { en: 'Social energy is high but your alone-time battery is low. Protect your boundaries.', ru: 'Социальная энергия высока, но батарея одиночества разряжена. Защити свои границы.' },
  ],
  water: [
    { en: 'Pay attention to your emotions today — they\'re carrying information your logic can\'t access.', ru: 'Обрати внимание на эмоции сегодня — они несут информацию, недоступную логике.' },
    { en: 'Someone close to you needs to feel heard more than advised. Just listen.', ru: 'Кому-то близкому нужно быть услышанным, а не получить совет. Просто слушай.' },
    { en: 'Your intuition about a person or situation is correct. Trust it.', ru: 'Твоя интуиция насчёт человека или ситуации верна. Доверься ей.' },
    { en: 'Creative energy is unusually strong today. Make something — even if it\'s messy.', ru: 'Творческая энергия сегодня необычно сильна. Создай что-то — даже если выйдет неидеально.' },
    { en: 'Release what you\'ve been holding. Journaling, crying, or a long shower — pick your release valve.', ru: 'Отпусти то, что держишь. Дневник, слёзы или долгий душ — выбери свой клапан.' },
  ],
};

const SIGN_ELEMENTS: Record<string, string> = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
};

function DailyTip({ sunSign, moonSign, language }: { sunSign: string; moonSign: string; language: string }) {
  const t = language === 'ru' ? 'Совет дня' : 'Daily Tip';
  // Rotate based on day of year + combine sun and moon elements for variety
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const sunElement = SIGN_ELEMENTS[sunSign] || 'water';
  const moonElement = SIGN_ELEMENTS[moonSign] || 'water';
  // Alternate between sun and moon element tips
  const element = dayOfYear % 2 === 0 ? sunElement : moonElement;
  const tips = DAILY_TIPS[element] || DAILY_TIPS.water;
  const tip = tips[dayOfYear % tips.length];

  return (
    <section className="glass-card p-5 sm:p-6 animate-stagger-4">
      <p className="lumina-label mb-3">{t}</p>
      <p className="text-sm leading-relaxed text-cream">{language === 'ru' ? tip.ru : tip.en}</p>
    </section>
  );
}

export default function ChartPage() {
  const router = useRouter();
  const { language, t } = useLanguage();

  const [profile, setProfile] = useState<StoredBirthPayload | null>(null);
  const [natalChart, setNatalChart] = useState<NatalChartData | null>(null);
  const [dailyData, setDailyData] = useState<DailyCelestialData | null>(null);
  const [horoscope, setHoroscope] = useState('');
  const { data: authSession } = useSession();
  const [loadingChart, setLoadingChart] = useState(true);
  const [loadingHoroscope, setLoadingHoroscope] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<ChartTab>('today');
  const [isExplainOpen, setIsExplainOpen] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [teaserData, setTeaserData] = useState<{ natal: NatalChartData; daily: DailyCelestialData; name: string } | null>(null);
  const [explainState, setExplainState] = useState<ExplainState | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);

  const ZodiacSvg = ({ sign, size = 20 }: { sign: string; size?: number }) => {
    return <ZodiacImage sign={sign} size={size} className="inline-block align-middle" />;
  };

  const PlanetSvg = ({ planet, size = 16 }: { planet: string; size?: number }) => {
    const Icon = getPlanetIcon(planet);
    return Icon ? <Icon size={size} className="inline-block align-middle" /> : null;
  };

  const AspectSvg = ({ type, size = 16 }: { type: string; size?: number }) => {
    const Icon = getAspectIcon(type);
    return Icon ? <Icon size={size} className="inline-block align-middle" /> : null;
  };

  useEffect(() => {
    const init = async () => {
    try {
      // Try new profile format first
      const profileData = loadProfile();
      let birthData: BirthData | null = null;
      let profilePayload: StoredBirthPayload | null = null;

      if (profileData) {
        birthData = profileData.birthData;
        profilePayload = {
          name: profileData.name,
          locationName: profileData.locationName,
          birthData: profileData.birthData,
        };
      } else {
        // Fall back to old format
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) { setNeedsProfile(true); setLoadingChart(false); return; }
        const parsed = JSON.parse(raw) as StoredBirthPayload;
        if (!parsed?.birthData) { setNeedsProfile(true); setLoadingChart(false); return; }
        birthData = parsed.birthData;
        profilePayload = parsed;
      }

      // ALWAYS re-derive timezone from birth coordinates — this is the single source of truth.
      // Never trust the stored timezone (could be stale browser TZ from before the fix).
      if (birthData.latitude && birthData.longitude) {
        try {
          const tzResp = await fetch(`/api/timezone?lat=${birthData.latitude}&lon=${birthData.longitude}`);
          const tzData = await tzResp.json() as { timezone?: string };
          if (tzData.timezone) {
            birthData = { ...birthData, timezone: tzData.timezone };
            profilePayload = { ...profilePayload!, birthData };
            // Persist the corrected timezone
            if (profileData) {
              const { saveProfile: sp } = await import('@/lib/profile');
              sp({ ...profileData, birthData });
            }
          }
        } catch {
          // If API fails, proceed with existing timezone — best we can do
        }
      }

      setProfile(profilePayload);
      const natal = calculateNatalChart(birthData);
      const daily = calculateDailyCelestialData();
      setNatalChart(natal);
      setDailyData(daily);
    } catch {
      setError(t.chartError);
    } finally {
      setLoadingChart(false);
    }
    };
    init();
  }, [router, t.chartError]);

  useEffect(() => {
    if (!natalChart || !dailyData) return;

    const generateHoroscope = async () => {
      setLoadingHoroscope(true);
      try {
        const response = await fetch('/api/horoscope', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ natalChart, dailyData, language }),
        });
        const payload = (await response.json()) as { horoscope?: string };
        setHoroscope(payload.horoscope || t.horoscopeFallback);
      } catch {
        setHoroscope(t.horoscopeFallback);
      } finally {
        setLoadingHoroscope(false);
      }
    };

    generateHoroscope();
  }, [dailyData, language, natalChart, t.horoscopeFallback]);

  const moonSign = useMemo(() => natalChart?.planets.find((p) => p.planet === 'Moon')?.sign, [natalChart]);
  const dailyPlanetSigns = useMemo(
    () => Object.fromEntries(dailyData?.planets.map((planet) => [planet.planet, planet.sign]) ?? []),
    [dailyData]
  );

  const todayFormatted = useMemo(() => {
    const now = new Date();
    if (language === 'ru') {
      return now.toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    return now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }, [language]);

  // Redirect home if profile is cleared (e.g. sign-out)
  useEffect(() => {
    const handler = () => {
      const p = loadProfile();
      if (!p) router.push('/');
    };
    window.addEventListener('lumina-profile-changed', handler);
    return () => window.removeEventListener('lumina-profile-changed', handler);
  }, [router]);

  const openPlanetExplanation = (planet: string, sign: string, house?: number) => {
    const safeHouse = house && Number.isFinite(house) ? house : 1;
    setExplainState({ title: translatePlanet(planet, language), planet, sign, house: safeHouse });
    setIsExplainOpen(true);
  };

  const openHouseExplanation = (house: number, sign: string) => {
    setExplainState({ title: `${t.houseCusp} ${house}`, planet: `House ${house}`, sign, house });
    setIsExplainOpen(true);
  };

  const tabs: { key: ChartTab; label: string }[] = [
    { key: 'today', label: t.today },
    { key: 'summary', label: t.summary },
    { key: 'planets', label: t.planets },
    { key: 'houses', label: t.houses },
  ];

  if (loadingChart) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <p className="font-heading text-3xl text-lumina-soft">Lumina</p>
          <p className="mt-3 text-cream">{t.loadingChart}</p>
        </div>
      </div>
    );
  }

  if (needsProfile && !teaserData) {
    const handleTeaserSubmit = (data: BirthDataFormResult) => {
      saveProfile({
        birthData: data.birthData,
        name: data.name,
        locationName: data.locationName,
        timeAccuracy: data.timeAccuracy,
        savedAt: Date.now(),
      });

      // If already authenticated, skip teaser and load full chart
      if (authSession?.user) {
        setNeedsProfile(false);
        setLoadingChart(true);
        // Re-trigger the init effect by reloading
        window.location.reload();
        return;
      }

      const natal = calculateNatalChart(data.birthData);
      const daily = calculateDailyCelestialData();
      setTeaserData({ natal, daily, name: data.name });
    };

    return (
      <div className="mx-auto w-full max-w-xl px-4 pb-28 pt-6 sm:px-6">
        <header className="animate-fadeInUp text-center mb-6">
          <p className="font-heading text-3xl text-lumina-soft">✦</p>
          <h2 className="mt-3 font-heading text-2xl text-cream/90">
            {language === 'ru' ? 'Ваша карта ждёт' : 'Your chart awaits'}
          </h2>
          <p className="mt-2 text-sm text-cream/50">
            {language === 'ru'
              ? 'Введите данные рождения, чтобы увидеть вашу натальную карту'
              : 'Enter your birth details to see your natal chart'}
          </p>
        </header>
        <BirthDataForm
          onComplete={handleTeaserSubmit}
          submitLabel={language === 'ru' ? 'Показать мою карту' : 'Show my chart'}
        />
      </div>
    );
  }

  if (needsProfile && teaserData) {
    const sunPlanet = teaserData.natal.planets.find((p) => p.planet === 'Sun');
    const moonPlanet = teaserData.natal.planets.find((p) => p.planet === 'Moon');
    const risingSign = teaserData.natal.planets.find((p) => p.planet === 'Ascendant');
    const nameLabel = teaserData.name || (language === 'ru' ? 'друг' : 'friend');

    return (
      <div className="mx-auto w-full max-w-xl px-4 pb-28 pt-6 sm:px-6">
        {/* Teaser: visible key insights */}
        <header className="animate-fadeInUp text-center">
          {sunPlanet && <ZodiacImage sign={sunPlanet.sign} size={80} className="mx-auto opacity-90" />}
          <h1 className="mt-4 font-heading text-3xl text-lumina-soft">
            {language === 'ru' ? `${nameLabel}, вы — ${translateSign(sunPlanet?.sign || 'Aries', language)}` : `${nameLabel}, you are a ${sunPlanet?.sign || 'Aries'}`}
          </h1>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {moonPlanet && (
            <div className="glass-card p-4 text-center">
              <p className="lumina-label">{language === 'ru' ? 'Луна' : 'Moon'}</p>
              <ZodiacImage sign={moonPlanet.sign} size={32} className="mx-auto mt-2 opacity-80" />
              <p className="mt-2 text-sm font-medium text-cream">{translateSign(moonPlanet.sign, language)}</p>
              <p className="mt-1 text-[11px] text-cream/50">
                {language === 'ru' ? 'Ваши эмоции и интуиция' : 'Your emotions & intuition'}
              </p>
            </div>
          )}
          {risingSign && (
            <div className="glass-card p-4 text-center">
              <p className="lumina-label">{language === 'ru' ? 'Восходящий' : 'Rising'}</p>
              <ZodiacImage sign={risingSign.sign} size={32} className="mx-auto mt-2 opacity-80" />
              <p className="mt-2 text-sm font-medium text-cream">{translateSign(risingSign.sign, language)}</p>
              <p className="mt-1 text-[11px] text-cream/50">
                {language === 'ru' ? 'Как вас видят другие' : 'How others see you'}
              </p>
            </div>
          )}
        </div>

        {/* Blurred sections — gate */}
        <div className="mt-6">
          <BlurGate language={language}>
            <div className="space-y-4">
              <div className="glass-card p-5">
                <p className="lumina-label mb-3">{language === 'ru' ? 'Ваш ежедневный гороскоп' : 'Your daily horoscope'}</p>
                <p className="text-sm text-cream/80">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.</p>
              </div>
              <div className="glass-card p-5">
                <p className="lumina-label mb-3">{language === 'ru' ? 'Позиции планет' : 'Planetary positions'}</p>
                <div className="space-y-2">
                  {['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].map((p) => (
                    <div key={p} className="flex justify-between text-sm text-cream/70">
                      <span>{p}</span><span>Aquarius 15°42&apos;</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-card p-5">
                <p className="lumina-label mb-3">{language === 'ru' ? 'Аспекты сегодня' : 'Today&apos;s aspects'}</p>
                <div className="space-y-2">
                  {['Sun Conjunction Mars', 'Moon Trine Jupiter', 'Venus Square Saturn'].map((a) => (
                    <p key={a} className="text-sm text-cream/70">{a}</p>
                  ))}
                </div>
              </div>
            </div>
          </BlurGate>
        </div>
      </div>
    );
  }

  if (error || !natalChart || !dailyData) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="glass-card max-w-md p-6 text-center">
          <p className="text-cream">{error || t.noBirthData}</p>
          <button className="lumina-button mt-5 w-full" onClick={() => router.push('/')}>
            {t.backToHome}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-0 sm:px-6">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="min-h-11 rounded-full px-4 text-sm text-cream hover:text-warmWhite">
            ← {t.back}
          </button>
          <p className="font-heading text-xl text-lumina-soft">Lumina</p>
          <div className="w-16" />
        </header>

        {/* Tabs */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative min-h-11 rounded-full px-4 text-sm transition sm:px-5 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-lumina-accent-bright to-lumina-accent font-semibold text-white'
                    : 'text-cream hover:text-warmWhite'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div key={activeTab} className="transition-opacity duration-300 animate-fadeInUp">

          {/* TODAY TAB */}
          {activeTab === 'today' && (
            <>
              <section className="mb-6 text-center animate-stagger-1">
                <p className="text-sm text-cream/60 capitalize">{todayFormatted}</p>
                {profile?.name && <p className="mt-1 text-warmWhite">{profile.name}</p>}
              </section>

              {/* Today's Energy / Horoscope */}
              <section className="glass-card mb-6 p-5 sm:p-6 animate-stagger-1">
                <p className="lumina-label mb-3">{t.todaysEnergy}</p>
                {loadingHoroscope ? (
                  <div className="space-y-3">
                    <div className="skeleton h-4 w-full" />
                    <div className="skeleton h-4 w-11/12" />
                    <div className="skeleton h-4 w-10/12" />
                    <div className="skeleton h-4 w-9/12" />
                  </div>
                ) : (
                  <p className="leading-relaxed text-warmWhite">{horoscope || t.horoscopeFallback}</p>
                )}
              </section>

              {/* Moon Phase */}
              <section className="glass-card mb-6 p-5 sm:p-6 animate-stagger-2">
                <p className="lumina-label mb-3">{t.moonPhase}</p>
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-float">
                    <MoonPhaseVisual illumination={dailyData.moon.illumination} phase={dailyData.moon.phase} />
                  </div>
                  <p className="flex items-center gap-2 text-lg text-lumina-soft">
                    <span>{translateMoonPhase(dailyData.moon.phase, language)}</span>
                    <ZodiacSvg sign={dailyData.moon.sign} />
                  </p>
                  <p className="text-sm text-cream">{translateSign(dailyData.moon.sign, language)}</p>
                  <p className="text-sm text-cream">{t.illumination}: {dailyData.moon.illumination}%</p>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-lumina-accent" style={{ width: `${dailyData.moon.illumination}%` }} aria-hidden="true" />
                  </div>
                </div>
              </section>

              {/* Today's Aspects */}
              <section className="glass-card mb-6 p-5 sm:p-6 animate-stagger-3">
                <p className="lumina-label mb-3">{t.todaysAspects}</p>
                <div className="space-y-3">
                  {dailyData.aspects.map((aspect, idx) => (
                    <div key={`${aspect.aspect}-${idx}`} className="rounded-xl bg-white/5 p-3">
                      <p className="flex items-center gap-2 text-sm font-semibold text-lumina-soft">
                        <AspectSvg type={aspect.type} />
                        <span>{translateAspectType(aspect.type, language)}</span>
                      </p>
                      <p className="mt-1 text-sm text-warmWhite">{formatAspectDescription(aspect, language, dailyPlanetSigns)}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Consultation CTA after aspects */}
              <div className="mb-6 text-center animate-stagger-4">
                <a
                  href="/consultation"
                  className="text-sm text-cream/60 hover:text-lumina-accent transition"
                >
                  {t.ctaDecoded}
                </a>
              </div>

              {/* Daily Tip */}
              <DailyTip sunSign={natalChart.zodiacSign} moonSign={moonSign || ''} language={language} />
            </>
          )}

          {/* SUMMARY TAB */}
          {activeTab === 'summary' && (
            <>
              <section className="glass-card mb-6 p-5 sm:p-6 animate-stagger-1">
                <p className="mb-6 text-center text-sm text-cream/70">
                  {language === 'en'
                    ? `You are a ${translateSign(natalChart.zodiacSign, language)} with a ${translateSign(moonSign || '', language)} heart and a ${translateSign(natalChart.risingSign, language)} face to the world.`
                    : `Ты — ${translateSign(natalChart.zodiacSign, language)} с сердцем ${translateSignGenitive(moonSign || '')} и лицом ${translateSignGenitive(natalChart.risingSign)} для мира.`}
                </p>
                <p className="lumina-label mb-4 text-center">{t.bigThree}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white/5 p-4 text-center">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-cream mb-3">{t.sun}</p>
                    <div className="flex justify-center mb-2">
                      <ZodiacSvg sign={natalChart.zodiacSign} size={72} />
                    </div>
                    <p className="font-heading text-lg sm:text-xl text-lumina-soft">{translateSign(natalChart.zodiacSign, language)}</p>
                    <p className="mt-1 text-[10px] leading-tight text-cream/50">{getPlanetWhyItMatters('Sun', language)}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4 text-center">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-cream mb-3">{t.moon}</p>
                    <div className="flex justify-center mb-2">
                      <ZodiacSvg sign={moonSign || ''} size={72} />
                    </div>
                    <p className="font-heading text-lg sm:text-xl text-lumina-soft">{translateSign(moonSign || '', language)}</p>
                    <p className="mt-1 text-[10px] leading-tight text-cream/50">{getPlanetWhyItMatters('Moon', language)}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4 text-center">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-cream mb-3">{t.rising}</p>
                    <div className="flex justify-center mb-2">
                      <ZodiacSvg sign={natalChart.risingSign} size={72} />
                    </div>
                    <p className="font-heading text-lg sm:text-xl text-lumina-soft">{translateSign(natalChart.risingSign, language)}</p>
                    <p className="mt-1 text-[10px] leading-tight text-cream/50">{language === 'en' ? 'Your mask — how the world sees you' : 'Твоя маска — как тебя видит мир'}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-col items-center gap-3">
                  <button type="button" className="lumina-button w-full" onClick={() => setShowShareCard(true)}>
                    {t.shareYourChart}
                  </button>
                  <a
                    href="/consultation"
                    className="text-sm text-cream/50 hover:text-lumina-accent transition"
                  >
                    {t.ctaPersonalReading} →
                  </a>
                </div>
              </section>

              <section className="glass-card p-5 sm:p-6 animate-stagger-2">
                <p className="lumina-label mb-4">{t.currentTransits}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {dailyData.planets.map((planet) => (
                    <div key={`transit-${planet.planet}`} className="rounded-xl bg-white/5 p-3 text-center">
                      <p className="text-sm text-warmWhite">{translatePlanet(planet.planet, language)}</p>
                      <p className="mt-1 flex items-center justify-center gap-2 text-lumina-soft">
                        <ZodiacSvg sign={planet.sign} />
                        <span>{translateSign(planet.sign, language)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* PLANETS TAB */}
          {activeTab === 'planets' && (
            <section className="glass-card p-5 sm:p-6">
              <p className="lumina-label mb-4">{t.planetaryPositions}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {natalChart.planets.map((planet, idx) => (
                  <button
                    key={planet.planet}
                    type="button"
                    onClick={() => openPlanetExplanation(planet.planet, planet.sign, planet.house)}
                    className={`block rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-lumina-accent/40 ${
                      idx < 5 ? 'animate-stagger-2' : 'animate-stagger-3'
                    }`}
                  >
                    <p className="text-sm uppercase tracking-[0.13em] text-cream">
                      <span className="inline-flex items-center gap-1.5">
                        <PlanetSvg planet={planet.planet} />
                        <span>{translatePlanet(planet.planet, language)}</span>
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-cream/50">{getPlanetWhyItMatters(planet.planet, language)}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <ZodiacSvg sign={planet.sign} size={44} />
                      <span className="font-heading text-lg text-lumina-soft">{translateSign(planet.sign, language)}</span>
                    </div>
                    <p className="mt-1 text-sm text-cream">{Number.parseFloat(planet.degrees).toFixed(1)}° • {t.house} {planet.house}</p>
                    <p className="mt-2 text-xs text-cream/70">{t.tapToLearnMore}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* HOUSES TAB */}
          {activeTab === 'houses' && (
            <section className="glass-card p-5 sm:p-6">
              <p className="lumina-label mb-4">{t.houses}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {natalChart.houses.map((house, idx) => (
                  <button
                    key={house.house}
                    type="button"
                    onClick={() => openHouseExplanation(house.house, house.sign)}
                    className={`rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-lumina-accent/40 ${
                      idx < 6 ? 'animate-stagger-2' : 'animate-stagger-3'
                    }`}
                  >
                    <p className="text-sm uppercase tracking-[0.13em] text-cream">{t.house} {house.house}</p>
                    <p className="mt-0.5 text-xs text-cream/50">{getHouseTheme(house.house, language)}</p>
                    <p className="mt-1 flex items-center gap-2 text-lg text-lumina-soft">
                      <ZodiacSvg sign={house.sign} />
                      <span>{translateSign(house.sign, language)}</span>
                    </p>
                    <p className="mt-1 text-sm text-cream">{t.houseCusp}: {Number.parseFloat(house.degrees).toFixed(1)}°</p>
                    <p className="mt-2 text-xs text-cream/70">{t.tapToLearnMore}</p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Share Card Modal */}
      {showShareCard && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 px-4 py-6" onClick={() => setShowShareCard(false)}>
          <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl border-2 border-lumina-accent/40 bg-[#080c1f] p-8 text-center animate-slideUp sm:animate-fadeInUp" onClick={(event) => event.stopPropagation()}>
            <p className="font-heading text-3xl text-lumina-soft">Lumina</p>
            {profile?.name && <p className="mt-2 text-warmWhite">{profile.name}</p>}
            <div className="mt-6 space-y-4 text-left">
              <div className="rounded-xl bg-white/5 p-3">
                <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.13em] text-cream">
                  <PlanetSvg planet="Sun" />
                  <span>{t.sun}</span>
                </p>
                <p className="mt-1 flex items-center gap-2 text-lumina-soft">
                  <ZodiacSvg sign={natalChart.zodiacSign} size={32} />
                  <span className="font-heading text-lg">{translateSign(natalChart.zodiacSign, language)}</span>
                </p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.13em] text-cream">
                  <PlanetSvg planet="Moon" />
                  <span>{t.moon}</span>
                </p>
                <p className="mt-1 flex items-center gap-2 text-lumina-soft">
                  <ZodiacSvg sign={moonSign || ''} size={32} />
                  <span className="font-heading text-lg">{translateSign(moonSign || '', language)}</span>
                </p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-xs uppercase tracking-[0.13em] text-cream">↑ {t.rising}</p>
                <p className="mt-1 flex items-center gap-2 text-lumina-soft">
                  <ZodiacSvg sign={natalChart.risingSign} size={32} />
                  <span className="font-heading text-lg">{translateSign(natalChart.risingSign, language)}</span>
                </p>
              </div>
            </div>
            <p className="mt-6 text-xs tracking-[0.18em] text-cream/70">luminastrology.com</p>

            {/* Share buttons */}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                className="lumina-button flex-1 text-sm"
                onClick={async () => {
                  const shareText = `✨ My Lumina Chart ✨\n☉ ${t.sun}: ${translateSign(natalChart.zodiacSign, language)}\n☽ ${t.moon}: ${translateSign(moonSign || '', language)}\n↑ ${t.rising}: ${translateSign(natalChart.risingSign, language)}\n\nDiscover yours → luminastrology.com`;
                  if (navigator.share) {
                    try {
                      await navigator.share({ title: 'My Lumina Chart', text: shareText, url: 'https://luminastrology.com' });
                    } catch { /* user cancelled */ }
                  } else {
                    await navigator.clipboard.writeText(shareText);
                    alert(language === 'ru' ? 'Скопировано!' : 'Copied to clipboard!');
                  }
                }}
              >
                {language === 'ru' ? 'Поделиться' : 'Share'}
              </button>
              <button
                type="button"
                className="min-h-11 flex-1 rounded-full border border-lumina-accent/30 px-4 text-sm text-cream transition hover:border-lumina-accent/60"
                onClick={() => setShowShareCard(false)}
              >
                {t.closeModal}
              </button>
            </div>
          </div>
        </div>
      )}

      <ExplainModal
        isOpen={isExplainOpen}
        onClose={() => setIsExplainOpen(false)}
        title={explainState?.title || ''}
        planet={explainState?.planet}
        sign={explainState?.sign}
        house={explainState?.house}
        language={language}
      />
    </>
  );
}
