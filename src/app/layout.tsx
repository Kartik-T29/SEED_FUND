import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/navbar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'IDEAPAD Seed Fund Portal',
  description: 'Startup seed fund application and evaluation portal by IDEAPAD - A Business Incubator of ITM Universe',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans min-h-screen flex flex-col">
        {process.env.DEMO_MODE !== 'false' && (
          <aside aria-label="Demo environment notice" className="bg-amber-400 text-amber-950 text-xs py-1.5 px-4 text-center font-semibold tracking-wide border-b border-amber-500 no-print">
            ⚠️ DEMO EVALUATION DEPLOYMENT — For testing only. Do not upload confidential identity records.
          </aside>
        )}
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <footer className="border-t border-gray-200 py-4 mt-auto no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-500">
              © {new Date().getFullYear()} IDEAPAD — A Business Incubator of ITM Universe. All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
