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
    expect(FILE_KIND_MESSAGES.zip).toContain("erneut aus der App bzw. dem Webportal Ihres Brokers herunter");
    expect(FILE_KIND_MESSAGES.zip).toContain("ohne ihn vorher in Excel zu öffnen und zu speichern");
    expect(FILE_KIND_MESSAGES.zip).not.toContain("Speichern unter");
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

describe("UTF-16 mit BOM", () => {
  const utf16leWithBom = (text: string) => {
    const bytes = [0xff, 0xfe];
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      bytes.push(code & 0xff, code >> 8);
    }
    return new Uint8Array(bytes);
  };

  test("UTF-16 LE mit BOM FF FE ist Text und wird ohne BOM dekodiert", () => {
    const bytes = new Uint8Array([
      0xff, 0xfe, 0x44, 0x00, 0x61, 0x00, 0x74, 0x00, 0x75, 0x00, 0x6d, 0x00, 0x3b, 0x00, 0x54, 0x00, 0x79, 0x00, 0x70, 0x00,
      0x0d, 0x00, 0x0a, 0x00,
    ]);
    expect(detectFileKind(bytes)).toBe("text");
    expect(decodeCsvBytes(bytes)).toBe("Datum;Typ\r\n");
  });

  test("UTF-16 BE mit BOM FE FF: Umlaut ü (00 FC) und Euro-Zeichen (20 AC) bleiben erhalten", () => {
    const bytes = new Uint8Array([
      0xfe, 0xff, 0x00, 0x47, 0x00, 0x65, 0x00, 0x62, 0x00, 0xfc, 0x00, 0x68, 0x00, 0x72, 0x00, 0x3b, 0x00, 0x31, 0x00, 0x30,
      0x00, 0x20, 0x20, 0xac,
    ]);
    expect(detectFileKind(bytes)).toBe("text");
    expect(decodeCsvBytes(bytes)).toBe("Gebühr;10 €");
  });

  test("UTF-16 LE: Euro-Zeichen U+20AC steht als AC 20", () => {
    const bytes = new Uint8Array([0xff, 0xfe, 0x31, 0x00, 0x30, 0x00, 0x20, 0x00, 0xac, 0x20]);
    expect(decodeCsvBytes(bytes)).toBe("10 €");
  });

  test("UTF-16 ohne BOM bleibt wegen der Nullbytes eine Binärdatei", () => {
    const bytes = new Uint8Array([0x44, 0x00, 0x61, 0x00, 0x74, 0x00, 0x75, 0x00, 0x6d, 0x00]);
    expect(detectFileKind(bytes)).toBe("binary");
  });

  test("BOM FF FE vor Null-Codeeinheiten ist eine Binärdatei", () => {
    expect(detectFileKind(new Uint8Array([0xff, 0xfe, 0x00, 0x00, 0x01, 0x00, 0x02, 0x00]))).toBe("binary");
  });

  test("BOM FF FE mit 1 Steuerzeichen unter 10 Codeeinheiten (10 % > 5 %) ist eine Binärdatei", () => {
    const bytes = new Uint8Array([
      0xff, 0xfe, 0x01, 0x00, 0x41, 0x00, 0x41, 0x00, 0x41, 0x00, 0x41, 0x00, 0x41, 0x00, 0x41, 0x00, 0x41, 0x00, 0x41, 0x00,
      0x41, 0x00,
    ]);
    expect(detectFileKind(bytes)).toBe("binary");
  });

  test("Datei nur aus einer UTF-16-BOM ist leer", () => {
    expect(detectFileKind(new Uint8Array([0xff, 0xfe]))).toBe("empty");
    expect(detectFileKind(new Uint8Array([0xfe, 0xff]))).toBe("empty");
  });

  test("Scalable-Export als UTF-16 LE wird erkannt und eingelesen", () => {
    const bytes = utf16leWithBom(
      "date;time;status;reference;description;assetType;type;isin;shares;price;amount;fee;tax;currency\r\n" +
        '2026-01-06;08:00:00;Executed;"SCALTEST00002";"Testfonds Welt UCITS ETF";Security;Buy;IE00TEST0001;10;80,00;-800,99;0,99;0,00;EUR\r\n',
    );
    expect(bytes.subarray(0, 4)).toEqual(new Uint8Array([0xff, 0xfe, 0x64, 0x00]));
    expect(detectFileKind(bytes)).toBe("text");
    const result = parseBrokerCsv(decodeCsvBytes(bytes));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.broker).toBe("scalable");
    expect(result.transactions.map((t) => `${t.type} ${t.shares} ${t.amount}`)).toEqual(["buy 10 -800.99"]);
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
