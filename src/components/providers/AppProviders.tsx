'use client';

import { LanguageProvider } from '@/context/LanguageContext';
import AuthProvider from './AuthProvider';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </AuthProvider>
  );
}
