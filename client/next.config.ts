import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        pathname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
        pathname: '**',
      }
    ],
    domains: [
      'randomuser.me', 
      'i.imgur.com', 
      'res.cloudinary.com',
      'cloudinary.com',
      'drgkbvuis',
      // Add domains that might appear from escaped characters
      'x2F', 
      'lt', 
      'gt', 
      'amp',
      'quot',
      'apos',
      '&'
    ],
    dangerouslyAllowSVG: true,
    unoptimized: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*' // Backend URL (api prefix'i korundu)
      }
    ]
  }
};

export default nextConfig;
