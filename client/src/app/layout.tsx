import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ClientAnnouncementWrapper from "@/components/ClientAnnouncementWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finder - GTA V Dating App",
  description: "Tinder-like app for GTA V servers",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gradient-to-br from-pink-100 via-pink-50 to-purple-100 min-h-screen`}>
        <div className="fixed inset-0 bg-gradient-to-br from-pink-100 via-pink-50 to-purple-100 -z-10"></div>
        <LanguageProvider>
          <Navbar />
          <ClientAnnouncementWrapper />
          <main className="pt-20 pb-6 px-4 max-w-screen-lg mx-auto">{children}</main>
        </LanguageProvider>
      </body>
    </html>
  );
}
