'use client';

import dynamic from 'next/dynamic';

const AnnouncementBanner = dynamic(() => import('@/components/AnnouncementBanner'), {
  ssr: false,
});

export default function ClientAnnouncementWrapper() {
  return (
    <>
      <AnnouncementBanner />
    </>
  );
} 