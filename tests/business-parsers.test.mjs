import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => vite.close());

test("reads Rebeca's corrected September 21 billing values without substituting yesterday's amount", async () => {
  const { parseBillingReport, billingReconciliationError } = await vite.ssrLoadModule("/app/billing-parser.ts");
  const report = `
    Clientes normales / DAI USD 310.000 $ 233.451,44
    Servicios especiales / Regulatorio (Lilibeth) USD 30.000 $ 21.740
    Servicios adicionales USD 20.000 $ 8454,20
    TOTAL COMBINADO USD 360.000 263.645,64
    USD facturado hoy 16.659.80 14.716,60 USD 10.333,33/día
    USD facturado acumulado mes 263.645,64 246744.44 USD 365
    Trámites facturados hoy 52 42
  `;
  const analysis = parseBillingReport(report);
  assert.ok(analysis);
  assert.equal(analysis.daiAccumulatedCents, 23_345_144);
  assert.equal(analysis.regulatoryAccumulatedCents, 2_174_000);
  assert.equal(analysis.extrasAccumulatedCents, 845_420);
  assert.equal(analysis.invoicedTodayCents, 1_665_980);
  assert.equal(analysis.invoicesToday, 52);
  assert.match(billingReconciliationError(report, analysis), /241\.40/);
  assert.equal(billingReconciliationError(report.replace("246744.44", "246985.84"), analysis), null);
});

test("does not borrow yesterday's amount when today's billing token is invalid", async () => {
  const { parseBillingReport } = await vite.ssrLoadModule("/app/billing-parser.ts");
  const analysis = parseBillingReport(`
    Clientes normales / DAI USD 310.000 $ 233.451,44
    Servicios especiales / Regulatorio USD 30.000 $ 21.740
    Servicios adicionales USD 20.000 $ 8454,20
    USD facturado hoy 16.659.80.80 14.716,60
    Trámites facturados hoy 52 42
  `);
  assert.equal(analysis, null);
});

test("reads the current executive accounts-receivable format", async () => {
  const { parseFinancialReport } = await vite.ssrLoadModule("/app/financial-parser.ts");
  const analysis = parseFinancialReport(`
    Reporte ejecutivo de cuentas por cobrar
    Corte al 11 de septiembre de 2026
    SALDO CONTABLE $ 720.861,62
    COBROS PENDIENTES $ 47.775,42
    CARTERA PROYECTADA $ 673.086,20
    Cuentas por cobrar al 06/09/2026 $ 738.999,37
    Menos: ingresos del 07 al 10/09/2026 ($ 216.609,29)
    Más: facturación del 07 al 10/09/2026 $ 198.471,54
    Saldo contable al 11/09/2026 $ 720.861,62
    Menos: cobros confirmados pendientes ($ 47.775,42)
    Cartera neta proyectada $ 673.086,20
  `);
  assert.ok(analysis);
  assert.equal(analysis.accountingPortfolioCents, 72_086_162);
  assert.equal(analysis.effectiveCollectionsCents, 21_660_929);
  assert.equal(analysis.newBillingCents, 19_847_154);
  assert.equal(analysis.confirmedPendingCents, 4_777_542);
  assert.equal(analysis.projectedPortfolioCents, 67_308_620);
  assert.equal(analysis.overduePendingCents, 0);
});

test("reads the commercial KPI table without confusing thousands and decimals", async () => {
  const { parseCommercialReport } = await vite.ssrLoadModule("/app/commercial-parser.ts");
  const analysis = parseCommercialReport(`
    TABLERO EJECUTIVO – GERENCIA COMERCIAL
    Facturación Comercial (USD)\n$ 14,874.80\n$ 150,448.00\nUSD 310.000
    Pedidos / Despachos (DAI)\n24\n350\n1.100 pedidos
    Nuevos Clientes Captados\n1\n4
    Licitaciones Activas (Cantidad)\n0\n4
    Licitaciones Ganadas / Cerradas\n0\n0
  `);
  assert.ok(analysis);
  assert.equal(analysis.billedAccumulatedCents, 15_044_800);
  assert.equal(analysis.ordersToday, 24);
  assert.equal(analysis.ordersAccumulated, 350);
  assert.equal(analysis.ordersGoal, 1100);
  assert.equal(analysis.newClientsAccumulated, 4);
});

test("reads the dispatch KPI table", async () => {
  const { parseDispatchReport } = await vite.ssrLoadModule("/app/dispatch-parser.ts");
  const analysis = parseDispatchReport(`
    REPORTE DIARIO - DESPACHO Y AGENCIA DE ADUANA
    Referencias vivas (inventario activo)\n418\n423
    Refs sin ETA ni refrendo (riesgo alto)\n18\n28
    Tramites listos ECUASIGAD - facturar HOY\n31\n29
    Tramites culminados por remitir\n35\n29
    Indicador general de cumplimiento 76,7%
    Grupo Wong pendientes 11
  `);
  assert.ok(analysis);
  assert.equal(analysis.referencesLive, 418);
  assert.equal(analysis.highRisk, 18);
  assert.equal(analysis.readyToInvoice, 31);
  assert.equal(analysis.completedPending, 35);
  assert.equal(analysis.complianceBasisPoints, 7670);
  assert.equal(analysis.groupWongPending, 11);
  assert.equal(analysis.completeness, 6);
});

