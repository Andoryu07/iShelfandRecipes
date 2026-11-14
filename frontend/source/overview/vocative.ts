const exceptions: Record<string, string> = {
  jiří: "Jiří",
  marie: "Marie",
  lucie: "Lucie",
  julie: "Julie",
  natálie: "Natálie",
  amálie: "Amálie",
  sofie: "Sofie",
  emilie: "Emilie",
  rozálie: "Rozálie",
  zdeněk: "Zdeňku",
  luděk: "Luďku",
  radek: "Radku",
  marek: "Marku",
  pavel: "Pavle",
  karel: "Karle",
  petr: "Petře",
  alexandr: "Alexandře",
  dagmar: "Dagmar",
  ester: "Ester",
  karin: "Karin",
  miriam: "Miriam",
  ingrid: "Ingrid",
  nikol: "Nikol",
  kristýna: "Kristýno",
  ivo: "Ivo",
  oto: "Oto",
  hugo: "Hugo",
  leo: "Leo",
  jindřich: "Jindřichu",
  vojtěch: "Vojtěchu",
  oldřich: "Oldřichu",
  bedřich: "Bedřichu",
};

function matchCase(original: string, result: string): string {
  return original.charAt(0) === original.charAt(0).toUpperCase()
    ? result.charAt(0).toUpperCase() + result.slice(1)
    : result;
}

export function vocative(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return trimmed;
  }
  const lower = trimmed.toLowerCase();
  if (exceptions[lower]) {
    return exceptions[lower];
  }
  if (/(ie|e|ě|í|y|i|o|u|ů)$/.test(lower)) {
    return trimmed;
  }
  if (/a$/.test(lower)) {
    return trimmed.slice(0, -1) + "o";
  }
  if (/ek$/.test(lower)) {
    return matchCase(trimmed, trimmed.slice(0, -2) + "ku");
  }
  if (/(ch|h|k|g)$/.test(lower)) {
    return trimmed + "u";
  }
  if (/[jšžčřcťďň]$/.test(lower)) {
    return trimmed + "i";
  }
  if (/[bdflmnprstvzx]$/.test(lower)) {
    return trimmed + "e";
  }
  return trimmed;
}

export function greetingFor(hour: number): "morning" | "day" | "evening" {
  if (hour >= 4 && hour < 10) {
    return "morning";
  }
  if (hour >= 18 || hour < 4) {
    return "evening";
  }
  return "day";
}
