"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function DaftarFolder() {
  const [folders, setFolders] = useState([]);
  const [nama, setNama] = useState("");
  const [editId, setEditId] = useState(null);
  const [modalBuka, setModalBuka] = useState(false);
  const [cari, setCari] = useState("");
  const [loading, setLoading] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [errorHalaman, setErrorHalaman] = useState("");
  const namaRef = useRef(null);

  async function muat() {
    const { data, error } = await supabase
      .from("folder")
      .select("id, nama_folder, barang(count)")
      .order("nama_folder", { ascending: true });
    if (error) setErrorHalaman("Gagal memuat folder: " + error.message);
    else
      setFolders(
        data.map((f) => ({ id: f.id, nama_folder: f.nama_folder, jumlah: f.barang?.[0]?.count ?? 0 }))
      );
    setLoading(false);
  }

  useEffect(() => {
    muat();
  }, []);

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

  const tampil = useMemo(
    () => folders.filter((f) => f.nama_folder.toLowerCase().includes(cari.toLowerCase())),
    [folders, cari]
  );

  function bukaTambah() {
    setEditId(null);
    setNama("");
    setErrorForm("");
    setModalBuka(true);
  }

  function bukaEdit(f) {
    setEditId(f.id);
    setNama(f.nama_folder);
    setErrorForm("");
    setModalBuka(true);
  }

  function tutupModal() {
    setModalBuka(false);
    setEditId(null);
    setNama("");
    setErrorForm("");
  }

  async function simpan(e) {
    e.preventDefault();
    setErrorForm("");
    if (!nama.trim()) {
      setErrorForm("Nama folder wajib diisi.");
      return;
    }
    setMenyimpan(true);
    const { error } = editId
      ? await supabase.from("folder").update({ nama_folder: nama.trim() }).eq("id", editId)
      : await supabase.from("folder").insert({ nama_folder: nama.trim() });
    setMenyimpan(false);
    if (error) {
      setErrorForm("Gagal menyimpan: " + error.message);
      return;
    }
    tutupModal();
    muat();
  }

  async function hapus(f) {
    const pesan =
      f.jumlah > 0
        ? `Hapus folder "${f.nama_folder}" beserta ${f.jumlah} barang di dalamnya? Tindakan ini tidak bisa dibatalkan.`
        : `Hapus folder "${f.nama_folder}"?`;
    if (!confirm(pesan)) return;
    setErrorHalaman("");
    const { error } = await supabase.from("folder").delete().eq("id", f.id);
    if (error) setErrorHalaman("Gagal menghapus: " + error.message);
    else muat();
  }

  const input =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 pb-28 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold">Daftar harga barang</h1>
        <p className="mt-1 text-slate-600">Pilih folder untuk melihat dan mengelola barangnya.</p>

        {errorHalaman && (
          <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorHalaman}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold">
            Semua folder <span className="font-normal text-slate-500">({tampil.length})</span>
          </h2>
          <input
            type="text"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama folder"
            className={input + " sm:max-w-xs"}
          />
        </div>

        {loading ? (
          <p className="mt-8 text-center text-slate-500">Memuat folder...</p>
        ) : tampil.length === 0 ? (
          <p className="mt-8 text-center text-slate-500">
            {cari ? "Tidak ada folder yang cocok." : "Belum ada folder. Tekan tombol + di pojok kanan bawah."}
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tampil.map((f) => (
              <div key={f.id} className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <Link
                  href={`/folder/${f.id}`}
                  className="flex items-center gap-3 rounded-t-lg p-4 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40"
                >
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-teal-700" aria-hidden="true">
                    <path d="M3 6a2 2 0 0 1 2-2h4.17a2 2 0 0 1 1.41.59L12 6h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" />
                  </svg>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{f.nama_folder}</span>
                    <span className="block text-sm text-slate-500">{f.jumlah} barang</span>
                  </span>
                </Link>
                <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
                  <button
                    onClick={() => bukaEdit(f)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-teal-700 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    Ubah
                  </button>
                  <button
                    onClick={() => hapus(f)}
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tombol melayang */}
      <button
        onClick={bukaTambah}
        aria-label="Tambah folder"
        title="Tambah folder"
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
            aria-labelledby="judul-modal"
            className="max-h-full w-full max-w-md overflow-y-auto rounded-t-xl bg-white p-5 shadow-xl sm:rounded-xl"
          >
            <div className="flex items-center justify-between">
              <h2 id="judul-modal" className="text-lg font-semibold">
                {editId ? "Ubah folder" : "Tambah folder"}
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

            <label className="mt-4 block text-sm font-medium">
              Nama folder
              <input
                ref={namaRef}
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Mie instan"
                className={input + " mt-1 font-normal"}
              />
            </label>

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
                {menyimpan ? "Menyimpan..." : editId ? "Simpan perubahan" : "Tambah folder"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}