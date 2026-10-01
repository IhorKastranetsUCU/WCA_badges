import { Competitor } from "@/types/competitor";

export function parseWcaName(rawName: string): { latin: string; local: string | null } {
  const cleaned = rawName.trim();
  const match = cleaned.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    return {
      latin: match[1].trim(),
      local: match[2].trim(),
    };
  }
  return { latin: cleaned, local: null };
}

const COUNTRY_MAP: Record<string, string> = {
  ukraine: "UA",
  "united states": "US",
  usa: "US",
  poland: "PL",
  germany: "DE",
  france: "FR",
  "united kingdom": "GB",
  canada: "CA",
  spain: "ES",
  italy: "IT",
  japan: "JP",
  china: "CN",
  brazil: "BR",
  australia: "AU",
};

export function parseClientCsv(csvText: string): Competitor[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Auto-detect delimiter: comma, semicolon, tab
  const sampleLine = lines[0];
  const countComma = (sampleLine.match(/,/g) || []).length;
  const countSemi = (sampleLine.match(/;/g) || []).length;
  const countTab = (sampleLine.match(/\t/g) || []).length;
  let delimiter = ",";
  if (countSemi > countComma && countSemi > countTab) delimiter = ";";
  else if (countTab > countComma && countTab > countSemi) delimiter = "\t";

  const header = lines[0].split(delimiter).map((c) => c.trim().toLowerCase().replace(/['"]/g, ""));
  let nameIdx = header.findIndex((h) => h.includes("name") && !h.includes("competitor"));
  if (nameIdx === -1) nameIdx = 0;
  const wcaIdIdx = header.findIndex((h) => h.includes("wca"));
  const countryIdx = header.findIndex((h) => h.includes("country") || h.includes("citizen"));

  const statusIndices: number[] = [];
  header.forEach((h, idx) => {
    if (h.includes("status") || h.includes("competing") || h.includes("registration") || h.includes("state")) {
      statusIndices.push(idx);
    }
  });

  const EXCLUDED_STATUSES = new Set([
    "d",
    "del",
    "deleted",
    "rejected",
    "cancelled",
    "canceled",
    "withdrawn",
    "declined",
    "dropped",
    "false",
    "no",
    "0",
    "unpaid",
    "not competing",
    "inactive",
    "removed",
  ]);

  const competitors: Competitor[] = [];
  let seq = 1;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols: string[] = [];
    let insideQuote = false;
    let entry = "";
    for (let charIdx = 0; charIdx < rawLine.length; charIdx++) {
      const char = rawLine[charIdx];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === delimiter && !insideQuote) {
        cols.push(entry.trim());
        entry = "";
      } else {
        entry += char;
      }
    }
    cols.push(entry.trim());

    // Filter out cancelled, rejected, or deleted registrations
    let isCancelled = false;
    for (const sIdx of statusIndices) {
      if (sIdx < cols.length) {
        const val = cols[sIdx].trim().toLowerCase();
        if (EXCLUDED_STATUSES.has(val)) {
          isCancelled = true;
          break;
        }
      }
    }
    if (isCancelled) continue;

    const rawName = cols[nameIdx] || "";
    if (!rawName) continue;

    const { latin, local } = parseWcaName(rawName);
    const rawWcaId = wcaIdIdx !== -1 && cols[wcaIdIdx] ? cols[wcaIdIdx] : null;
    const countryName = countryIdx !== -1 && cols[countryIdx] ? cols[countryIdx] : "Ukraine";

    let iso2 = "UA";
    const normCountry = countryName.toLowerCase();
    if (COUNTRY_MAP[normCountry]) {
      iso2 = COUNTRY_MAP[normCountry];
    } else if (countryName.length === 2) {
      iso2 = countryName.toUpperCase();
    }

    competitors.push({
      id: `comp-${seq}`,
      csv_index: seq,
      name_latin: latin,
      name_local: local,
      name_raw: rawName,
      wca_id: rawWcaId && rawWcaId.toLowerCase() !== "null" ? rawWcaId : null,
      country_iso2: iso2,
      country_name: countryName,
      role_id: "r-participant",
    });
    seq++;
  }

  return competitors;
}
