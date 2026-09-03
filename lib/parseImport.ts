import Papa from "papaparse";
import type { Celebrant } from "./models";

// The HRM export's column names vary by report, so we match loosely against
// a set of likely headers rather than requiring an exact schema.
const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "full name", "employee name", "staff name"],
  position: ["position", "role", "designation", "job title", "title"],
  unit: ["unit", "branch", "department", "outlet", "location", "store", "work location"],
  birthDate: ["birthday", "birth date", "date of birth", "dob"],
};

function normalizeHeader(h: string) {
  return h
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // camelCase -> "camel Case"
    .replace(/[_-]+/g, " ") // snake_case / kebab-case -> spaced
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function findField(row: Record<string, string>, aliases: string[]): string {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const match = keys.find((k) => normalizeHeader(k) === alias);
    if (match && row[match]) return row[match].trim();
  }
  return "";
}

// Accepts dates like "2026-03-05", "05/03/2026", "March 5", "5th March" and
// pulls out just the day-of-month, which is all the flyer template needs.
function extractDay(raw: string): number | null {
  if (!raw) return null;

  const isoMatch = raw.match(/\d{4}-(\d{2})-(\d{2})/);
  if (isoMatch) return parseInt(isoMatch[2], 10);

  const slashMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-]\d{2,4}$/);
  if (slashMatch) return parseInt(slashMatch[1], 10); // assumes DD/MM/YYYY, the common NG format

  const ordinalMatch = raw.match(/(\d{1,2})(st|nd|rd|th)?/);
  if (ordinalMatch) return parseInt(ordinalMatch[1], 10);

  return null;
}

export type ImportWarning = { row: number; reason: string };

export function parseCsvImport(csvText: string): {
  celebrants: Omit<Celebrant, "photoUrl" | "photoMatchedBy">[];
  warnings: ImportWarning[];
} {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const celebrants: Omit<Celebrant, "photoUrl" | "photoMatchedBy">[] = [];
  const warnings: ImportWarning[] = [];

  parsed.data.forEach((row, i) => {
    const name = findField(row, HEADER_ALIASES.name);
    const position = findField(row, HEADER_ALIASES.position);
    const unit = findField(row, HEADER_ALIASES.unit);
    const rawDate = findField(row, HEADER_ALIASES.birthDate);
    const birthDay = extractDay(rawDate);

    if (!name) {
      warnings.push({ row: i + 2, reason: "Missing name — row skipped" });
      return;
    }
    if (birthDay === null) {
      warnings.push({ row: i + 2, reason: `Could not read a birth day from "${rawDate}" — row skipped` });
      return;
    }

    celebrants.push({ name, position, unit, birthDay });
  });

  return { celebrants, warnings };
}

export function parseJsonImport(jsonText: string): {
  celebrants: Omit<Celebrant, "photoUrl" | "photoMatchedBy">[];
  warnings: ImportWarning[];
} {
  const warnings: ImportWarning[] = [];
  let raw: any[];
  try {
    const data = JSON.parse(jsonText);
    raw = Array.isArray(data) ? data : data.celebrants ?? data.employees ?? [];
  } catch {
    return { celebrants: [], warnings: [{ row: 0, reason: "Invalid JSON file" }] };
  }

  const celebrants: Omit<Celebrant, "photoUrl" | "photoMatchedBy">[] = [];

  raw.forEach((item, i) => {
    const flat: Record<string, string> = {};
    Object.entries(item).forEach(([k, v]) => (flat[k] = String(v ?? "")));

    const name = findField(flat, HEADER_ALIASES.name);
    const position = findField(flat, HEADER_ALIASES.position);
    const unit = findField(flat, HEADER_ALIASES.unit);
    const rawDate = findField(flat, HEADER_ALIASES.birthDate);
    const birthDay = extractDay(rawDate);

    if (!name) {
      warnings.push({ row: i + 1, reason: "Missing name — entry skipped" });
      return;
    }
    if (birthDay === null) {
      warnings.push({ row: i + 1, reason: `Could not read a birth day from "${rawDate}" — entry skipped` });
      return;
    }

    celebrants.push({ name, position, unit, birthDay });
  });

  return { celebrants, warnings };
}
