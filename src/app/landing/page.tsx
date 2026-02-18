'use client';

import { useRouter } from 'next/navigation';
import LandingContent from '@/components/LandingContent';

export default function LandingPage() {
  const router = useRouter();

  return (
    <LandingContent
      onCtaClick={() => router.push('/')}
      onConsultationClick={() => router.push('/consultation')}
    />
  );
}
