'use client';

import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import type { ShareCardType } from '@/types';

type ShareCardProps = {
  type: ShareCardType;
  title: string;
  subtitle: string;
  bullets: string[];
  cta?: string;
};

const typeLabel: Record<ShareCardType, string> = {
  'big-three': 'Big Three',
  'daily-reading': 'Daily Reading',
  'synastry-summary': 'Synastry Summary',
};

export default function ShareCard({ type, title, subtitle, bullets, cta = 'lumina astrology' }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState('');

  const exportCard = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    setIsExporting(true);
    setStatus('');

    try {
      const el = cardRef.current;
      const canvas = await html2canvas(el, {
        backgroundColor: '#080c1f',
        scale: 2,
        width: el.scrollWidth,
        height: el.scrollHeight,
      });

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), 'image/png', 1);
      });

      if (!blob) {
        setStatus('Unable to generate image.');
        return null;
      }

      return blob;
    } finally {
      setIsExporting(false);
    }
  };

  const share = async () => {
    const blob = await exportCard();
    if (!blob) return;

    const file = new File([blob], 'lumina-share-card.png', { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: 'Lumina',
        text: title,
        files: [file],
      });
      return;
    }

    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ]);
    setStatus('Image copied to clipboard.');
  };

  const download = async () => {
    const blob = await exportCard();
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'lumina-share-card.png';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  // Truncate subtitle to ~120 chars for the card so it fits
  const shortSubtitle = subtitle.length > 120 ? subtitle.slice(0, 117).replace(/\s+\S*$/, '') + '…' : subtitle;

  return (
    <div className="glass-card p-4 sm:p-5">
      <div
        ref={cardRef}
        className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-[32px] border border-white/20 bg-midnight p-6 sm:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(167,139,250,0.28),transparent_45%),radial-gradient(circle_at_90%_25%,rgba(196,181,253,0.2),transparent_40%),linear-gradient(180deg,#080c1f_0%,#111738_100%)]" />
        <div className="absolute left-[-30px] top-[240px] h-44 w-44 rounded-full bg-lumina-accent/15 blur-3xl" />
        <div className="absolute right-[-20px] top-[70px] h-32 w-32 rounded-full bg-lumina-soft/10 blur-2xl" />

        <div className="relative z-10 flex flex-col text-warmWhite">
          <p className="font-heading text-3xl text-lumina-soft">Lumina</p>
          <p className="mt-2 inline-flex w-fit rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cream">
            {typeLabel[type]}
          </p>

          <div className="mt-6">
            <h3 className="font-heading text-2xl sm:text-3xl leading-tight text-lumina-soft">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-cream">{shortSubtitle}</p>
          </div>

          <div className="mt-5 space-y-2">
            {bullets.slice(0, 6).map((bullet, idx) => (
              <div key={`${bullet}-${idx}`} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm leading-relaxed text-warmWhite">
                {bullet}
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-center text-xs uppercase tracking-[0.18em] text-cream">
            {cta}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={share} disabled={isExporting} className="lumina-button w-full sm:w-auto">
          {isExporting ? 'Rendering...' : 'Share'}
        </button>
        <button
          type="button"
          onClick={download}
          disabled={isExporting}
          className="min-h-12 rounded-full border border-white/15 px-5 text-sm text-cream hover:text-warmWhite"
        >
          Download
        </button>
      </div>
      {status ? <p className="mt-2 text-xs text-cream/70">{status}</p> : null}
    </div>
  );
}
