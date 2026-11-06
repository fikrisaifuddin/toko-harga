"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const KOSONG = { nama_barang: "", harga_beli: "", harga_jual: "", harga_grosir: "" };

const rupiah = (n) => "Rp " + new Intl.NumberFormat("id-ID").format(Number(n) || 0);
const titik = (v) => (v === "" ? "" : new Intl.NumberFormat("id-ID").format(Number(v)));
const angka = (v) => v.replace(/\D/g, "").slice(0, 14);

export default function Home() {
  const [data, setData] = useState([]);
  const [form, setForm] = useState(KOSONG);
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
      .from("barang")
      .select("*")
      .order("nama_barang", { ascending: true });
    if (error) setErrorHalaman("Gagal memuat data: " + error.message);
    else setData(data);
    setLoading(false);
  }

  useEffect(() => {
    muat();
  }, []);

  // Tutup modal dengan tombol Escape, kunci scroll halaman, fokus ke nama barang
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
    () => data.filter((b) => b.nama_barang.toLowerCase().includes(cari.toLowerCase())),
    [data, cari]
  );

  function bukaTambah() {
    setEditId(null);
    setForm(KOSONG);
    setErrorForm("");
    setModalBuka(true);
  }

  function bukaEdit(b) {
    setEditId(b.id);
    setForm({
      nama_barang: b.nama_barang,
      harga_beli: String(b.harga_beli),
      harga_jual: String(b.harga_jual),
      harga_grosir: String(b.harga_grosir),
    });
    setErrorForm("");
    setModalBuka(true);
  }

  function tutupModal() {
    setModalBuka(false);
    setEditId(null);
    setForm(KOSONG);
    setErrorForm("");
  }

  async function simpan(e) {
    e.preventDefault();
    setErrorForm("");
    if (!form.nama_barang.trim()) {
      setErrorForm("Nama barang wajib diisi.");
      return;
    }
    const payload = {
      nama_barang: form.nama_barang.trim(),
      harga_beli: Number(form.harga_beli) || 0,
      harga_jual: Number(form.harga_jual) || 0,
      harga_grosir: Number(form.harga_grosir) || 0,
    };
    setMenyimpan(true);
    const { error } = editId
      ? await supabase.from("barang").update(payload).eq("id", editId)
      : await supabase.from("barang").insert(payload);
    setMenyimpan(false);
    if (error) {
      setErrorForm("Gagal menyimpan: " + error.message);
      return;
    }
    tutupModal();
    muat();
  }

  async function hapus(b) {
    if (!confirm(`Hapus "${b.nama_barang}"?`)) return;
    setErrorHalaman("");
    const { error } = await supabase.from("barang").delete().eq("id", b.id);
    if (error) setErrorHalaman("Gagal menghapus: " + error.message);
    else muat();
  }

  const input =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 pb-28 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold">Daftar harga barang</h1>
        <p className="mt-1 text-slate-600">Catat harga beli, harga jual, dan harga grosir.</p>

        {errorHalaman && (
          <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorHalaman}
          </p>
        )}

        {/* Tabel */}
        <div className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold">
              Semua barang <span className="font-normal text-slate-500">({tampil.length})</span>
            </h2>
            <input
              type="text"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama barang"
              className={input + " sm:max-w-xs"}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama barang</th>
                  <th className="px-4 py-3 text-right font-medium">Harga beli</th>
                  <th className="px-4 py-3 text-right font-medium">Harga jual</th>
                  <th className="px-4 py-3 text-right font-medium">Harga grosir</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Memuat data...
                    </td>
                  </tr>
                ) : tampil.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      {cari
                        ? "Tidak ada barang yang cocok."
                        : "Belum ada barang. Tekan tombol + di pojok kanan bawah."}
                    </td>
                  </tr>
                ) : (
                  tampil.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{b.nama_barang}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{rupiah(b.harga_beli)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{rupiah(b.harga_jual)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{rupiah(b.harga_grosir)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => bukaEdit(b)}
                          className="mr-3 font-medium text-teal-700 hover:underline"
                        >
                          Ubah
                        </button>
                        <button
                          onClick={() => hapus(b)}
                          className="font-medium text-red-600 hover:underline"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tombol melayang */}
      <button
        onClick={bukaTambah}
        aria-label="Tambah barang"
        title="Tambah barang"
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
                {editId ? "Ubah barang" : "Tambah barang"}
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
                Nama barang
                <input
                  ref={namaRef}
                  type="text"
                  value={form.nama_barang}
                  onChange={(e) => setForm({ ...form, nama_barang: e.target.value })}
                  placeholder="Contoh: Gula pasir 1 kg"
                  className={input + " mt-1 font-normal"}
                />
              </label>
              {[
                ["harga_beli", "Harga beli"],
                ["harga_jual", "Harga jual"],
                ["harga_grosir", "Harga grosir"],
              ].map(([kolom, label]) => (
                <label key={kolom} className="block text-sm font-medium">
                  {label}
                  <div className="relative mt-1">
                    <span className="pointer-events-none absolute left-3 top-2 text-slate-500">
                      Rp
                    </span>
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
                {menyimpan ? "Menyimpan..." : editId ? "Simpan perubahan" : "Tambah barang"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}