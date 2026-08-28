/**
 * Minimal CSV parser for the sample data in /data. Handles quoted
 * fields with embedded commas (e.g. `"Microsoft (CBRE) – Des Moines, IA"`)
 * but not embedded newlines or escaped quotes — the sample CSVs don't
 * need more than that. Not meant as a general-purpose CSV library.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(field);
      field = "";
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      if (header) row[header] = (values[i] ?? "").trim();
    });
    return row;
  });
}

export type RosterPerson = {
  name: string;
  email: string;
  position: string;
  site: string;
  mainSite: string;
  date: string;
  time: string;
  phone: string;
  money: string;
  shift: string;
  avatar: string;
};

export function toRosterPeople(rows: Record<string, string>[]): RosterPerson[] {
  return rows.map((row) => ({
    name: row["Name"] ?? "",
    email: row["Email"] ?? "",
    position: row["Position"] ?? "",
    site: row["Site"] ?? "",
    mainSite: row["Main"] ?? "",
    date: row["Date"] ?? "",
    time: row["Time"] ?? "",
    phone: row["Phone"] ?? "",
    money: row["Money"] ?? "",
    shift: row["Shift"] ?? "",
    avatar: row["Avatar"] ?? "",
  }));
}
