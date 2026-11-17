import { NextResponse } from "next/server";
import { NAMA_COOKIE, tokenAkses } from "@/lib/akses";

export async function POST(req) {
  const kunci = process.env.KEYHUTANG;
  if (!kunci) {
    return NextResponse.json({ error: "KEYHUTANG belum diatur di .env.local" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  if (String(body.pin ?? "") !== kunci) {
    return NextResponse.json({ error: "PIN salah." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(NAMA_COOKIE, tokenAkses(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // akses berlaku 8 jam
  });
  return res;
}