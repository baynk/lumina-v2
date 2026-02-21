'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useLanguage } from '@/context/LanguageContext';
import { secureSignOut } from '@/lib/authClient';

type Stats = {
  totalUsers: number;
  completedOnboarding: number;
  totalConsultations: number;
  newConsultations: number;
  signupsLast7Days: number;
};

type User = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  birth_date: string | null;
  gender: string | null;
  relationship_status: string | null;
  onboarding_completed: boolean;
  last_active_at: string;
  created_at: string;
};

type Consultation = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_preference: string | null;
  question: string;
  topics: string[] | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  preferred_format: string | null;
  unsure_birth_time: boolean;
  status: string;
  admin_notes: string | null;
  created_at: string;
  responded_at: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  in_review: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  responded: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  closed: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

const T: Record<string, Record<string, string>> = {
  en: {
    title: 'Lumina Admin', subtitle: 'Dashboard & management', backToApp: '← Back to app',
    overview: '📊 Overview', users: '👤 Users', consultations: '💬 Consultations',
    totalUsers: 'Total Users', onboarded: 'Onboarded', last7: 'Last 7 Days',
    consultationsLabel: 'Consultations', newRequests: 'New Requests',
    usersTotal: 'users total', joined: 'Joined', lastActive: 'Last Active',
    user: 'User', email: 'Email', birth: 'Birth', gender: 'Gender', status: 'Status',
    active: 'Active', pending: 'Pending', consultationsTotal: 'consultations total',
    noConsultations: 'No consultation requests yet.',
    markInReview: 'Mark In Review', markResponded: 'Mark Responded', close: 'Close',
    question: 'Question', birthDetails: 'Birth Details', prefers: 'Prefers',
    format: 'Format', registeredUser: 'Registered user', notes: 'Notes',
  },
  ru: {
    title: 'Lumina Админ', subtitle: 'Панель управления', backToApp: '← К приложению',
    overview: '📊 Обзор', users: '👤 Пользователи', consultations: '💬 Консультации',
    totalUsers: 'Всего', onboarded: 'Онбординг', last7: 'За 7 дней',
    consultationsLabel: 'Консультации', newRequests: 'Новые',
    usersTotal: 'пользователей', joined: 'Регистрация', lastActive: 'Активность',
    user: 'Пользователь', email: 'Email', birth: 'Рождение', gender: 'Пол', status: 'Статус',
    active: 'Активен', pending: 'Ожидание', consultationsTotal: 'консультаций',
    noConsultations: 'Запросов на консультации пока нет.',
    markInReview: 'На рассмотрении', markResponded: 'Ответ отправлен', close: 'Закрыть',
    question: 'Вопрос', birthDetails: 'Данные рождения', prefers: 'Предпочитает',
    format: 'Формат', registeredUser: 'Зарегистрирован', notes: 'Заметки',
  },
};

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { language } = useLanguage();
  const l = T[language] || T.en;
  const [tab, setTab] = useState<'stats' | 'users' | 'consultations'>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/auth/signin?callbackUrl=%2Fadmin');
      return;
    }
    if (authStatus === 'loading') return;
    if (!session?.user) {
      setError('Not signed in');
      setLoading(false);
      return;
    }
    loadData();
  }, [authStatus, router, session, tab]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'stats' || !stats) {
        const res = await fetch('/api/admin?type=stats');
        if (res.status === 403) { setError('Access denied. Admin only.'); setLoading(false); return; }
        if (res.ok) setStats(await res.json());
      }
      if (tab === 'users') {
        const res = await fetch('/api/admin?type=users');
        if (res.ok) setUsers(await res.json());
      }
      if (tab === 'consultations') {
        const res = await fetch('/api/admin?type=consultations');
        if (res.ok) setConsultations(await res.json());
      }
    } catch {
      setError('Failed to load data');
    }
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    loadData();
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="glass-card p-8 text-center max-w-sm">
          <p className="text-lg text-red-400 mb-2">⚠️ {error}</p>
          {session?.user?.email && (
            <p className="text-xs text-cream/40 mb-4">Signed in as: {session.user.email}</p>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => signIn('google', { callbackUrl: '/admin' })}
              className="rounded-full border border-lumina-accent/30 px-4 py-2.5 text-sm text-cream hover:border-lumina-accent/60 hover:text-warmWhite transition"
            >
              Sign in with admin account
            </button>
            {session?.user && (
              <button
                onClick={() => secureSignOut('/auth/signin?callbackUrl=%2Fadmin')}
                className="text-xs text-cream/40 hover:text-cream transition"
              >
                Sign out first (switch accounts)
              </button>
            )}
            <a href="/" className="text-xs text-cream/50 hover:text-cream">← Back to Lumina</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-lumina-soft">{l.title}</h1>
          <p className="text-sm text-cream/50 mt-1">{l.subtitle}</p>
        </div>
        <a href="/" className="text-sm text-cream/50 hover:text-cream transition">{l.backToApp}</a>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 rounded-xl bg-white/5 p-1 w-fit">
        {(['stats', 'users', 'consultations'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t
                ? 'bg-lumina-accent/20 text-lumina-soft'
                : 'text-cream/60 hover:text-cream'
            }`}
          >
            {t === 'stats' ? l.overview : t === 'users' ? l.users : l.consultations}
            {t === 'consultations' && stats && stats.newConsultations > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-black">
                {stats.newConsultations}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-lumina-accent border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Stats Tab */}
          {tab === 'stats' && stats && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <div className="cursor-pointer" onClick={() => setTab('users')}><StatCard label={l.totalUsers} value={stats.totalUsers} /></div>
              <div className="cursor-pointer" onClick={() => setTab('users')}><StatCard label={l.onboarded} value={stats.completedOnboarding} /></div>
              <div className="cursor-pointer" onClick={() => setTab('users')}><StatCard label={l.last7} value={stats.signupsLast7Days} /></div>
              <div className="cursor-pointer" onClick={() => setTab('consultations')}><StatCard label={l.consultationsLabel} value={stats.totalConsultations} /></div>
              <div className="cursor-pointer" onClick={() => setTab('consultations')}><StatCard label={l.newRequests} value={stats.newConsultations} highlight={stats.newConsultations > 0} /></div>
            </div>
          )}

          {/* Users Tab */}
          {tab === 'users' && (
            <div className="space-y-2">
              <p className="text-xs text-cream/40 mb-3">{users.length} {l.usersTotal}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-cream/50">
                      <th className="pb-2 pr-4">{l.user}</th>
                      <th className="pb-2 pr-4">{l.email}</th>
                      <th className="pb-2 pr-4">{l.birth}</th>
                      <th className="pb-2 pr-4 hidden sm:table-cell">{l.gender}</th>
                      <th className="pb-2 pr-4 hidden sm:table-cell">{l.status}</th>
                      <th className="pb-2 pr-4 hidden sm:table-cell">{l.joined}</th>
                      <th className="pb-2 hidden sm:table-cell">{l.lastActive}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-white/5 text-cream/80 hover:bg-white/[0.03] transition cursor-pointer">
                        <td className="py-2.5 pr-4">
                          <Link href={`/admin/user/${u.id}`} className="block">
                            <div className="flex items-center gap-2">
                              {u.image ? (
                                <img src={u.image} alt="" className="h-6 w-6 rounded-full" />
                              ) : (
                                <div className="h-6 w-6 rounded-full bg-lumina-accent/20 flex items-center justify-center text-[10px] text-lumina-soft">
                                  {(u.name || u.email)?.[0]?.toUpperCase()}
                                </div>
                              )}
                              <span>{u.name || '—'}</span>
                            </div>
                          </Link>
                        </td>
                        <td className="py-2.5 pr-4 text-cream/60">{u.email}</td>
                        <td className="py-2.5 pr-4">{u.birth_date || '—'}</td>
                        <td className="py-2.5 pr-4 capitalize hidden sm:table-cell">{u.gender || '—'}</td>
                        <td className="py-2.5 pr-4 hidden sm:table-cell">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] border ${
                            u.onboarding_completed
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            {u.onboarding_completed ? l.active : l.pending}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-cream/50 text-xs hidden sm:table-cell">{formatDate(u.created_at)}</td>
                        <td className="py-2.5 text-cream/50 text-xs hidden sm:table-cell">{u.last_active_at ? formatDate(u.last_active_at) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Consultations Tab */}
          {tab === 'consultations' && (
            <div className="space-y-4">
              <p className="text-xs text-cream/40">{consultations.length} {l.consultationsTotal}</p>
              {consultations.length === 0 ? (
                <div className="glass-card p-8 text-center text-cream/50">
                  {l.noConsultations}
                </div>
              ) : (
                consultations.map((c) => (
                  <div key={c.id} className="glass-card p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <Link
                          href={`/admin/client/${c.id}`}
                          className="font-medium text-warmWhite text-lg hover:text-lumina-accent transition"
                        >
                          {c.name}
                        </Link>
                        <p className="text-xs text-cream/50">{formatDate(c.created_at)}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium border flex-shrink-0 ${STATUS_COLORS[c.status] || STATUS_COLORS.new}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Contact info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-sm">
                      {(c.contact_email || c.user_email) && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-cream/40">📧</span>
                          <a href={`mailto:${c.contact_email || c.user_email}`} className="text-lumina-soft hover:text-lumina-accent-bright transition">
                            {c.contact_email || c.user_email}
                          </a>
                        </div>
                      )}
                      {c.contact_phone && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-cream/40">📱</span>
                          <a href={`tel:${c.contact_phone}`} className="text-lumina-soft hover:text-lumina-accent-bright transition">
                            {c.contact_phone}
                          </a>
                        </div>
                      )}
                      {c.contact_preference && (
                        <div className="flex items-center gap-1.5 text-xs text-cream/40">
                          {l.prefers}: <span className="text-cream/60 capitalize">{c.contact_preference}</span>
                        </div>
                      )}
                      {c.preferred_format && (
                        <div className="flex items-center gap-1.5 text-xs text-cream/40">
                          {l.format}: <span className="text-cream/60 capitalize">{c.preferred_format}</span>
                        </div>
                      )}
                    </div>

                    {/* Topics */}
                    {c.topics && c.topics.length > 0 && (
                      <div className="flex gap-1.5 mb-3">
                        {c.topics.map((t) => (
                          <span key={t} className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] text-cream/70">{t}</span>
                        ))}
                      </div>
                    )}

                    {/* Question */}
                    <div className="mb-3">
                      <p className="text-[10px] text-cream/40 uppercase tracking-wider mb-1">{l.question}</p>
                      <p className="text-sm text-cream/80 leading-relaxed">{c.question}</p>
                    </div>

                    {/* Birth data */}
                    {(c.birth_date || c.birth_place) && (
                      <div className="mb-3 rounded-lg bg-white/5 p-3">
                        <p className="text-[10px] text-cream/40 uppercase tracking-wider mb-1.5">{l.birthDetails}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs text-cream/70">
                          {c.birth_date && <div>📅 {c.birth_date}</div>}
                          {c.birth_time && <div>🕐 {c.birth_time}</div>}
                          {c.unsure_birth_time && !c.birth_time && <div>🕐 Unsure of time</div>}
                          {c.birth_place && <div className="sm:col-span-3">📍 {c.birth_place}</div>}
                        </div>
                      </div>
                    )}

                    {/* User link */}
                    {c.user_id && (
                      <p className="text-[10px] text-cream/30 mb-3">🔗 {l.registeredUser}: {c.user_name || c.user_email}</p>
                    )}

                    {c.admin_notes && (
                      <p className="text-xs text-cream/40 italic mb-3 border-l-2 border-white/10 pl-2">{l.notes}: {c.admin_notes}</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-white/5">
                      {c.status === 'new' && (
                        <button onClick={() => updateStatus(c.id, 'in_review')} className="rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs text-blue-300 hover:bg-blue-500/30 transition">
                          {l.markInReview}
                        </button>
                      )}
                      {(c.status === 'new' || c.status === 'in_review') && (
                        <button onClick={() => updateStatus(c.id, 'responded')} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/30 transition">
                          {l.markResponded}
                        </button>
                      )}
                      {c.status !== 'closed' && (
                        <button onClick={() => updateStatus(c.id, 'closed')} className="rounded-lg bg-zinc-500/20 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-500/30 transition">
                          {l.close}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`glass-card p-5 text-center ${highlight ? 'border-amber-500/30' : ''}`}>
      <p className={`text-3xl font-heading ${highlight ? 'text-amber-300' : 'text-lumina-soft'}`}>{value}</p>
      <p className="text-xs text-cream/50 mt-1">{label}</p>
    </div>
  );
}
