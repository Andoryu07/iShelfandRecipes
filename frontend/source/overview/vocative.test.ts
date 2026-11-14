import { describe, expect, it } from "vitest";
import { greetingFor, vocative } from "./vocative";

describe("vocative", () => {
  it.each([
    ["Ondřej", "Ondřeji"],
    ["Kateřina", "Kateřino"],
    ["Petr", "Petře"],
    ["Jan", "Jane"],
    ["Tomáš", "Tomáši"],
    ["Marek", "Marku"],
    ["Pavel", "Pavle"],
    ["Lukáš", "Lukáši"],
    ["Martin", "Martine"],
    ["David", "Davide"],
    ["Jakub", "Jakube"],
    ["Vojtěch", "Vojtěchu"],
    ["Jiří", "Jiří"],
    ["Marie", "Marie"],
    ["Lucie", "Lucie"],
    ["Jana", "Jano"],
    ["Honza", "Honzo"],
    ["Zdeněk", "Zdeňku"],
    ["Radek", "Radku"],
    ["Dagmar", "Dagmar"],
    ["Matěj", "Matěji"],
    ["Michal", "Michale"],
    ["Adam", "Adame"],
    ["Eliška", "Eliško"],
  ])("%s → %s", (name, expected) => {
    expect(vocative(name)).toBe(expected);
  });

  it("keeps names it cannot decline", () => {
    expect(vocative("Ivo")).toBe("Ivo");
    expect(vocative("")).toBe("");
  });

  it("picks the greeting by the hour", () => {
    expect(greetingFor(7)).toBe("morning");
    expect(greetingFor(13)).toBe("day");
    expect(greetingFor(21)).toBe("evening");
    expect(greetingFor(2)).toBe("evening");
  });
});
