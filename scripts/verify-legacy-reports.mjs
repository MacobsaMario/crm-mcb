import { createServer } from "vite";

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const reports = JSON.parse(Buffer.concat(chunks).toString("utf8"));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root: process.cwd(),
  server: { middlewareMode: true },
});

try {
  const { processStoredReport, REPORT_PARSER_VERSION } = await vite.ssrLoadModule("/app/report-processing.ts");
  const results = reports.map((report) => {
    const decision = processStoredReport(report.area, report.extracted_text ?? "");
    return {
      id: report.id,
      area: report.area,
      reportDate: report.report_date,
      originalName: report.original_name,
      sourceStatus: report.processing_status,
      decision: decision.status,
      warnings: decision.warnings,
      analysis: decision.analysis,
    };
  });
  process.stdout.write(JSON.stringify({ parserVersion: REPORT_PARSER_VERSION, results }));
} finally {
  await vite.close();
}
