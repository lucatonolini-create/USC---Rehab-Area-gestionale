import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ROSA } from "@/lib/players";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const [impRes, atletiRes] = await Promise.all([
      supabase.from("impostazioni").select("rosa").eq("id", 1).single(),
      supabase.from("atleti").select("nome, categoria, posizione"),
    ]);

    const rosa: { nome: string; categoria: string; ruolo: string }[] =
      (impRes.data?.rosa as { nome: string; categoria: string; ruolo: string }[] | null) ?? [];

    // merge unique players from atleti
    if (atletiRes.data) {
      for (const a of atletiRes.data) {
        if (!rosa.some((g) => g.nome.toLowerCase() === a.nome.toLowerCase())) {
          rosa.push({ nome: a.nome, categoria: a.categoria ?? "", ruolo: a.posizione ?? "" });
        }
      }
    }

    if (rosa.length > 0) return NextResponse.json(rosa);
  } catch {}

  return NextResponse.json(ROSA);
}
