const PLANTNET_BASE = "https://my-api.plantnet.org/v2/identify";

export type PlantNetOrgan =
  | "auto"
  | "leaf"
  | "flower"
  | "fruit"
  | "bark"
  | "habit"
  | "branch"
  | "other";

export type PlantNetSpecies = {
  scientificNameWithoutAuthor?: string;
  scientificNameAuthorship?: string;
  family?: { scientificNameWithoutAuthor?: string; scientificName?: string } | null;
  genus?: { scientificNameWithoutAuthor?: string } | null;
  commonNames?: string[];
  [k: string]: unknown;
};

export type PlantNetResultItem = {
  score: number;
  species: PlantNetSpecies;
};

export type PlantNetIdentifyResponse = {
  bestMatch?: string;
  results?: PlantNetResultItem[];
  [k: string]: unknown;
};

const ALLOWED_ORGANS = new Set<PlantNetOrgan>([
  "auto",
  "leaf",
  "flower",
  "fruit",
  "bark",
  "habit",
  "branch",
  "other"
]);

export function normalizeOrgan(organ: string | null | undefined): PlantNetOrgan {
  if (!organ) return "auto";
  const o = organ.toLowerCase().trim() as PlantNetOrgan;
  if (ALLOWED_ORGANS.has(o)) return o;
  return "auto";
}

function pickScientificName(species: PlantNetSpecies): string {
  const main = species.scientificNameWithoutAuthor;
  if (main && String(main).trim()) return String(main).trim();
  const nested =
    (species as { species?: { scientificNameWithoutAuthor?: string } }).species
      ?.scientificNameWithoutAuthor;
  if (nested) return String(nested).trim();
  return "Unknown";
}

function pickFamily(species: PlantNetSpecies): string | null {
  const f = species.family;
  if (!f) return null;
  if (typeof f === "string") return f;
  return f.scientificNameWithoutAuthor ?? f.scientificName ?? null;
}

/**
 * Pl@ntNet v2: multipart 画像 1 枚、同一個体想定
 */
export async function identifyWithPlantNet(params: {
  project: string;
  apiKey: string;
  organ: PlantNetOrgan;
  imageBuffer: ArrayBuffer;
  fileName: string;
  contentType: string;
}): Promise<PlantNetIdentifyResponse> {
  const { project, apiKey, organ, imageBuffer, fileName, contentType } = params;
  const url = new URL(`${PLANTNET_BASE}/${encodeURIComponent(project)}`);
  url.searchParams.set("api-key", apiKey);

  const form = new FormData();
  const blob = new Blob([imageBuffer], { type: contentType || "image/jpeg" });
  form.append("images", new File([blob], fileName, { type: contentType || "image/jpeg" }));
  form.append("organs", organ === "auto" || organ === "other" ? "auto" : organ);

  const res = await fetch(url.toString(), {
    method: "POST",
    body: form
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(
      `Pl@ntNet API error: ${res.status} ${res.statusText}${t ? ` — ${t.slice(0, 500)}` : ""}`
    );
  }

  return (await res.json()) as PlantNetIdentifyResponse;
}

export function extractTopResults(
  data: PlantNetIdentifyResponse,
  max = 5
): Array<{
  scientificName: string;
  family: string | null;
  score: number;
  speciesJson: string;
}> {
  const list = (data.results ?? [])
    .filter((r) => r && typeof r.score === "number" && r.species)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);

  return list.map((r) => {
    const species = r.species;
    return {
      scientificName: pickScientificName(species),
      family: pickFamily(species),
      score: r.score,
      speciesJson: JSON.stringify(r.species)
    };
  });
}
