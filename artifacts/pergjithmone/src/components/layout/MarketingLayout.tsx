import React from 'react';
import { Navbar, AnnouncementBar } from './Navbar';
import { Footer } from './Footer';

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1 flex flex-col text-[15px] md:text-base leading-relaxed">
        {children}
      </main>
      <Footer />
    </div>
  );
}
