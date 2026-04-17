export function secondsDiff(startAtIso: string, endAtIso: string): number {
  const start = new Date(startAtIso).getTime();
  const end = new Date(endAtIso).getTime();
  return Math.max(0, Math.floor((end - start) / 1000));
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function isExpired(endAtIso: string | null): boolean {
  if (!endAtIso) {
    return false;
  }

  return Date.now() >= new Date(endAtIso).getTime();
}
