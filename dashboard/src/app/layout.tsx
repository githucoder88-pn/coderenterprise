import type { Metadata } from 'next';
import { Providers } from '@/providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'CODER — Dashboard',
  description: 'Enterprise AI platform dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
