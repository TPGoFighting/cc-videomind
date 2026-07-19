import { NextResponse } from "next/server";
import { clearTencentSession } from "@/lib/tencent-auth";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true, data: { signedOut: true } });
  await clearTencentSession(response, request);
  return response;
}
