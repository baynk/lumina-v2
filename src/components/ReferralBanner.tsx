'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

type ReferralCodeResponse = {
  code: string;
  referral_count: number;
};

export default function ReferralBanner() {
  const { language } = useLanguage();
  const [code, setCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const response = await fetch('/api/referral/code');
        if (!response.ok) {
          if (!cancelled) setLoading(false);
          return;
        }

        const payload = (await response.json()) as ReferralCodeResponse;
        if (!cancelled) {
          setCode(payload.code);
          setReferralCount(Number(payload.referral_count || 0));
        }
      } catch {
        // Silent fallback in UI.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  const copyLabel = language === 'ru' ? 'Скопировано' : 'Copied';
  const shareLabel = language === 'ru' ? 'Поделиться с друзьями' : 'Share with friends';
  const title = language === 'ru' ? 'Пригласи друга, открой Synastry бесплатно' : 'Invite a friend, unlock Synastry for free';
  const subtitle = language === 'ru' ? 'Поделись ссылкой и получай доступ за приглашения.' : 'Share your link and unlock rewards as friends join.';
  const joinedLabel = language === 'ru'
    ? `${referralCount} ${referralCount === 1 ? 'друг присоединился' : 'друзей присоединились'}`
    : `${referralCount} ${referralCount === 1 ? 'friend joined' : 'friends joined'}`;

  const referralLink = useMemo(() => {
    if (!code) return '';
    return `luminastrology.com/?ref=${code}`;
  }, [code]);

  const referralUrl = useMemo(() => {
    if (!code) return '';
    return `https://luminastrology.com/?ref=${encodeURIComponent(code)}`;
  }, [code]);

  const shareText = useMemo(() => {
    if (!code) return '';
    if (language === 'ru') {
      return `✦ Я использую Lumina для ежедневных астрологических прогнозов. Получи свою натальную карту бесплатно: ${referralLink}`;
    }

    return `✦ I use Lumina for my daily astrology readings. Get your free natal chart: ${referralLink}`;
  }, [code, language, referralLink]);

  const telegramLink = useMemo(() => {
    if (!code) return '#';
    return `https://t.me/share/url?text=${encodeURIComponent(shareText)}`;
  }, [code, shareText]);

  const whatsappLink = useMemo(() => {
    if (!code) return '#';
    return `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  }, [code, shareText]);

  const onShare = async () => {
    if (!code) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Lumina',
          text: shareText,
          url: referralUrl,
        });
        return;
      } catch {
        // Continue to clipboard fallback.
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // no-op
    }
  };

  if (loading) {
    return (
      <section className="glass-card mt-4 p-5 sm:p-6">
        <div className="skeleton h-4 w-40" />
        <div className="mt-3 skeleton h-10 w-full" />
      </section>
    );
  }

  if (!code) return null;

  return (
    <section className="glass-card mt-4 p-5 sm:p-6">
      <p className="lumina-section-title">Referral</p>
      <h3 className="mt-2 text-base font-medium text-warmWhite">{title}</h3>
      <p className="mt-1 text-sm text-cream/65">{subtitle}</p>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
        <p className="truncate text-xs text-cream/70">{referralLink}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onShare} className="lumina-button px-4 py-2 text-sm">
          {copied ? copyLabel : shareLabel}
        </button>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-2 text-xs text-cream/80 transition hover:border-lumina-accent/35 hover:text-warmWhite"
        >
          WhatsApp
        </a>

        <a
          href={telegramLink}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-2 text-xs text-cream/80 transition hover:border-lumina-accent/35 hover:text-warmWhite"
        >
          Telegram
        </a>
      </div>

      <p className="mt-3 text-xs text-cream/60">{joinedLabel}</p>
    </section>
  );
}
