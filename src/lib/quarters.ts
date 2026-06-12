/** Quarter helpers — quarters are identified as "2026-Q2". */

export function quarterOf(date: Date): string {
  return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
}

/** Half-open UTC range [start, end) covered by a quarter id. */
export function quarterRange(quarter: string): { start: Date; end: Date } {
  const match = quarter.match(/^(\d{4})-Q([1-4])$/);
  if (!match) throw new Error(`Invalid quarter "${quarter}"`);
  const year = Number(match[1]);
  const q = Number(match[2]);
  const start = new Date(Date.UTC(year, (q - 1) * 3, 1));
  const end = new Date(Date.UTC(year, q * 3, 1));
  return { start, end };
}

/** All quarters from `from` to now, newest first. */
export function quartersSince(from: Date): string[] {
  const quarters: string[] = [];
  const now = new Date();
  let year = from.getUTCFullYear();
  let q = Math.floor(from.getUTCMonth() / 3) + 1;
  const endYear = now.getUTCFullYear();
  const endQ = Math.floor(now.getUTCMonth() / 3) + 1;
  while (year < endYear || (year === endYear && q <= endQ)) {
    quarters.push(`${year}-Q${q}`);
    q++;
    if (q > 4) {
      q = 1;
      year++;
    }
  }
  return quarters.reverse();
}
