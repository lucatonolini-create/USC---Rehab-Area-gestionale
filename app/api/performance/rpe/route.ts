import { NextRequest, NextResponse } from "next/server";
import { perfGetRPE } from "@/lib/performance-api";

export async function GET(req: NextRequest) {
  try {
    const p = Object.fromEntries(req.nextUrl.searchParams.entries());
    const data = await perfGetRPE(p);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
