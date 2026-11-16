import { describe, expect, it } from "vitest";
import { buildCsv } from "./csv";

describe("buildCsv", () => {
  it("uses semicolons, decimal commas and quotes where needed", () => {
    const csv = buildCsv(
      ["Název", "Cena"],
      [
        ["Mléko; polotučné", 24.9],
        ['Sýr "Eidam"', null],
      ],
    );

    expect(csv).toBe('﻿Název;Cena\r\n"Mléko; polotučné";24,9\r\n"Sýr ""Eidam""";\r\n');
  });
});
