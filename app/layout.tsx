import type { Metadata } from 'next';
import StyledComponentsRegistry from '@/lib/registry';
import { Playfair_Display, Inter, Caveat, Noto_Serif_SC } from 'next/font/google';
import info from '@/info.json';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
  display: 'swap',
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-serif-sc',
  display: 'swap',
});

export const metadata: Metadata = {
  title: info.title,
  description: info.blurb,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable} ${caveat.variable} ${notoSerifSC.variable}`}>
      <body>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  );
}
