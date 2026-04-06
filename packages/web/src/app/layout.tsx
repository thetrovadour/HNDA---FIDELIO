import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FIDELIO',
  description: 'FIDELIO — Digital loyalty point system for Honduran tourism (HNDA)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-indigo-700 text-white px-6 py-4 shadow">
          <div className="max-w-6xl mx-auto flex items-center gap-6">
            <span className="text-xl font-bold tracking-wide">FIDELIO</span>
            <nav className="flex gap-4 text-sm">
              <a href="/client" className="hover:underline">Client</a>
              <a href="/merchant" className="hover:underline">Merchant</a>
              <a href="/admin" className="hover:underline">Admin</a>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
