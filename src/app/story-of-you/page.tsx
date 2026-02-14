'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { loadProfile } from '@/lib/profile';
import type { OnboardingStoryResponse } from '@/types';

const STORY_CACHE_KEY = 'lumina_onboarding_story_cache';
const STORY_SHOWN_PREFIX = 'lumina_story_shown_';

function profileKey(profile: ReturnType<typeof loadProfile>): string {
  if (!profile) return 'none';
  return `${profile.birthData.year}-${profile.birthData.month}-${profile.birthData.day}-${profile.birthData.hour}-${profile.birthData.minute}-${profile.birthData.latitude}-${profile.birthData.longitude}`;
}

export default function StoryOfYouPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [story, setStory] = useState<OnboardingStoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const run = async () => {
      const profile = loadProfile();
      if (!profile) {
        router.replace('/');
        return;
      }

      const key = profileKey(profile);
      const shownFlag = `${STORY_SHOWN_PREFIX}${key}`;

      const seen = window.localStorage.getItem(shownFlag);
      if (seen === '1') {
        router.replace('/chart');
        return;
      }

      const cachedRaw = window.localStorage.getItem(STORY_CACHE_KEY);
      if (cachedRaw) {
        try {
          const parsed = JSON.parse(cachedRaw) as { key: string; story: OnboardingStoryResponse };
          if (parsed.key === key) {
            setStory(parsed.story);
            setLoading(false);
            return;
          }
        } catch {
          // continue
        }
      }

      try {
        const response = await fetch('/api/onboarding-story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ birthData: profile.birthData, language }),
        });

        const payload = (await response.json()) as OnboardingStoryResponse;
        setStory(payload);
        window.localStorage.setItem(STORY_CACHE_KEY, JSON.stringify({ key, story: payload }));
      } catch {
        setStory({
          title: t.storyTitle,
          paragraphs: [
            t.storyFallback1,
            t.storyFallback2,
            t.storyFallback3,
          ],
        });
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [language, router, t.storyFallback1, t.storyFallback2, t.storyFallback3, t.storyTitle]);

  useEffect(() => {
    if (!story) return;

    setVisibleCount(0);
    const timers = story.paragraphs.map((_, index) =>
      window.setTimeout(() => setVisibleCount(index + 1), 250 + index * 460),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [story]);

  const continueToChart = () => {
    const profile = loadProfile();
    const key = profileKey(profile);
    window.localStorage.setItem(`${STORY_SHOWN_PREFIX}${key}`, '1');
    router.push('/chart');
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 pb-12 pt-6 sm:px-6">
      <section className="glass-card w-full p-6 sm:p-8">
        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-8 w-1/2" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-11/12" />
            <div className="skeleton h-4 w-10/12" />
          </div>
        ) : (
          <>
            <h1 className="font-heading text-4xl text-lumina-soft">{story?.title || t.storyTitle}</h1>
            <p className="mt-2 text-sm text-cream/70">{t.storySubtitle}</p>
            <div className="mt-6 space-y-4">
              {story?.paragraphs.map((paragraph, index) => (
                <p
                  key={`${paragraph}-${index}`}
                  className={`leading-relaxed text-warmWhite transition duration-700 ${index < visibleCount ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
                >
                  {paragraph}
                </p>
              ))}
            </div>
            <button type="button" onClick={continueToChart} className="lumina-button mt-8 w-full sm:w-auto">
              {t.storyContinue}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
