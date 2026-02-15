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

export default function ShareCard({ type, title, subtitle, bullets, cta = 'luminastrology.com' }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState('');

  const generateImage = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    setIsExporting(true);
    setStatus('');
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0a0d26',
        scale: 3,
        useCORS: true,
        logging: false,
      });
      return new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png', 1));
    } catch {
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  const share = async () => {
    setStatus('Creating...');
    const blob = await generateImage();
    
    if (blob) {
      const file = new File([blob], 'lumina-compatibility.png', { type: 'image/png' });
      
      // Try native share with file
      if (navigator.share) {
        try {
          await navigator.share({
            files: [file],
          });
          setStatus('');
          return;
        } catch (e) {
          // User cancelled or share failed — try without files
          if ((e as Error).name !== 'AbortError') {
            try {
              await navigator.share({
                title: 'Lumina Compatibility',
                text: `${title} — ${bullets.join(' · ')}`,
                url: 'https://luminastrology.com',
              });
              setStatus('');
              return;
            } catch { /* fall through */ }
          } else {
            setStatus('');
            return;
          }
        }
      }
    }
    
    // Fallback: text share or clipboard
    const text = `✦ ${title}\n${bullets.join('\n')}\n\nluminastrology.com`;
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Copied to clipboard ✓');
    } catch {
      setStatus('');
    }
    setTimeout(() => setStatus(''), 2500);
  };

  const download = async () => {
    setStatus('Creating...');
    const blob = await generateImage();
    if (!blob) { setStatus(''); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lumina-compatibility.png';
    a.click();
    URL.revokeObjectURL(url);
    setStatus('');
  };

  // Parse bullets
  const parsed = bullets.map((b) => {
    const m = b.match(/^(.+?):\s*(\d+)%$/);
    return m ? { label: m[1], value: parseInt(m[2]) } : { label: b, value: 0 };
  });

  const shortSub = subtitle.length > 140 ? subtitle.slice(0, 137).replace(/\s+\S*$/, '') + '…' : subtitle;

  // Color for score
  const barColor = (v: number) => v >= 75 ? '#A78BFA' : v >= 50 ? '#8B73C8' : v >= 30 ? '#6B5FA0' : '#4A3F7A';

  return (
    <div className="glass-card p-4 sm:p-5">
      {/* Instagram story format card — 9:16 ratio */}
      <div
        ref={cardRef}
        style={{
          width: '320px',
          minHeight: '540px',
          margin: '0 auto',
          padding: '32px 24px 24px',
          borderRadius: '20px',
          background: 'linear-gradient(170deg, #0f1235 0%, #0a0d26 30%, #12103a 70%, #0a0d26 100%)',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'Georgia, "Times New Roman", serif',
          color: '#f0ece4',
        }}
      >
        {/* Subtle top glow */}
        <div style={{
          position: 'absolute', top: '-60px', left: '50%', transform: 'translateX(-50%)',
          width: '200px', height: '200px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{ position: 'relative', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#C4B5FD', letterSpacing: '0.08em', marginBottom: '4px' }}>
            LUMINA
          </div>
          <div style={{ fontSize: '9px', letterSpacing: '0.25em', color: 'rgba(196,181,253,0.35)', textTransform: 'uppercase' }}>
            Celestial Compatibility
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '40px', height: '1px', background: 'rgba(167,139,250,0.2)', margin: '0 auto 24px' }} />

        {/* Names */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.3, color: '#f0ece4' }}>
            {title}
          </div>
        </div>

        {/* Summary */}
        <div style={{
          fontSize: '12px', lineHeight: 1.8, color: 'rgba(240,236,228,0.5)',
          textAlign: 'center', marginBottom: '28px', padding: '0 8px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          {shortSub}
        </div>

        {/* Score section */}
        <div style={{ marginBottom: '24px' }}>
          {parsed.slice(0, 6).map((item, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              marginBottom: idx < parsed.length - 1 ? '10px' : '0',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>
              <span style={{ fontSize: '10px', color: 'rgba(240,236,228,0.4)', width: '48px', textAlign: 'right', flexShrink: 0, letterSpacing: '0.02em' }}>
                {item.label}
              </span>
              <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                <div style={{
                  width: `${item.value}%`, height: '100%', borderRadius: '4px',
                  background: `linear-gradient(90deg, ${barColor(item.value)}88, ${barColor(item.value)})`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: barColor(item.value), width: '34px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                {item.value}%
              </span>
            </div>
          ))}
        </div>

        {/* Overall score highlight */}
        {parsed.length > 0 && (
          <div style={{
            textAlign: 'center', marginBottom: '24px',
            padding: '14px', borderRadius: '12px',
            background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.1)',
          }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.15em', color: 'rgba(196,181,253,0.4)', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'system-ui, sans-serif' }}>
              {parsed[0].label}
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#C4B5FD', fontFamily: 'system-ui, sans-serif' }}>
              {parsed[0].value}%
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.12)', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }}>
            {cta}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={share} disabled={isExporting} className="lumina-button flex-1">
          {isExporting ? '...' : status || 'Share'}
        </button>
        <button type="button" onClick={download} disabled={isExporting}
          className="min-h-12 flex-1 rounded-full border border-white/15 text-sm text-cream hover:text-warmWhite">
          Download
        </button>
      </div>
    </div>
  );
}
