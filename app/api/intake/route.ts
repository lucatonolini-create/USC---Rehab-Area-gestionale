import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

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
      telefono: "__intake__",
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

    // Broadcast via Realtime REST — bypasses RLS entirely
    await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        body: JSON.stringify({
          messages: [{
            topic: "intake-notify",
            event: "new",
            payload: { nome: row.nome, categoria: row.categoria },
          }],
        }),
      },
    ).catch(() => {});

    // Web Push to all subscribed devices
    if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      webpush.setVapidDetails(
        "mailto:rehab@uscremonese.it",
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );
      const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, keys");
      if (subs?.length) {
        const payload = JSON.stringify({
          title: "Nuovo infortunio segnalato",
          body: `${row.nome} · ${row.categoria}`,
          url: "/segnalazioni",
        });
        await Promise.allSettled(
          subs.map((s) =>
            webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload)
          )
        );
      }
    }

    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
