import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import AstrocartographyClient from './AstrocartographyClient';

const ADMIN_EMAILS = new Set(['ryan@ryanwright.io', 'luminastrology@gmail.com']);
const ADMIN_DOMAINS = new Set(['ryanwright.io']);

function isAdminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const domain = normalized.split('@')[1] || '';
  return ADMIN_EMAILS.has(normalized) || ADMIN_DOMAINS.has(domain);
}

export default async function AdminAstrocartographyPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email || '';

  if (!email) {
    redirect('/auth/signin?callbackUrl=%2Fadmin%2Fastrocartography');
  }

  if (!isAdminEmail(email)) {
    redirect('/admin');
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl text-lumina-soft">Astrocartography Map</h1>
          <p className="mt-1 text-sm text-cream/50">Interactive planetary line map for your birth chart.</p>
        </div>
        <Link href="/admin" className="text-sm text-cream/50 transition hover:text-cream">
          ← Back to admin
        </Link>
      </header>
      <AstrocartographyClient />
    </div>
  );
}
