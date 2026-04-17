import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return jsonError(error.message, error.status);
  }

  console.error(error);
  return jsonError("Unexpected server error", 500);
}
