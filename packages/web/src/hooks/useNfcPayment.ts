import { useState, useCallback, useRef } from 'react';

export type NfcStatus = 'idle' | 'scanning' | 'success' | 'error';

export interface NfcPaymentResult {
  status: NfcStatus;
  clientWallet: string | null;
  error: string | null;
  isSupported: boolean;
  startScan: () => Promise<void>;
  reset: () => void;
}

// NDEFReader is not in the standard TypeScript lib — declare minimally.
interface NDEFRecord {
  recordType: string;
  encoding?: string;
  data?: DataView;
}
interface NDEFReadingEvent {
  message: { records: NDEFRecord[] };
}
interface NDEFReader {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  addEventListener(type: 'reading', listener: (e: NDEFReadingEvent) => void): void;
  addEventListener(type: 'readingerror', listener: () => void): void;
}
declare const NDEFReader: { new(): NDEFReader } | undefined;

const SCAN_TIMEOUT_MS = 30_000;

function extractWallet(event: NDEFReadingEvent): string | null {
  for (const record of event.message.records) {
    if (record.recordType === 'text' && record.data) {
      const decoder = new TextDecoder(record.encoding ?? 'utf-8');
      const text = decoder.decode(record.data).trim();
      // Expect an EVM address: 0x followed by 40 hex chars
      if (/^0x[0-9a-fA-F]{40}$/.test(text)) return text;
    }
  }
  return null;
}

export function useNfcPayment(): NfcPaymentResult {
  const isSupported = typeof window !== 'undefined' && 'NDEFReader' in window;

  const [status, setStatus] = useState<NfcStatus>('idle');
  const [clientWallet, setClientWallet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus('idle');
    setClientWallet(null);
    setError(null);
  }, []);

  const startScan = useCallback(async () => {
    if (!isSupported) {
      setError('NFC no está disponible en este dispositivo.');
      setStatus('error');
      return;
    }

    reset();
    setStatus('scanning');

    const controller = new AbortController();
    abortRef.current = controller;

    timeoutRef.current = setTimeout(() => {
      controller.abort();
      setError('Tiempo agotado. Pide al cliente que vuelva a tocar su tarjeta.');
      setStatus('error');
    }, SCAN_TIMEOUT_MS);

    try {
      // NDEFReader is guarded by the isSupported check above.
      const reader = new (window as any).NDEFReader() as NDEFReader;

      reader.addEventListener('reading', (event: NDEFReadingEvent) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const wallet = extractWallet(event);
        if (wallet) {
          setClientWallet(wallet);
          setStatus('success');
        } else {
          setError('La tarjeta no contiene una dirección de billetera válida.');
          setStatus('error');
        }
        controller.abort();
      });

      reader.addEventListener('readingerror', () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setError('No se pudo leer la tarjeta. Intenta de nuevo.');
        setStatus('error');
        controller.abort();
      });

      await reader.scan({ signal: controller.signal });
    } catch (err: unknown) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Error desconocido al iniciar NFC.';
      setError(msg);
      setStatus('error');
    }
  }, [isSupported, reset]);

  return { status, clientWallet, error, isSupported, startScan, reset };
}
