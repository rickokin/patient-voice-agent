import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Thrown when a request is authenticated but the user is not on the allowlist
 * (or auth is required and there is no session). `handleError` maps it to 403.
 */
export class NotAuthorizedError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "NotAuthorizedError";
  }
}

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status: 409 });
}

/** Map thrown errors to a JSON response. Zod -> 400, "not found" -> 404, else 500. */
export function handleError(error: unknown) {
  if (error instanceof NotAuthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
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
