import { Suspense } from 'react';
import PaymentSuccessClient from './PaymentSuccessClient';

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="font-heading text-3xl text-lumina-soft">✦</p></div>}>
      <PaymentSuccessClient />
    </Suspense>
  );
}
