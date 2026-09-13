import { describe, expect, it } from "vitest";

import { GLOSSARY_ENTRIES, getGlossaryEntry } from "./glossary";

describe("glossary source", () => {
  it("resolves an entry by id with its exact title and body", () => {
    expect(getGlossaryEntry("kp-index")).toEqual({
      id: "kp-index",
      title: "Kp index",
      body: expect.stringMatching(
        /planetary geomagnetic activity index on a 0–9 scale/i,
      ),
    });
  });

  it("returns undefined for an id with no entry", () => {
    expect(getGlossaryEntry("not-a-term")).toBeUndefined();
  });

  it("covers the live-banner terms as well as the product-page terms", () => {
    // Every id the app hands to GlossaryTerm must resolve, or its popup has
    // nothing to show. The live banner links to these expert terms.
    for (const id of [
      "interplanetary-magnetic-field",
      "bz-gsm",
      "hemispheric-power",
      "dst-index",
    ]) {
      expect(getGlossaryEntry(id), `missing glossary entry for ${id}`).toBeDefined();
    }
  });

  it("covers the Aurora guide's terms under their CONTEXT.md titles", () => {
    // Ticket 09: the guide narrates these terms, so they graduated from
    // CONTEXT.md into the Explainers glossary – one source, no redefinition.
    for (const [id, title] of [
      ["solar-wind", "Solar wind"],
      ["night", "Night"],
      ["oval", "Oval"],
      ["view-distance", "View distance"],
    ] as const) {
      expect(getGlossaryEntry(id), `missing glossary entry for ${id}`).toBeDefined();
      expect(getGlossaryEntry(id)!.title).toBe(title);
    }
  });

  it("gives every entry a unique, non-empty id", () => {
    const ids = GLOSSARY_ENTRIES.map((entry) => entry.id);
    expect(ids.every((id) => id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