test("reads the September 14 daily accounts-receivable format", async () => {
  const { parseFinancialReport } = await vite.ssrLoadModule("/app/financial-parser.ts");
  const analysis = parseFinancialReport(`
    REPORTE DIARIO
    Cuentas por cobrar
    Corte al 14 de septiembre de 2026, 09h28
    CARTERA TOTAL AL CORTE $ 690.430,31
    INGRESOS DE LA SEMANA $ 267.383,58
    PENDIENTE DE INGRESAR $ 6.245,27
  `);
  assert.ok(analysis);
  assert.equal(analysis.accountingPortfolioCents, 69_043_031);
  assert.equal(analysis.effectiveCollectionsCents, 26_738_358);
  assert.equal(analysis.confirmedPendingCents, 624_527);
  assert.equal(analysis.projectedPortfolioCents, 68_418_504);
  assert.equal(analysis.warnings.length, 2);
});

test("reads Bryan's September 25 daily cash-control format", async () => {
  const { parseFinancialReport } = await vite.ssrLoadModule("/app/financial-parser.ts");
  const analysis = parseFinancialReport(`
    MACOBSA CONTROL DIARIO GERENCIAL - 25 DE SEPTIEMBRE DE 2026
    Ingresos registrados 24/09/2026 $ 29.967,85
    Disponibilidad bancaria total $ 15.879,78
    Cobros confirmados pendientes de ingresar $ 73.040,44
    Ingresos registrados + cobros confirmados $ 103.008,29
  `);
  assert.ok(analysis);
  assert.equal(analysis.format, "cash_control");
  assert.equal(analysis.effectiveCollectionsCents, 2_996_785);
  assert.equal(analysis.accountingPortfolioCents, 1_587_978);
  assert.equal(analysis.confirmedPendingCents, 7_304_044);
  assert.equal(analysis.projectedPortfolioCents, 10_300_829);
  assert.deepEqual(analysis.warnings, []);
});

test("prefers the updated accounting balance in the September 4 report", async () => {
  const { parseFinancialReport } = await vite.ssrLoadModule("/app/financial-parser.ts");
  const analysis = parseFinancialReport(`
    INFORME GERENCIAL DE CARTERA
    Cartera contable estimada al 03/09 de $889,231.91
    Ingresos efectivos 03/09 ($218,662.27)
    Nueva facturación incorporada 04/09 $23,959.48
    Cartera contable actualizada $694,529.12
    Cobros confirmados pendientes 04/09 $41,716.94
    Cartera proyectada posterior $652,812.18
  `);
  assert.ok(analysis);
  assert.equal(analysis.accountingPortfolioCents, 69_452_912);
  assert.equal(analysis.projectedPortfolioCents, 65_281_218);
});

test("reads the El Rosado control dashboard and its explicit exceptions", async () => {
  const { parseInhouseReport } = await vite.ssrLoadModule("/app/inhouse-parser.ts");
  const analysis = parseInhouseReport(`
    Control Grupo El Rosado
    Nacionalización · MACOBSA
    Envío DAV meta: cumple >= 3 días antes del arribo
    85 cumple 21 fuera de meta 121 sin datos aún
    Checklist meta: emitido en <= 1 día hábil
    63 cumple 0 fuera de meta 164 sin datos aún
    1 trámite arribaron hace más de 7 días sin salida autorizada
    4 trámites tienen salida autorizada hace más de 5 días y siguen sin retirarse
  `);
  assert.ok(analysis);
  assert.equal(analysis.davPending, 21);
  assert.equal(analysis.checklistPending, 0);
  assert.equal(analysis.urgentDav, 1);
  assert.equal(analysis.readyForPickup, 4);
  assert.equal(analysis.storageAlerts, 0);
  assert.equal(analysis.completeness, 5);
});

test("classifies a legacy inhouse spreadsheet export as documentary evidence", async () => {
  const { processStoredReport } = await vite.ssrLoadModule("/app/report-processing.ts");
  const result = processStoredReport("Inhouse El Rosado", `
    ORDEN RAZON SOCIAL PROVEEDOR OPERACION CONSOLIDADO
    ESTADO POR NACIONALIZAR RESPONSABLE CO REVISADO
    F/RECEPCION DE TRAMITE F/CHECK LIST F/ENVÍO DE REPORTE DAI
    2606257 CORP EL ROSADO A ESPERA DE APROBACION DAV
  `);
  assert.equal(result.status, "processed_documental");
});
