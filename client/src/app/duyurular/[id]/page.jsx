import { MegaphoneIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default async function AnnouncementDetailPage({ params }) {
  const slotId = params.id;
  let announcement = null;
  let error = '';
  
  try {
    // Server-side veri çekme
    const response = await fetch('http://localhost:3001/api/announcements', { cache: 'no-store' });
    const data = await response.json();
    
    if (data.success) {
      const announcements = data.announcements;
      const parsedSlotId = parseInt(slotId);
      
      // Slot ID'ye göre duyuruyu bul
      const foundAnnouncement = announcements.find((a) => a.slot === parsedSlotId);
      
      if (foundAnnouncement) {
        announcement = foundAnnouncement;
      } else {
        error = 'Duyuru bulunamadı';
      }
    } else {
      error = 'Duyuru bilgileri alınamadı';
    }
  } catch (err) {
    console.error('Duyuru detayı getirme hatası:', err);
    error = 'Duyuru bilgileri alınamadı';
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <p className="text-center">Ana sayfaya dönebilirsiniz</p>
        <div className="text-center mt-4">
          <Link href="/" className="text-pink-600 hover:text-pink-800">
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    );
  }

  if (!announcement) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 overflow-y-auto pb-50 max-h-screen">
      <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-8">
          <div className="flex items-center mb-6">
            <MegaphoneIcon className="h-8 w-8 text-pink-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-800">{announcement.title}</h1>
          </div>
          
          <div className="prose max-w-none">
            <div 
              className="text-gray-700"
              dangerouslySetInnerHTML={{ __html: announcement.content }}
            />
          </div>
          
          <div className="mt-8 text-sm text-gray-500">
            {new Date(announcement.createdAt).toLocaleDateString('tr-TR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <Link href="/" className="text-pink-600 hover:text-pink-800 font-medium">
            &larr; Ana sayfaya dön
          </Link>
        </div>
      </div>
    </div>
  );
} 