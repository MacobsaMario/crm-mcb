import assert from "node:assert/strict";
import test from "node:test";

test("reconciles source totals and surfaces source date conflicts as warnings", async () => {
  const { validateGrupoPicaData } = await import(new URL("../app/grupo-pica-integrity.ts", import.meta.url));
  const validated = validateGrupoPicaData();
  assert.equal(validated.ok, true, validated.issues.join("\n"));
  assert.equal(validated.checkedRows, 460);
  assert.equal(validated.warnings.length, 2);
  assert.ok(validated.warnings.every((warning) => warning.includes("campos repetidos en conflicto")));

  const invalid = validateGrupoPicaData(undefined, undefined, "2026-09-01");
  assert.equal(invalid.ok, false);
  assert.ok(invalid.issues.some((issue) => issue.includes("posterior al corte oficial")));
});
