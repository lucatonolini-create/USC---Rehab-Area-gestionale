import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CATEGORIE_VALIDE = ["U19", "U17", "U16", "U15", "U14"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.nome?.trim()) {
      return NextResponse.json({ error: "Nome richiesto" }, { status: 400 });
    }
    if (!CATEGORIE_VALIDE.includes(body.categoria)) {
      return NextResponse.json({ error: "Categoria non valida" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const oggi = new Date().toISOString().slice(0, 10);
    const row = {
      id: crypto.randomUUID(),
      nome: body.nome.trim(),
      categoria: body.categoria,
      posizione: body.posizione ?? "",
      piede_dominante: body.piedeDominante ?? "",
      tipo_infortunio: body.tipoInfortunio ?? null,
      evento: body.evento ?? null,
      meccanismo: body.meccanismo ?? null,
      contatto: body.contatto ?? null,
      lato: body.lato ?? null,
      posizione_infortunio: body.posizioneInfortunio ?? null,
      infortunio: body.infortunio ?? "",
      inizio_rehab: body.inizioRehab || oggi,
      fine_rehab: null,
      stato: "Infortunato",
      progresso: 0,
      fisioterapista: body.fisioterapista ?? "",
      preparatore_atletico: "",
      telefono: "",
      email: "",
      note: body.note ?? "",
      storico_infortuni: [],
      questionari_kinesiofobia: [],
      referti_clinici: [],
      progresso_manuale: null,
      peso: body.peso ?? null,
      altezza: body.altezza ?? null,
      nome_completo: null,
    };

    const { error } = await supabase.from("atleti").insert(row);
    if (error) {
      console.error("[intake POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
