import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ROSA } from "@/lib/players";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await supabase
      .from("impostazioni")
      .select("rosa")
      .eq("id", 1)
      .single();

    const rosa = (data?.rosa as { nome: string; categoria: string; ruolo: string }[] | null);
    if (rosa && rosa.length > 0) {
      return NextResponse.json(rosa);
    }
  } catch {}

  return NextResponse.json(ROSA);
}
