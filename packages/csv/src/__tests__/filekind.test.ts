import { describe, expect, test } from "vitest";
import { decodeCsvBytes, detectFileKind, FILE_KIND_MESSAGES } from "../filekind";
import { parseBrokerCsv, PDF_FILE_MESSAGE } from "../index";

const utf8 = (text: string) => new TextEncoder().encode(text);

describe("detectFileKind", () => {
  test("leere Datei", () => {
    expect(detectFileKind(new Uint8Array(0))).toBe("empty");
  });

  test("PDF an der Signatur %PDF-", () => {
    expect(detectFileKind(utf8("%PDF-1.7\n%âãÏÓ\n1 0 obj"))).toBe("pdf");
  });

  test("ZIP und xlsx an der Signatur PK", () => {
    expect(detectFileKind(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]))).toBe("zip");
  });

  test("Nullbytes gelten als Binärdatei", () => {
    const bytes = new Uint8Array([0x64, 0x61, 0x74, 0x65, 0x00, 0x2c, 0x00]);
    expect(detectFileKind(bytes)).toBe("binary");
  });

  test("hoher Anteil Steuerzeichen gilt als Binärdatei", () => {
    const bytes = new Uint8Array(100);
    bytes.fill(0x41);
    for (let i = 0; i < 10; i += 1) bytes[i] = 0x01;
    expect(detectFileKind(bytes)).toBe("binary");
  });

  test("CSV mit BOM, Tab, CR und LF ist Text", () => {
    expect(detectFileKind(utf8("﻿datum;typ\t\r\n2026-01-05;Kauf\r\n"))).toBe("text");
  });

  test("Windows-1252-Bytes mit Umlauten sind Text", () => {
    const bytes = new Uint8Array([0x47, 0x65, 0x62, 0xfc, 0x68, 0x72, 0x3b, 0x31, 0x2c, 0x35, 0x0a]);
    expect(detectFileKind(bytes)).toBe("text");
  });

  test("jede Nicht-Text-Art hat eine deutsche Meldung", () => {
    expect(FILE_KIND_MESSAGES.pdf).toContain("PDF");
    expect(FILE_KIND_MESSAGES.zip).toContain("Excel");
    expect(FILE_KIND_MESSAGES.binary).toContain("Textdatei");
    expect(FILE_KIND_MESSAGES.empty).toBe("Die Datei ist leer.");
  });
});

describe("decodeCsvBytes", () => {
  test("UTF-8 mit BOM wird ohne BOM dekodiert", () => {
    expect(decodeCsvBytes(utf8("﻿Gebühr;1,5"))).toBe("Gebühr;1,5");
  });

  test("Windows-1252 fällt auf Latin-Dekodierung zurück", () => {
    const bytes = new Uint8Array([0x47, 0x65, 0x62, 0xfc, 0x68, 0x72, 0x3b, 0x31, 0x2c, 0x35]);
    expect(decodeCsvBytes(bytes)).toBe("Gebühr;1,5");
  });

  test("Euro-Zeichen in UTF-8 bleibt erhalten", () => {
    expect(decodeCsvBytes(utf8("Betrag;10 €"))).toBe("Betrag;10 €");
  });
});

describe("parseBrokerCsv mit PDF-Inhalt", () => {
  test("bricht mit der PDF-Meldung ab statt Spalten zu raten", () => {
    const result = parseBrokerCsv("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe(PDF_FILE_MESSAGE);
    expect(result.error).toContain("Transaktionsexport");
  });
});
