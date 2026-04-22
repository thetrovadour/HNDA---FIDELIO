'use client';

import { useState, useEffect } from 'react';
import { esHN, enUS, type Key } from '@/lib/i18n';

// Starts with 'es' to match SSR, then switches to browser language after hydration.
export function useLang(): (key: Key) => string {
  const [lang, setLang] = useState<'es' | 'en'>('es');
  useEffect(() => {
    const detected = navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es';
    setLang(detected);
  }, []);
  return (key: Key) => lang === 'en' ? enUS[key] : esHN[key];
}
