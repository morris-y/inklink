import type { Metadata } from 'next';
import StyledComponentsRegistry from '@/lib/registry';
import info from '@/info.json';
import './globals.css';

export const metadata: Metadata = {
  title: info.title,
  description: info.blurb,
  // Drafts live here before they are published on morrisshyang.com; keep them out of search so the site copy is the original.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* ponytail: fonts load from Google at runtime instead of next/font/google, which fetches them at build time and
            kept failing on Vercel builders. Costs a brief system-font flash on first load; drafts-only site, noindex. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Playfair+Display:wght@400..900&family=Shippori+Mincho:wght@400;500;700&display=swap"
        />
      </head>
      <body>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  );
}
