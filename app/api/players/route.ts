import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ROSA } from "@/lib/players";

export const dynamic = "force-dynamic";

export async function GET() {
  // Start with the full static roster as base
  const merged: { nome: string; categoria: string; ruolo: string }[] = ROSA.map((g) => ({
    nome: g.nome,
    categoria: g.categoria,
    ruolo: g.ruolo,
  }));

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const [impRes, atletiRes] = await Promise.all([
      supabase.from("impostazioni").select("rosa").eq("id", 1).single(),
      supabase.from("atleti").select("nome, categoria, posizione"),
    ]);

    const fromRosa = (impRes.data?.rosa as { nome: string; categoria: string; ruolo: string }[] | null) ?? [];

    for (const g of fromRosa) {
      if (!merged.some((m) => m.nome.toLowerCase() === g.nome.toLowerCase())) {
        merged.push(g);
      }
    }

    if (atletiRes.data) {
      for (const a of atletiRes.data) {
        if (!merged.some((m) => m.nome.toLowerCase() === a.nome.toLowerCase())) {
          merged.push({ nome: a.nome, categoria: a.categoria ?? "", ruolo: a.posizione ?? "" });
        }
      }
    }
  } catch {}

  return NextResponse.json(
    merged.sort((a, b) => a.nome.localeCompare(b.nome)),
    { headers: { "Cache-Control": "no-store" } },
  );
}
