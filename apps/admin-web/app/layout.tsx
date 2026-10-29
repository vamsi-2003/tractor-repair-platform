import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tractor Repair Platform | Admin Operations Console',
  description:
    'Administrative dashboard for tractor repair dispatch, mechanic certifications, and pilot operations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-50 text-slate-900 antialiased selection:bg-emerald-100 selection:text-emerald-900">
        {children}
      </body>
    </html>
  );
}
