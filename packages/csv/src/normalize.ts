import type { DecimalString, TransactionType } from "./types";

export type NumberStyle = "point" | "comma";

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

export function parseDecimal(raw: string | undefined | null, style: NumberStyle): DecimalString | null {
  if (raw === undefined || raw === null) return null;
  let value = raw.trim();
  if (value === "") return null;
  value = value.replace(/\s/g, "").replace(/€|EUR|USD|\$/g, "");
  if (value === "") return null;
  if (style === "comma") {
    if (value.includes(",")) {
      value = value.replace(/\./g, "").replace(",", ".");
    }
  } else if (value.includes(",") && value.includes(".")) {
    value = value.replace(/,/g, "");
  } else if (value.includes(",")) {
    return null;
  }
  if (value.startsWith("+")) value = value.slice(1);
  if (!DECIMAL_PATTERN.test(value)) return null;
  return normalizeDecimalString(value);
}

export function normalizeDecimalString(value: DecimalString): DecimalString {
  const negative = value.startsWith("-");
  let digits = negative ? value.slice(1) : value;
  const [intPartRaw, fracPartRaw] = digits.split(".");
  const intPart = (intPartRaw ?? "0").replace(/^0+(?=\d)/, "");
  const fracPart = (fracPartRaw ?? "").replace(/0+$/, "");
  digits = fracPart.length > 0 ? `${intPart}.${fracPart}` : intPart;
  if (digits === "0" || digits === "") return "0";
  return negative ? `-${digits}` : digits;
}

export function absDecimal(value: DecimalString): DecimalString {
  return value.startsWith("-") ? value.slice(1) : value;
}

export function negateDecimal(value: DecimalString): DecimalString {
  if (value === "0") return "0";
  return value.startsWith("-") ? value.slice(1) : `-${value}`;
}

export function isZeroDecimal(value: DecimalString): boolean {
  return value === "0" || value === "-0";
}

export function applySignConvention(type: TransactionType, amount: DecimalString): DecimalString {
  switch (type) {
    case "buy":
    case "fee":
    case "tax":
    case "withdrawal":
      return negateDecimal(absDecimal(amount));
    case "sell":
    case "dividend":
    case "interest":
    case "deposit":
      return absDecimal(amount);
    default:
      return amount;
  }
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const GERMAN_DATE = /^(\d{2})\.(\d{2})\.(\d{4})$/;

export function parseDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  const iso = ISO_DATE.exec(value.slice(0, 10));
  if (iso && ISO_DATE.test(value.slice(0, 10))) {
    return isValidYmd(iso[1]!, iso[2]!, iso[3]!) ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
  }
  const de = GERMAN_DATE.exec(value);
  if (de) {
    return isValidYmd(de[3]!, de[2]!, de[1]!) ? `${de[3]}-${de[2]}-${de[1]}` : null;
  }
  return null;
}

function isValidYmd(y: string, m: string, d: string): boolean {
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

export function normalizeIsin(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const value = raw.trim().toUpperCase();
  return /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(value) ? value : null;
}

export function cleanText(raw: string | undefined | null): string | null {
  if (raw === undefined || raw === null) return null;
  const value = raw.trim();
  return value === "" ? null : value;
}
