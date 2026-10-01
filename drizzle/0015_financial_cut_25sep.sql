INSERT INTO `daily_report_uploads` (
  `area`, `report_date`, `responsible`, `original_name`, `object_key`,
  `mime_type`, `size_bytes`, `extracted_text`, `submitted_by`,
  `source_evidence`, `next_action`, `commitment_date`, `processing_status`,
  `processed_at`, `processing_error`, `parser_version`, `content_sha256`,
  `origin_type`, `reprocess_count`, `submitted_name`
)
SELECT
  'Facturación', '2026-09-24', 'Rebeca Sánchez',
  'MACOBSA Rebeca Facturacion  ..pdf',
  'static:/reports/MACOBSA_Rebeca_Facturacion_2026-09-24.pdf',
  'application/pdf', 4345168,
  'MACOBSA S.A. · Reporte Diario · Jefe de Facturación · Rebeca Sánchez
Fecha: 24/09/2026 Hora: 17:30
META SEPTIEMBRE — TOTAL FACTURACIÓN: USD 360.000
Clientes normales / DAI USD 310.000 $255.407,44
Servicios especiales / Regulatorio (Lilibeth) USD 30.000 $22.090
Servicios adicionales USD 20.000 $9.372,54
TOTAL COMBINADO USD 360.000 $286.869,98
USD facturado hoy $8.203,00
USD facturado acumulado mes $286.869,98
Trámites facturados hoy 33
Compromisos: seguimiento con operaciones para cierre de servicios e incremento de facturación diaria, cumplidos.
Próximas 24 horas: gestión enfocada en cierre de trámites y generación oportuna de facturación.',
  'rebeca@mariocoka.com', 'Archivo confirmado por la responsable y validado contra Comercial y Regulatorio.',
  'Mantener conciliados DAI, Regulatorio, Extras y trámites por facturar.',
  '2026-09-24', 'processed', CURRENT_TIMESTAMP, '',
  'macobsa-v80-2026-09-25',
  '4904e2eb4381e18013b4f66c6f4d0b01b6f6f8fdc050fbdeb4db5fe881a53b2f',
  'owner_verified_import', 0, 'Rebeca Sánchez'
WHERE NOT EXISTS (
  SELECT 1 FROM `daily_report_uploads`
  WHERE `area` = 'Facturación' AND `responsible` = 'Rebeca Sánchez'
    AND `report_date` = '2026-09-24'
);
--> statement-breakpoint
INSERT INTO `billing_snapshots` (
  `report_date`, `dai_accumulated_cents`, `regulatory_accumulated_cents`,
  `extras_accumulated_cents`, `invoiced_today_cents`, `invoices_today`,
  `ready_to_invoice`, `completed_pending`, `blocked`, `responsible`, `source`,
  `note`, `submitted_by`, `source_report_id`
)
SELECT
  '2026-09-24', 25540744, 2209000, 937254, 820300, 33,
  NULL, NULL, 0, 'Rebeca Sánchez', 'MACOBSA Rebeca Facturacion  ..pdf',
  'Corte confirmado por Rebeca y conciliado: DAI coincide con Comercial; Regulatorio coincide con el informe de Lilibeth; el total es la suma exacta de los tres rubros.',
  'rebeca@mariocoka.com',
  (SELECT `id` FROM `daily_report_uploads`
   WHERE `area` = 'Facturación' AND `responsible` = 'Rebeca Sánchez'
     AND `report_date` = '2026-09-24' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM `billing_snapshots`
  WHERE `report_date` = '2026-09-24' AND `dai_accumulated_cents` = 25540744
    AND `regulatory_accumulated_cents` = 2209000 AND `extras_accumulated_cents` = 937254
);
--> statement-breakpoint
INSERT INTO `financial_snapshots` (
  `report_date`, `accounting_portfolio_cents`, `effective_collections_cents`,
  `new_billing_cents`, `confirmed_pending_cents`, `overdue_pending_cents`,
  `projected_portfolio_cents`, `base_portfolio_cents`, `additional_potential_cents`,
  `report_date_label`, `warnings_json`, `responsible`, `source`, `submitted_by`,
  `source_report_id`
)
SELECT
  '2026-09-25', 1587978, 2996785, 0, 7304044, 0, 10300829,
  NULL, NULL, '25 DE SEPTIEMBRE DE 2026', '[]', 'Bryan Quinde',
  'Control_Diario_MACOBSA_25-09-2026.pdf', 'bquinde@mariocoka.com', 66
WHERE NOT EXISTS (
  SELECT 1 FROM `financial_snapshots` WHERE `source_report_id` = 66
);
--> statement-breakpoint
UPDATE `daily_report_uploads`
SET `processing_status` = 'processed',
    `processing_error` = '',
    `processed_at` = CURRENT_TIMESTAMP,
    `parser_version` = 'macobsa-v80-2026-09-25',
    `next_action` = 'Confirmar la acreditación de los cobros pendientes y actualizar disponibilidad bancaria.'
WHERE `id` = 66
  AND `area` = 'Financiero'
  AND `processing_status` = 'failed';
