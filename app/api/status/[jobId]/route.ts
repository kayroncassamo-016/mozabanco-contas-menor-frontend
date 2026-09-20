import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const backendBase =
      process.env.EACT_BACKEND_URL ?? "http://127.0.0.1:8000";

    const response = await fetch(
      `${backendBase}/api/eact/status/${params.jobId}`,
      { cache: "no-store" }
    );

    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        "content-type":
          response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}