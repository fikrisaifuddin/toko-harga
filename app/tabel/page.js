import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NAMA_COOKIE, tokenAkses, LEWATI_PIN } from "@/lib/akses";
import { supabaseServer } from "@/lib/supabase-server";
import TabelHutang from "@/components/tabelhutang";

export default async function Halaman3() {
  const cookieStore = await cookies();
  if (!LEWATI_PIN && (!process.env.KEYHUTANG || cookieStore.get(NAMA_COOKIE)?.value !== tokenAkses())) {
    redirect("/");
  }

  const { data, error } = await supabaseServer()
    .from("hutang")
    .select("id, nama, tanggal, nota, paid, total")
    .order("tanggal", { ascending: false })
    .order("id", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 pb-28 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Semua folder
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Daftar hutang</h1>

        {error ? (
          <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Gagal memuat data: {error.message}
          </p>
        ) : (
          <TabelHutang data={data} />
        )}
      </div>
    </main>
  );
}