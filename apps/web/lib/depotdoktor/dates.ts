const MS_PER_DAY = 86_400_000;

export function toUtc(date: string): number {
  const [y, m, day] = date.split("-").map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, day ?? 1);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / MS_PER_DAY);
}

export function yearFraction(from: string, to: string): number {
  return daysBetween(from, to) / 365;
}

export function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

export function monthOf(date: string): number {
  return Number(date.slice(5, 7));
}

export function formatDateDe(date: string): string {
  const [y, m, day] = date.split("-");
  return `${day}.${m}.${y}`;
}
