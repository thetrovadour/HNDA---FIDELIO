import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '@rainbow-me/rainbowkit/styles.css';
import './globals.css';
import { Providers } from './providers';

const oxanium = localFont({
  src: '../../public/fonts/Oxanium-VariableFont_wght.ttf',
  variable: '--font-oxanium',
  weight: '200 800',
  display: 'swap',
});

const sairaStencil = localFont({
  src: '../../public/fonts/SairaStencil-VariableFont_wdth_wght.ttf',
  variable: '--font-stencil',
  weight: '100 900',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FIDELIO — Honduras Digital Assets',
  description: 'FIDELIO is a closed-loop loyalty and payment network built on Base, designed for Honduras.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${oxanium.variable} ${sairaStencil.variable}`}>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

