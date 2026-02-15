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
  'synastry-summary': 'Compatibility',
};

export default function ShareCard({ type, title, subtitle, bullets, cta = 'luminastrology.com' }: ShareCardProps) {
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
        backgroundColor: '#0c0f2b',
        scale: 2,
        width: el.scrollWidth,
        height: el.scrollHeight,
        useCORS: true,
      });

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), 'image/png', 1);
      });

      if (!blob) {
        setStatus('Unable to generate image.');
        return null;
      }

      return blob;
    } catch {
      setStatus('Unable to generate image.');
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  const share = async () => {
    const blob = await exportCard();
    if (!blob) {
      // Fallback: share as text
      const text = `${title}\n${bullets.join(' · ')}\n${cta}`;
      if (navigator.share) {
        await navigator.share({ title: 'Lumina', text });
      } else {
        await navigator.clipboard.writeText(text);
        setStatus('Copied to clipboard.');
        setTimeout(() => setStatus(''), 2000);
      }
      return;
    }

    const file = new File([blob], 'lumina-share-card.png', { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: 'Lumina', text: title, files: [file] });
      return;
    }

    try {
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setStatus('Image copied to clipboard.');
    } catch {
      // Final fallback: download
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'lumina-share-card.png';
      anchor.click();
      URL.revokeObjectURL(url);
    }
    setTimeout(() => setStatus(''), 2000);
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

  // Parse bullets into label/value pairs for bar chart
  const parsedBullets = bullets.map((b) => {
    const match = b.match(/^(.+?):\s*(\d+)%$/);
    return match ? { label: match[1], value: parseInt(match[2]) } : { label: b, value: 0 };
  });

  // Truncate subtitle
  const shortSub = subtitle.length > 100 ? subtitle.slice(0, 97).replace(/\s+\S*$/, '') + '…' : subtitle;

  return (
    <div className="glass-card p-4 sm:p-5">
      {/* The card itself — clean, dark, minimal */}
      <div
        ref={cardRef}
        style={{
          background: 'linear-gradient(180deg, #0c0f2b 0%, #151940 100%)',
          width: '340px',
          padding: '28px 24px',
          borderRadius: '24px',
          margin: '0 auto',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '22px', fontWeight: 600, color: '#C4B5FD', letterSpacing: '0.04em' }}>Lumina</span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>{typeLabel[type]}</span>
        </div>

        {/* Names */}
        <div style={{ fontSize: '20px', fontWeight: 600, color: '#f0ece4', lineHeight: 1.3, marginBottom: '8px' }}>
          {title}
        </div>

        {/* Summary */}
        <div style={{ fontSize: '12px', color: 'rgba(240,236,228,0.45)', lineHeight: 1.7, marginBottom: '20px' }}>
          {shortSub}
        </div>

        {/* Score bars */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px', marginBottom: '20px' }}>
          {parsedBullets.slice(0, 6).map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(240,236,228,0.5)', width: '52px', textAlign: 'right' as const, flexShrink: 0 }}>{item.label}</span>
              <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)' }}>
                <div style={{
                  width: `${item.value}%`,
                  height: '100%',
                  borderRadius: '3px',
                  background: item.value >= 70 ? 'linear-gradient(90deg, #8B5CF6, #A78BFA)' : item.value >= 40 ? 'linear-gradient(90deg, #6D5AAE, #8B73C8)' : 'linear-gradient(90deg, #4A3F7A, #6B5FA0)',
                }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#C4B5FD', width: '30px' }}>{item.value}%</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center' as const, fontSize: '9px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.2em', textTransform: 'uppercase' as const }}>
          {cta}
        </div>
      </div>

      {/* Action buttons */}
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
