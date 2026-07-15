import ExcelJS from "exceljs";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { ImportRecipientsResult } from "../../../shared/types";

export async function generateTemplateBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Kişiler");
  sheet.columns = [
    { header: "numara", key: "numara", width: 20 },
    { header: "isim", key: "isim", width: 24 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.addRow({ numara: "905551234567", isim: "Ahmet Yılmaz" });
  sheet.addRow({ numara: "905339876543", isim: "Ayşe Kaya" });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function parseRecipientsFile(
  data: Buffer,
  defaultCountry: "TR" = "TR",
): Promise<ImportRecipientsResult> {
  const workbook = new ExcelJS.Workbook();
  // exceljs's bundled .d.ts predates @types/node's generic Buffer<TArrayBuffer>
  // alias, so the two "Buffer" types don't structurally match at the type
  // level even though they're identical at runtime.
  await workbook.xlsx.load(data as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { valid: [], invalid: [] };

  const columnIndex: Record<string, number> = {};
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const key = String(cell.value ?? "")
      .trim()
      .toLowerCase();
    if (key) columnIndex[key] = colNumber;
  });

  const phoneCol = columnIndex["numara"] ?? columnIndex["telefon"] ?? 1;
  const nameCol = columnIndex["isim"] ?? columnIndex["ad"] ?? 2;

  const result: ImportRecipientsResult = { valid: [], invalid: [] };
  const seenPhones = new Set<string>();

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const rawPhone = String(row.getCell(phoneCol).value ?? "").trim();
    const rawName = String(row.getCell(nameCol).value ?? "").trim();

    if (!rawPhone) continue;

    const parsed = parsePhoneNumberFromString(rawPhone, defaultCountry);
    if (!parsed || !parsed.isValid()) {
      result.invalid.push({ row: rowNumber, raw: rawPhone, reason: "Geçersiz numara" });
      continue;
    }

    const e164 = parsed.number.replace("+", "");
    if (seenPhones.has(e164)) {
      result.invalid.push({ row: rowNumber, raw: rawPhone, reason: "Tekrarlanan numara" });
      continue;
    }
    seenPhones.add(e164);

    result.valid.push({ row: rowNumber, phone: e164, name: rawName || null });
  }

  return result;
}
