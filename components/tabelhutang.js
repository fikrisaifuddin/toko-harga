"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const PER_HALAMAN = 15;
const hariIni = () => new Date().toLocaleDateString("sv-SE"); // format YYYY-MM-DD, zona waktu lokal
const KOSONG = () => ({ nama: "", tanggal: hariIni(), nota: "", paid: "" });

const rupiah = (n) => "Rp " + new Intl.NumberFormat("id-ID").format(Number(n) || 0);
const titik = (v) => (v === "" ? "" : new Intl.NumberFormat("id-ID").format(Number(v)));
const angka = (v) => v.replace(/\D/g, "").slice(0, 14);
const tanggalIndo = (t) =>
  new Date(t + "T00:00:00").toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function TabelHutang({ data }) {
  const router = useRouter();

  const [halaman, setHalaman] = useState(1);
  const [form, setForm] = useState(KOSONG);
  const [editId, setEditId] = useState(null);
  const [modalBuka, setModalBuka] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [errorHalaman, setErrorHalaman] = useState("");
  const namaRef = useRef(null);

  const [modeSelect, setModeSelect] = useState(false);
  const [terpilih, setTerpilih] = useState([]);
  const [menghapus, setMenghapus] = useState(false);

  const [bayarItem, setBayarItem] = useState(null);
  const [jumlahBayar, setJumlahBayar] = useState("");
  const [errorBayar, setErrorBayar] = useState("");
  const [membayar, setMembayar] = useState(false);
  const bayarRef = useRef(null);

  const totalHalaman = Math.max(1, Math.ceil(data.length / PER_HALAMAN));
  const aktif = Math.min(halaman, totalHalaman);
  const awal = (aktif - 1) * PER_HALAMAN;
  const baris = data.slice(awal, awal + PER_HALAMAN);

  // Hanya hitung id yang masih ada di data
  const idTerpilih = useMemo(
    () => data.filter((h) => terpilih.includes(h.id)).map((h) => h.id),
    [data, terpilih]
  );
  const semuaHalamanTerpilih = baris.length > 0 && baris.every((h) => terpilih.includes(h.id));

  useEffect(() => {
    if (!modalBuka) return;
    const onKey = (e) => e.key === "Escape" && tutupModal();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    namaRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [modalBuka]);

  // Kirim permintaan ke API. Kalau akses (cookie PIN) sudah habis, kembali ke halaman awal.
  async function kirim(method, body) {
    try {
      const res = await fetch("/api/hutang", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/");
        return { error: json.error || "Akses ditolak." };
      }
      if (!res.ok) return { error: json.error || "Terjadi kesalahan." };
      return { ok: true };
    } catch {
      return { error: "Tidak bisa terhubung ke server." };
    }
  }

  function bukaTambah() {
    setEditId(null);
    setForm(KOSONG());
    setErrorForm("");
    setModalBuka(true);
  }

  function bukaEdit(h) {
    setEditId(h.id);
    setForm({
      nama: h.nama,
      tanggal: h.tanggal,
      nota: String(h.nota),
      paid: String(h.paid),
    });
    setErrorForm("");
    setModalBuka(true);
  }

  function tutupModal() {
    setModalBuka(false);
    setEditId(null);
    setForm(KOSONG());
    setErrorForm("");
  }

  async function simpan(e) {
    e.preventDefault();
    setErrorForm("");
    if (!form.nama.trim()) {
      setErrorForm("Nama wajib diisi.");
      return;
    }
    if (!form.tanggal) {
      setErrorForm("Tanggal wajib diisi.");
      return;
    }
    const payload = {
      nama: form.nama.trim(),
      tanggal: form.tanggal,
      nota: Number(form.nota) || 0,
      paid: Number(form.paid) || 0,
    };
    setMenyimpan(true);
    const hasil = editId
      ? await kirim("PATCH", { id: editId, ...payload })
      : await kirim("POST", payload);
    setMenyimpan(false);
    if (hasil.error) {
      setErrorForm("Gagal menyimpan: " + hasil.error);
      return;
    }
    tutupModal();
    router.refresh();
  }

  async function hapus(h) {
    if (!confirm(`Hapus hutang "${h.nama}"?`)) return;
    setErrorHalaman("");
    const hasil = await kirim("DELETE", { ids: [h.id] });
    if (hasil.error) setErrorHalaman("Gagal menghapus: " + hasil.error);
    else router.refresh();
  }

useEffect(() => {
  if (!bayarItem) return;
  const onKey = (e) => e.key === "Escape" && tutupBayar();
  document.addEventListener("keydown", onKey);
  document.body.style.overflow = "hidden";
  bayarRef.current?.focus();
  return () => {
    document.removeEventListener("keydown", onKey);
    document.body.style.overflow = "";
  };
}, [bayarItem]);

function bukaBayar(h) {
  setBayarItem(h);
  setJumlahBayar("");
  setErrorBayar("");
}

function tutupBayar() {
  setBayarItem(null);
  setJumlahBayar("");
  setErrorBayar("");
}

// Nominal otomatis dibatasi maksimal sebesar total hutang
function ubahJumlahBayar(e) {
  let nilai = angka(e.target.value);
  if (nilai !== "" && Number(nilai) > bayarItem.total) nilai = String(bayarItem.total);
  setJumlahBayar(nilai);
  setErrorBayar("");
}

async function simpanBayar(e) {
  e.preventDefault();
  const jumlah = Number(jumlahBayar) || 0;
  if (jumlah <= 0) {
    setErrorBayar("Masukkan jumlah pembayaran.");
    return;
  }
  if (jumlah > bayarItem.total) {
    setErrorBayar(`Maksimal pembayaran ${rupiah(bayarItem.total)}.`);
    return;
  }
  setMembayar(true);
  const hasil = await kirim("PUT", { id: bayarItem.id, jumlah });
  setMembayar(false);
  if (hasil.error) {
    setErrorBayar("Gagal menyimpan: " + hasil.error);
    return;
  }
  tutupBayar();
  router.refresh();
}

  function mulaiSelect() {
    setModeSelect(true);
    setTerpilih([]);
  }

  function batalSelect() {
    setModeSelect(false);
    setTerpilih([]);
  }

  function toggleBaris(id) {
    setTerpilih((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // Memilih / membatalkan semua baris di halaman tabel yang sedang tampil
  function pilihSemua() {
    const idHalaman = baris.map((h) => h.id);
    setTerpilih((prev) =>
      semuaHalamanTerpilih
        ? prev.filter((id) => !idHalaman.includes(id))
        : [...new Set([...prev, ...idHalaman])]
    );
  }

  async function hapusTerpilih() {
    if (idTerpilih.length === 0) return;
    if (!confirm(`Hapus ${idTerpilih.length} data hutang terpilih?`)) return;
    setErrorHalaman("");
    setMenghapus(true);
    const hasil = await kirim("DELETE", { ids: idTerpilih });
    setMenghapus(false);
    if (hasil.error) {
      setErrorHalaman("Gagal menghapus: " + hasil.error);
      return;
    }
    batalSelect();
    router.refresh();
  }

  const input =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20";
  const sisaForm = (Number(form.nota) || 0) - (Number(form.paid) || 0);

  return (
    <>
      {errorHalaman && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorHalaman}
        </p>
      )}

      <div className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
        {/* Baris tombol Pilih / Batal / Pilih semua / Hapus terpilih */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
          {!modeSelect ? (
            <button
              onClick={mulaiSelect}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M8 12l3 3 5-6" />
              </svg>
              Pilih
            </button>
          ) : (
            <>
              <button
                onClick={batalSelect}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={pilihSemua}
                disabled={baris.length === 0}
                className="rounded-md border border-teal-700 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-700 hover:text-white disabled:opacity-50"
              >
                {semuaHalamanTerpilih ? "Batal pilih semua" : "Pilih semua"}
              </button>
              <button
                onClick={hapusTerpilih}
                disabled={idTerpilih.length === 0 || menghapus}
                className="rounded-md border border-red-600 bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {menghapus ? "Menghapus..." : `Hapus terpilih (${idTerpilih.length})`}
              </button>
            </>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {modeSelect && (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={semuaHalamanTerpilih}
                      onChange={pilihSemua}
                      aria-label="Pilih semua data di halaman ini"
                      className="h-4 w-4 accent-teal-700"
                    />
                  </th>
                )}
                <th className="min-w-[10rem] px-4 py-3 font-medium">Nama</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Tanggal</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-medium">Nota</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-medium">Dibayar</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-medium">Total</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {baris.length === 0 ? (
                <tr>
                  <td colSpan={modeSelect ? 7 : 6} className="px-4 py-8 text-center text-slate-500">
                    Belum ada data hutang. Tekan tombol + di pojok kanan bawah.
                  </td>
                </tr>
              ) : (
                baris.map((h) => (
                  <tr
                    key={h.id}
                    className={"hover:bg-slate-50 " + (terpilih.includes(h.id) ? "bg-teal-50/60" : "")}
                  >
                    {modeSelect && (
                      <td className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={terpilih.includes(h.id)}
                          onChange={() => toggleBaris(h.id)}
                          aria-label={`Pilih ${h.nama}`}
                          className="h-4 w-4 accent-teal-700"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium">{h.nama}</td>
                    <td className="whitespace-nowrap px-4 py-3">{tanggalIndo(h.tanggal)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{rupiah(h.nota)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{rupiah(h.paid)}</td>
                    <td
                      className={
                        "whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums " +
                        (h.total > 0 ? "text-red-600" : "text-teal-700")
                      }
                    >
                      {rupiah(h.total)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {!modeSelect && (
                        <div className="inline-flex gap-2">
                            {h.total > 0 ? (
                                <button
                                onClick={() => bukaBayar(h)}
                                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
                                >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="6" width="20" height="12" rx="2" />
                                    <circle cx="12" cy="12" r="2.5" />
                                </svg>
                                Bayar
                                </button>
                            ) : (
                                <span className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-500">
                                Lunas
                                </span>
                            )}
                          <button
                            onClick={() => bukaEdit(h)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-teal-700 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                            Ubah
                          </button>
                          <button
                            onClick={() => hapus(h)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-red-600 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v5M14 11v5" />
                            </svg>
                            Hapus
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm sm:flex-row">
          <span className="text-slate-600">
            {data.length === 0
              ? "0 data"
              : `Menampilkan ${awal + 1}-${awal + baris.length} dari ${data.length} data`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHalaman(aktif - 1)}
              disabled={aktif <= 1}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <span className="px-1 text-slate-600">
              {aktif} / {totalHalaman}
            </span>
            <button
              onClick={() => setHalaman(aktif + 1)}
              disabled={aktif >= totalHalaman}
              className="rounded-md border border-teal-700 bg-teal-50 px-3 py-1.5 font-medium text-teal-700 hover:bg-teal-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>

      {/* Tombol melayang */}
      <button
        onClick={bukaTambah}
        aria-label="Tambah hutang"
        title="Tambah hutang"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg hover:bg-teal-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-700/40"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {/* Modal */}
      {modalBuka && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
          onMouseDown={(e) => e.target === e.currentTarget && tutupModal()}
        >
          <form
            onSubmit={simpan}
            role="dialog"
            aria-modal="true"
            aria-labelledby="judul-modal-hutang"
            className="max-h-full w-full max-w-md overflow-y-auto rounded-t-xl bg-white p-5 shadow-xl sm:rounded-xl"
          >
            <div className="flex items-center justify-between">
              <h2 id="judul-modal-hutang" className="text-lg font-semibold">
                {editId ? "Ubah hutang" : "Tambah hutang"}
              </h2>
              <button
                type="button"
                onClick={tutupModal}
                aria-label="Tutup"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block text-sm font-medium">
                Nama
                <input
                  ref={namaRef}
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="Contoh: Budi"
                  className={input + " mt-1 font-normal"}
                />
              </label>

              <label className="block text-sm font-medium">
                Tanggal
                <input
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                  className={input + " mt-1 font-normal"}
                />
              </label>

              {[
                ["nota", "Nota (jumlah hutang)"],
                ["paid", "Dibayar"],
              ].map(([kolom, label]) => (
                <label key={kolom} className="block text-sm font-medium">
                  {label}
                  <div className="relative mt-1">
                    <span className="pointer-events-none absolute left-3 top-2 text-slate-500">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={titik(form[kolom])}
                      onChange={(e) => setForm({ ...form, [kolom]: angka(e.target.value) })}
                      placeholder="0"
                      className={input + " pl-10 text-right font-normal"}
                    />
                  </div>
                </label>
              ))}

              <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-600">Total (Nota - Dibayar)</span>
                <span className={"font-semibold tabular-nums " + (sisaForm > 0 ? "text-red-600" : "text-teal-700")}>
                  {rupiah(sisaForm)}
                </span>
              </div>
            </div>

            {errorForm && (
              <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorForm}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={tutupModal}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={menyimpan}
                className="rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {menyimpan ? "Menyimpan..." : editId ? "Simpan perubahan" : "Tambah hutang"}
              </button>
            </div>
          </form>
        </div>
      )}
        {/* Modal bayar */}
        {bayarItem && (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
            onMouseDown={(e) => e.target === e.currentTarget && tutupBayar()}
        >
            <form
            onSubmit={simpanBayar}
            role="dialog"
            aria-modal="true"
            aria-labelledby="judul-modal-bayar"
            className="max-h-full w-full max-w-md overflow-y-auto rounded-t-xl bg-white p-5 shadow-xl sm:rounded-xl"
            >
            <div className="flex items-center justify-between">
                <h2 id="judul-modal-bayar" className="text-lg font-semibold">
                Bayar hutang: {bayarItem.nama}
                </h2>
                <button
                type="button"
                onClick={tutupBayar}
                aria-label="Tutup"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                </svg>
                </button>
            </div>

            <dl className="mt-4 space-y-1 rounded-md bg-slate-50 px-3 py-2 text-sm">
                <div className="flex justify-between">
                <dt className="text-slate-600">Nota</dt>
                <dd className="tabular-nums">{rupiah(bayarItem.nota)}</dd>
                </div>
                <div className="flex justify-between">
                <dt className="text-slate-600">Sudah dibayar</dt>
                <dd className="tabular-nums">{rupiah(bayarItem.paid)}</dd>
                </div>
                <div className="flex justify-between font-semibold">
                <dt>Total hutang sekarang</dt>
                <dd className="tabular-nums text-red-600">{rupiah(bayarItem.total)}</dd>
                </div>
            </dl>

            <label className="mt-4 block text-sm font-medium">
                <span className="flex items-center justify-between">
                Jumlah bayar
                <button
                    type="button"
                    onClick={() => {
                    setJumlahBayar(String(bayarItem.total));
                    setErrorBayar("");
                    }}
                    className="text-sm font-medium text-teal-700 hover:underline"
                >
                    Bayar penuh
                </button>
                </span>
                <div className="relative mt-1">
                <span className="pointer-events-none absolute left-3 top-2 text-slate-500">Rp</span>
                <input
                    ref={bayarRef}
                    type="text"
                    inputMode="numeric"
                    value={titik(jumlahBayar)}
                    onChange={ubahJumlahBayar}
                    placeholder="0"
                    className={input + " pl-10 text-right font-normal"}
                />
                </div>
                <span className="mt-1 block text-xs font-normal text-slate-500">
                Maksimal {rupiah(bayarItem.total)}
                </span>
            </label>

            <div className="mt-3 flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-600">Sisa setelah bayar</span>
                <span className="font-semibold tabular-nums">
                {rupiah(bayarItem.total - (Number(jumlahBayar) || 0))}
                </span>
            </div>

            {errorBayar && (
                <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorBayar}
                </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
                <button
                type="button"
                onClick={tutupBayar}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-50"
                >
                Batal
                </button>
                <button
                type="submit"
                disabled={membayar}
                className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                {membayar ? "Menyimpan..." : "Bayar"}
                </button>
            </div>
            </form>
        </div>
      )}
    </>
  );
}