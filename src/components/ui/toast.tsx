'use client';
import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

type Toast = { id: number; text: string; tone: 'success' | 'error' };
const Ctx = createContext<(text: string, tone?: Toast['tone']) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex max-w-md items-center gap-3 rounded-full bg-brand-ink px-4 py-2.5 text-sm text-white shadow-soft">
            {t.tone === 'success' ? <CheckCircle2 className="size-4 text-brand-yellow" /> : <AlertCircle className="size-4 text-red-300" />}
            <span>{t.text}</span>
            <button aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}><X className="size-4 opacity-70" /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
