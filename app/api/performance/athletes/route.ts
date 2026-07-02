import { NextResponse } from "next/server";
import { perfGetAthletes } from "@/lib/performance-api";

export async function GET() {
  try {
    const data = await perfGetAthletes();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
