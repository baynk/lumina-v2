import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Lumina - Astrology & Celestial Guidance';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'stretch',
          background: '#080C1F',
          color: '#FFFFFF',
          display: 'flex',
          height: '100%',
          justifyContent: 'space-between',
          padding: '72px',
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(196,181,253,0.35), rgba(196,181,253,0) 60%)',
            height: '100%',
            left: 0,
            position: 'absolute',
            top: 0,
            width: '100%',
          }}
        />
        <div
          style={{
            border: '1px solid rgba(196,181,253,0.3)',
            borderRadius: 28,
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '56px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              color: '#C4B5FD',
              display: 'flex',
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: 8,
              textTransform: 'uppercase',
            }}
          >
            Lumina
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h1
              style={{
                display: 'flex',
                fontSize: 104,
                fontWeight: 700,
                letterSpacing: -2,
                lineHeight: 1,
                margin: 0,
              }}
            >
              Lumina
            </h1>
            <p
              style={{
                color: '#C4B5FD',
                display: 'flex',
                fontSize: 40,
                fontWeight: 500,
                margin: 0,
              }}
            >
              Astrology & Celestial Guidance
            </p>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
