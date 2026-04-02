import { describe, expect, it } from "vitest";

import {
  assertStrictFail,
  assertStrictPass,
  createSignedFixture,
  parseCliArgs,
  runNodeStrict,
  signatureStatus,
} from "./conformance-test-signature.mjs";

describe("conformance-test-signature", () => {
  it("parses cli args", () => {
    const parsed = parseCliArgs([
      "node",
      "scripts/conformance-test-signature.mjs",
      "--packDir",
      "conformance/golden-full",
      "--skipPython",
      "--skipGo",
      "--keepTmp",
      "--json",
    ]);
    expect(parsed.packDir).toContain("conformance/golden-full");
    expect(parsed.skipPython).toBe(true);
    expect(parsed.skipGo).toBe(true);
    expect(parsed.keepTmp).toBe(true);
    expect(parsed.jsonMode).toBe(true);
  });

  it("passes strict signature on signed fixture and fails after tamper", () => {
    const fixture = createSignedFixture("conformance/golden-full");
    const env = { ...process.env, AQ_MANIFEST_PUBLIC_KEY: fixture.publicKeyB64 };
    try {
      const passResult = runNodeStrict(fixture.fixtureDir, env);
      assertStrictPass(passResult);
      expect(signatureStatus(passResult.parsed)).toBe("pass");

      fixture.tamperManifest();
      const failResult = runNodeStrict(fixture.fixtureDir, env);
      assertStrictFail(failResult);
      expect(signatureStatus(failResult.parsed)).toBe("fail");
    } finally {
      fixture.cleanup();
    }
  }, 15_000);
});
