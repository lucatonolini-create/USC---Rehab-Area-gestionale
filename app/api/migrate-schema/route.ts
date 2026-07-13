import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const COLONNE_ATLETI: { nome: string; tipo: string; default?: string }[] = [
  { nome: "referti_clinici", tipo: "jsonb", default: "'[]'::jsonb" },
  { nome: "progresso_manuale", tipo: "float4" },
  { nome: "peso", tipo: "text" },
  { nome: "altezza", tipo: "text" },
  { nome: "altezza_da_seduto", tipo: "text" },
  { nome: "nome_completo", tipo: "text" },
];

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase env vars mancanti" }, { status: 503 });
  }
  const sb = createClient(url, key);

  const mancanti: string[] = [];
  for (const col of COLONNE_ATLETI) {
    const { error } = await sb.from("atleti").select(col.nome).limit(0);
    if (error?.code === "42703") {
      mancanti.push(col.nome);
    }
  }

  const sql = COLONNE_ATLETI
    .filter((c) => mancanti.includes(c.nome))
    .map((c) => `ALTER TABLE atleti ADD COLUMN IF NOT EXISTS ${c.nome} ${c.tipo}${c.default ? ` DEFAULT ${c.default}` : ""};`)
    .join("\n");

  return NextResponse.json({ mancanti, sql: sql || null, ok: mancanti.length === 0 });
}
