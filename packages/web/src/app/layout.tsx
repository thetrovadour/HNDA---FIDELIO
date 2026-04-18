import type { Metadata } from 'next';
import '@rainbow-me/rainbowkit/styles.css';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'FIDELIO — Honduras Digital Assets',
  description: 'FIDELIO is a closed-loop loyalty and payment network built on Base, designed for Honduras.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Saira+Stencil+One&family=Oxanium:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

