"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function TombolTabel() {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [memeriksa, setMemeriksa] = useState(false);
  const pinRef = useRef(null);

  function tutup() {
    setBuka(false);
    setPin("");
    setError("");
  }

  useEffect(() => {
    if (!buka) return;
    const onKey = (e) => e.key === "Escape" && tutup();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    pinRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [buka]);

  async function periksa(nilaiPin) {
    setError("");
    setMemeriksa(true);
    try {
      const res = await fetch("/api/buka-tabel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: nilaiPin }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Gagal memeriksa PIN.");
        setPin("");
        setMemeriksa(false);
        setTimeout(() => pinRef.current?.focus(), 0);
        return;
      }
      tutup();
      setMemeriksa(false);
      router.push("/tabel");
    } catch {
      setError("Tidak bisa terhubung ke server.");
      setPin("");
      setMemeriksa(false);
      setTimeout(() => pinRef.current?.focus(), 0);
    }
  }

  function ubahPin(e) {
    const nilai = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPin(nilai);
    if (error) setError("");
    if (nilai.length === 4 && !memeriksa) periksa(nilai);
  }

  const lewatiPin =
  process.env.NEXT_PUBLIC_LEWATI_PIN === "true" && process.env.NODE_ENV !== "production";

  function klikTombol() {
    if (lewatiPin) router.push("/tabel");
    else setBuka(true);
  }

  return (
    <>
      {/* ke halaman 3 */}
      <button
        onClick={klikTombol}
        aria-label="Buka halaman 3"
        title="Buka halaman 3"
        className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-white text-teal-700 shadow-lg ring-1 ring-slate-200 hover:bg-teal-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-700/40"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18M3 15h18M9 4v16" />
        </svg>
      </button>

      {buka && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
          onMouseDown={(e) => e.target === e.currentTarget && tutup()}
        >
          <form
            onSubmit={(e) => e.preventDefault()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="judul-pin"
            className="w-full max-w-sm rounded-t-xl bg-white p-5 shadow-xl sm:rounded-xl"
          >
            <div className="flex items-center justify-between">
              <h2 id="judul-pin" className="text-lg font-semibold">Masukkan PIN</h2>
              <button
                type="button"
                onClick={tutup}
                aria-label="Tutup"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <p className="mt-1 text-sm text-slate-600">Halaman ini dikunci. Masukkan 4 digit angka.</p>

            <input
              ref={pinRef}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={pin}
              onChange={ubahPin}
              disabled={memeriksa}
              placeholder="••••"
              aria-label="PIN 4 digit"
              className="mt-4 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-center text-2xl tracking-[0.5em] text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 disabled:opacity-60"
            />

            {error && (
              <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-5 flex items-center justify-between">
              <span className="text-sm text-slate-500" aria-live="polite">
                {memeriksa ? "Memeriksa..." : ""}
              </span>
              <button
                type="button"
                onClick={tutup}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-50"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}