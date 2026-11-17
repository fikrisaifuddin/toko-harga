import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { NAMA_COOKIE, tokenAkses, LEWATI_PIN } from "@/lib/akses";
import { supabaseServer } from "@/lib/supabase-server";

async function punyaAkses() {
  if (LEWATI_PIN) return true;
  const c = await cookies();
  return !!process.env.KEYHUTANG && c.get(NAMA_COOKIE)?.value === tokenAkses();
}

function bersihkan(body) {
  const nama = String(body.nama ?? "").trim();
  const tanggal = String(body.tanggal ?? "");
  const nota = Number(body.nota);
  const paid = Number(body.paid);

  if (!nama) return { error: "Nama wajib diisi." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || Number.isNaN(Date.parse(tanggal)))
    return { error: "Tanggal tidak valid." };
  if (!Number.isSafeInteger(nota) || nota < 0 || !Number.isSafeInteger(paid) || paid < 0)
    return { error: "Nota dan dibayar harus angka bulat, minimal 0." };

  return { data: { nama, tanggal, nota, paid } };
}

const tolak = () => NextResponse.json({ error: "Akses ditolak. Masukkan PIN lagi." }, { status: 401 });

export async function POST(req) {
  if (!(await punyaAkses())) return tolak();
  const body = await req.json().catch(() => ({}));
  const { data, error } = bersihkan(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const { error: dbError } = await supabaseServer().from("hutang").insert(data);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req) {
  if (!(await punyaAkses())) return tolak();
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isSafeInteger(id)) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });

  const { data, error } = bersihkan(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const { error: dbError } = await supabaseServer().from("hutang").update(data).eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  if (!(await punyaAkses())) return tolak();
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
  if (ids.length === 0 || !ids.every(Number.isSafeInteger))
    return NextResponse.json({ error: "Tidak ada data yang dipilih." }, { status: 400 });

  const { error: dbError } = await supabaseServer().from("hutang").delete().in("id", ids);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PUT(req) {
  if (!(await punyaAkses())) return tolak();
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  const jumlah = Number(body.jumlah);

  if (!Number.isSafeInteger(id)) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  if (!Number.isSafeInteger(jumlah) || jumlah <= 0)
    return NextResponse.json({ error: "Jumlah bayar harus lebih dari 0." }, { status: 400 });

  const db = supabaseServer();
  const { data: row, error: e1 } = await db
    .from("hutang")
    .select("nota, paid")
    .eq("id", id)
    .maybeSingle();
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });

  const sisa = row.nota - row.paid;
  if (jumlah > sisa) {
    return NextResponse.json(
      { error: `Maksimal pembayaran Rp ${new Intl.NumberFormat("id-ID").format(sisa)}.` },
      { status: 400 }
    );
  }

  const { data: upd, error: e2 } = await db
    .from("hutang")
    .update({ paid: row.paid + jumlah })
    .eq("id", id)
    .eq("paid", row.paid)
    .select("id");
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  if (!upd || upd.length === 0)
    return NextResponse.json({ error: "Data baru saja berubah, coba lagi." }, { status: 409 });

  return NextResponse.json({ ok: true });
}