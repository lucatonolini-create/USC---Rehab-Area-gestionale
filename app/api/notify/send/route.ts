import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseServer } from "@/lib/supabase-server";

webpush.setVapidDetails(
  "mailto:lucatonolini@icloud.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { title, body, url } = await req.json();
    const { data: subs } = await supabaseServer.from("push_subscriptions").select("*");
    if (!subs?.length) return NextResponse.json({ sent: 0 });

    const results = await Promise.allSettled(
      subs.map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title, body, url: url ?? "/atleti" })
        )
      )
    );
    // Remove expired subscriptions (410 Gone)
    const expired = results
      .map((r, i) => ({ r, sub: subs[i] }))
      .filter(({ r }) => r.status === "rejected" && (r as any).reason?.statusCode === 410);
    if (expired.length) {
      await Promise.all(
        expired.map(({ sub }) =>
          supabaseServer.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
        )
      );
    }
    return NextResponse.json({ sent: results.filter(r => r.status === "fulfilled").length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
