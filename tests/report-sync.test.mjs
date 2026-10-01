import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("serves extracted evidence instead of a 404 when the R2 object is unavailable", async () => {
  const source = await readFile(new URL("../app/api/report-uploads/[id]/route.ts", import.meta.url), "utf8");
  assert.match(source, /x-macobsa-evidence-fallback/);
  assert.match(source, /new Response\(report\.extractedText/);
});

test("preserves R2 after the D1 report metadata has been stored", async () => {
  const source = await readFile(new URL("../app/api/report-uploads/route.ts", import.meta.url), "utf8");
  assert.match(source, /if \(!metadataStored\) \{\s*await getBucket\(\)\.delete\(objectKey\)/);
  assert.match(source, /processingStatus: "failed"/);
});

test("gates controlled legacy processing on exactly 26 reports", async () => {
  const source = await readFile(new URL("../app/api/audit/legacy/process/route.ts", import.meta.url), "utf8");
  assert.match(source, /EXPECTED_LEGACY_REPORTS = 26/);
  assert.match(source, /PROCESS-26-LEGACY-V57/);
  assert.match(source, /WHERE processing_status = 'legacy'/);
});
