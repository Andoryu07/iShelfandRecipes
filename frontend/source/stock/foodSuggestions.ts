import type { FoodCategory, MeasurementUnit } from "../api/types";

interface FoodSuggestion {
  category: FoodCategory;
  baseUnit: MeasurementUnit;
  genericName: string;
}

const rules: { stems: string[]; excludes?: string[]; suggestion: FoodSuggestion }[] = [
  { stems: ["mlek"], suggestion: { category: "dairy", baseUnit: "milliliter", genericName: "Mléko" } },
  { stems: ["smetan"], suggestion: { category: "dairy", baseUnit: "milliliter", genericName: "Smetana" } },
  { stems: ["jogurt"], suggestion: { category: "dairy", baseUnit: "piece", genericName: "Jogurt" } },
  { stems: ["tvaroh"], suggestion: { category: "dairy", baseUnit: "gram", genericName: "Tvaroh" } },
  { stems: ["masl"], suggestion: { category: "dairy", baseUnit: "gram", genericName: "Máslo" } },
  {
    stems: ["syr", "eidam", "gouda", "mozzarel", "hermelin", "parmazan", "cottage", "niva", "emental"],
    suggestion: { category: "dairy", baseUnit: "gram", genericName: "Sýr" },
  },
  { stems: ["vejce", "vajic"], suggestion: { category: "other", baseUnit: "piece", genericName: "Vejce" } },
  { stems: ["chleb"], suggestion: { category: "bakery", baseUnit: "gram", genericName: "Chléb" } },
  {
    stems: ["rohlik", "houska", "bageta", "kaiser", "croissant", "stangl"],
    suggestion: { category: "bakery", baseUnit: "piece", genericName: "Pečivo" },
  },
  { stems: ["knedlik"], suggestion: { category: "bakery", baseUnit: "piece", genericName: "Knedlík" } },
  {
    stems: ["kure", "kuraci", "krut", "vepr", "hovez", "telec", "mlete maso", "maso", "steak"],
    suggestion: { category: "meatAndSausages", baseUnit: "gram", genericName: "Maso" },
  },
  {
    stems: ["sunk", "salam", "park", "klobas", "slanin", "uzen", "spekac"],
    suggestion: { category: "meatAndSausages", baseUnit: "gram", genericName: "Uzeniny" },
  },
  {
    stems: ["losos", "tunak", "ryb", "treska", "kapr", "pstruh"],
    suggestion: { category: "fish", baseUnit: "gram", genericName: "Ryba" },
  },
  {
    stems: [
      "jablk",
      "banan",
      "pomeranc",
      "mandarin",
      "citron",
      "hrusk",
      "hroznov",
      "jahod",
      "boruvk",
      "kiwi",
      "meloun",
    ],
    suggestion: { category: "fruit", baseUnit: "gram", genericName: "Ovoce" },
  },
  {
    stems: [
      "mrkev",
      "brambor",
      "cibul",
      "rajc",
      "paprika",
      "okurk",
      "salat",
      "cesnek",
      "zeli",
      "brokolic",
      "cuket",
      "celer",
      "petrzel",
    ],
    excludes: ["mlet"],
    suggestion: { category: "vegetables", baseUnit: "gram", genericName: "Zelenina" },
  },
  {
    stems: ["testovin", "spaget", "penne"],
    suggestion: { category: "dryGoods", baseUnit: "gram", genericName: "Těstoviny" },
  },
  { stems: ["ryze"], suggestion: { category: "dryGoods", baseUnit: "gram", genericName: "Rýže" } },
  { stems: ["mouk"], suggestion: { category: "dryGoods", baseUnit: "gram", genericName: "Mouka" } },
  { stems: ["cukr"], suggestion: { category: "dryGoods", baseUnit: "gram", genericName: "Cukr" } },
  {
    stems: ["ovesn", "musli", "cornflakes", "lusteni", "cocka", "fazol"],
    suggestion: { category: "dryGoods", baseUnit: "gram", genericName: "" },
  },
  {
    stems: ["konzerv", "protlak", "kukurice v", "loupana rajcata"],
    suggestion: { category: "canned", baseUnit: "gram", genericName: "" },
  },
  {
    stems: ["mrazen", "zmrzlin", "hranolk"],
    suggestion: { category: "frozen", baseUnit: "gram", genericName: "" },
  },
  { stems: ["olej"], suggestion: { category: "other", baseUnit: "milliliter", genericName: "Olej" } },
  {
    stems: ["voda", "dzus", "limonad", "cola", "pivo", "vino", "caj", "kava", "sirup", "napoj"],
    suggestion: { category: "beverages", baseUnit: "milliliter", genericName: "" },
  },
  {
    stems: [
      "sul",
      "pepr",
      "kmin",
      "majorank",
      "skorice",
      "oregano",
      "bazalk",
      "koreni",
      "paprika mleta",
      "mleta",
      "mlety",
    ],
    suggestion: { category: "spices", baseUnit: "gram", genericName: "" },
  },
  {
    stems: ["cokolad", "bonbon", "susenk", "oplatk", "tycink", "chips"],
    suggestion: { category: "sweets", baseUnit: "gram", genericName: "" },
  },
];

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

export function suggestFood(name: string): FoodSuggestion | null {
  const normalized = normalize(name);
  if (!normalized.trim()) {
    return null;
  }
  const matches = rules
    .filter((rule) => !rule.excludes?.some((excluded) => normalized.includes(excluded)))
    .flatMap((rule) =>
      rule.stems
        .filter((stem) => normalized.includes(stem))
        .map((stem) => ({ stem, suggestion: rule.suggestion })),
    );
  if (matches.length === 0) {
    return null;
  }
  return matches.sort((first, second) => second.stem.length - first.stem.length)[0].suggestion;
}
