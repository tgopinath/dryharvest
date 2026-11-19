'use client';
export function PrintButton() {
  return <button onClick={() => window.print()} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white">Print / save as PDF</button>;
}
