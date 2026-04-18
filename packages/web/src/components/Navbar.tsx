'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Navbar() {
  return (
    <header
      className="bg-indigo-700 text-white px-6 py-4 shadow"
      style={{ animation: 'fadeIn 0.6s ease-out both' }}
    >
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-xl font-bold tracking-wide">FIDELIO</span>
          <nav className="flex gap-4 text-sm">
            <a href="/client" className="hover:underline">Client</a>
            <a href="/merchant" className="hover:underline">Merchant</a>
            <a href="/admin" className="hover:underline">Admin</a>
          </nav>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}
