import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

export async function POST(req: NextRequest) {
  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;

  if (!NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return NextResponse.json(
      { error: "VAPID keys non configurate nel server (NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY)." },
      { status: 503 }
    );
  }

  try {
    const sub = await req.json();
    if (!sub?.endpoint) {
      return NextResponse.json({ error: "Sottoscrizione non valida." }, { status: 400 });
    }

    webpush.setVapidDetails(
      "mailto:rehab@uscremonese.it",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
    );

    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify({
        title: "✅ Notifica di test",
        body: "Le notifiche push funzionano su questo dispositivo.",
        url: "/impostazioni",
      }),
    );

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
