import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Admin sayfası için kontrol
  if (request.nextUrl.pathname.startsWith('/admin')) {
    try {
      // Backend API'ya direkt istek at
      const response = await fetch('http://localhost:3001/api/admin/check', {
        headers: {
          Cookie: request.headers.get('cookie') || ''
        }
      });
      
      const data = await response.json();
      
      // Admin/moderatör yetkisi yoksa ana sayfaya yönlendir
      if (!response.ok || !data.success) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      
      // Admin yetkisi gerektiren sayfalar için kontrol
      const adminOnlyPaths = ['/admin/matches', '/admin/gift-history', '/admin/gifts'];
      
      // Sadece admin yetkisi gerektiren bir sayfaya moderatör erişmek istiyorsa ana sayfaya yönlendir
      if (!data.isAdmin && adminOnlyPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      
      // Yetkisi varsa devam et
      return NextResponse.next();
    } catch (error) {
      console.error('Admin kontrolü sırasında hata:', error);
      // Hata durumunda ana sayfaya yönlendir
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
  
  return NextResponse.next();
}

// Middleware'in çalışacağı path'leri belirle
export const config = {
  matcher: ['/admin', '/admin/:path*']
}; 