import { NextResponse } from "next/server";
import { perfGetAthletes } from "@/lib/performance-api";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: "Supabase env vars mancanti" }, { status: 503 });
    }
    const sb = createClient(url, key);

    // 1. Aggiorna atleti con sigla → match by code from Performance
    const data = await perfGetAthletes();
    const athletes: { id: string; name: string; code?: string }[] = data.athletes ?? [];

    const fromPerformance: { code: string; name: string; updated: number; error?: string }[] = [];
    for (const a of athletes) {
      if (!a.code || !a.name) continue;
      const { data: rows, error } = await sb
        .from("atleti")
        .update({ nome_completo: a.name })
        .eq("nome", a.code)
        .is("nome_completo", null)
        .select("id");
      fromPerformance.push({
        code: a.code,
        name: a.name,
        updated: rows?.length ?? 0,
        ...(error ? { error: error.message } : {}),
      });
    }

    // 2. Atleti il cui nome non ha punti (già un nome proprio, non una sigla)
    //    → copia nome → nome_completo
    const { data: nonSlug } = await sb
      .from("atleti")
      .select("id, nome")
      .is("nome_completo", null)
      .not("nome", "like", "%.%");

    const selfNamed: string[] = [];
    for (const row of nonSlug ?? []) {
      const { error } = await sb
        .from("atleti")
        .update({ nome_completo: row.nome })
        .eq("id", row.id);
      if (!error) selfNamed.push(row.nome);
    }

    return NextResponse.json({
      ok: true,
      fromPerformance,
      selfNamed,
      totaleAggiornati:
        fromPerformance.reduce((s, r) => s + r.updated, 0) + selfNamed.length,
    });
  } catch (e: unknown) {
    const err = e as { message?: string; status?: number };
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
}
