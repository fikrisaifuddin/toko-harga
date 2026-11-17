import { createHash } from "crypto";

export const NAMA_COOKIE = "akses_tabel";

export function tokenAkses() {
  return createHash("sha256").update("tabel:" + (process.env.KEYHUTANG || "")).digest("hex");
}

export const LEWATI_PIN = process.env.NEXT_PUBLIC_LEWATI_PIN === "true";