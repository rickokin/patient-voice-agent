import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

/** Map thrown errors to a JSON response. Zod -> 400, "not found" -> 404, else 500. */
export function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request", issues: error.issues },
      { status: 400 },
    );
  }
  const message = error instanceof Error ? error.message : "Server error";
  if (/not found/i.test(message)) {
    return NextResponse.json({ error: message }, { status: 404 });
  }
  console.error(error);
  return NextResponse.json({ error: message }, { status: 500 });
}
