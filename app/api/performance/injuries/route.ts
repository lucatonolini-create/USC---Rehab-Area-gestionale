import { NextRequest, NextResponse } from "next/server";
import { perfGetInjuries, perfPostInjury } from "@/lib/performance-api";

export async function GET(req: NextRequest) {
  try {
    const p = Object.fromEntries(req.nextUrl.searchParams.entries());
    const data = await perfGetInjuries(p);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await perfPostInjury(body);
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
