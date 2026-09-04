import type { BrokerId, BrokerParser } from "./types";
import { tradeRepublicParser } from "./parsers/traderepublic";
import { scalableParser } from "./parsers/scalable";

export const BROKER_PARSERS: readonly BrokerParser[] = [tradeRepublicParser, scalableParser];

export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function firstLine(text: string): string {
  const cleaned = stripBom(text);
  const end = cleaned.search(/\r?\n/);
  return end === -1 ? cleaned : cleaned.slice(0, end);
}

export function splitHeaderLine(line: string): { delimiter: "," | ";"; columns: string[] } {
  const semicolons = (line.match(/;/g) ?? []).length;
  const commas = (line.match(/,/g) ?? []).length;
  const delimiter: "," | ";" = semicolons >= commas ? ";" : ",";
  const columns = line
    .split(delimiter)
    .map((c) => c.trim().replace(/^"(.*)"$/, "$1").trim());
  return { delimiter, columns };
}

export function detectBroker(text: string): { broker: BrokerId; parser: BrokerParser; delimiter: "," | ";" } | null {
  const line = firstLine(text);
  if (line.trim() === "") return null;
  const { delimiter, columns } = splitHeaderLine(line);
  for (const parser of BROKER_PARSERS) {
    if (parser.matchesHeader(columns)) {
      return { broker: parser.id, parser, delimiter };
    }
  }
  return null;
}
