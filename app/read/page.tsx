'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReaderView from '@/components/ReaderView';

function ReadPageInner() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite') ?? undefined;
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const createOrResumeSession = async () => {
      try {
        const anonymousId = localStorage.getItem('anonymousId') ?? undefined;
        const response = await fetch('/api/public/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workSlug: process.env.NEXT_PUBLIC_BOOK_SLUG,
            inviteToken,
            anonymousId,
          }),
        });
        const data = await response.json();
        localStorage.setItem('anonymousId', data.anonymousId);
        localStorage.setItem('sessionId', data.sessionId);
        setSessionId(data.sessionId);
      } catch (error) {
        console.error('Error creating session:', error);
      }
    };

    createOrResumeSession();
  }, []);

  if (!sessionId) return null;
  return <ReaderView sessionId={sessionId} />;
}

export default function ReadPage() {
  return (
    <Suspense>
      <ReadPageInner />
    </Suspense>
  );
}
