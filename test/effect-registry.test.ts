import { describe, expect, it } from "vitest";
import {
  BUILTIN_EFFECT_NAMES,
  EFFECT_REGISTRY,
  dispatchBuiltinEffect,
  getEffectRegistration,
  isEffectName,
} from "../src/effect-registry";

describe("effect registry", () => {
  it("lists every built-in effect exactly once", () => {
    const namesFromRegistry = EFFECT_REGISTRY.map((entry) => entry.name);
    expect(namesFromRegistry).toEqual([...BUILTIN_EFFECT_NAMES]);
    expect(new Set(namesFromRegistry).size).toBe(BUILTIN_EFFECT_NAMES.length);
  });

  it.each(BUILTIN_EFFECT_NAMES.map((name) => [name] as const))(
    "registers %s with a mount function",
    (name) => {
      const entry = getEffectRegistration(name);
      expect(entry).toBeDefined();
      expect(typeof entry?.mount).toBe("function");
    },
  );

  it("rejects unknown effect names at dispatch time", () => {
    const root = document.createElement("div");
    expect(() => dispatchBuiltinEffect("not-a-real-effect", root)).toThrow(
      "Unknown effect: not-a-real-effect",
    );
  });

  it("recognizes built-in effect names", () => {
    for (const name of BUILTIN_EFFECT_NAMES) {
      expect(isEffectName(name)).toBe(true);
    }
    expect(isEffectName("unknown")).toBe(false);
  });
});
