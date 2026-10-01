INSERT INTO `billing_snapshots` (
  `report_date`, `dai_accumulated_cents`, `regulatory_accumulated_cents`,
  `extras_accumulated_cents`, `invoiced_today_cents`, `invoices_today`,
  `ready_to_invoice`, `completed_pending`, `blocked`, `responsible`, `source`,
  `note`, `submitted_by`, `source_report_id`
)
SELECT
  '2026-09-23', 24745444, 2189000, 932254, 730434, 30,
  NULL, NULL, NULL, 'Rebeca Sánchez', 'MACOBSA Rebeca Facturacion..pdf',
  'Corrección controlada del Dashboard del 23-sep-2026. Se conservan las cifras declaradas en el informe original; la producción diaria y la variación del acumulado requieren conciliación documental.',
  'mario@mariocoka.com', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM `billing_snapshots`
  WHERE `report_date` = '2026-09-23'
    AND `dai_accumulated_cents` = 24745444
    AND `regulatory_accumulated_cents` = 2189000
    AND `extras_accumulated_cents` = 932254
);
--> statement-breakpoint
INSERT INTO `regulatory_snapshots` (
  `report_date`, `billed_today_cents`, `billed_accumulated_cents`,
  `monthly_goal_cents`, `created_unbilled_today_cents`,
  `created_unbilled_accumulated_cents`, `licenses_today`, `licenses_accumulated`,
  `calculated_progress_basis_points`, `declared_progress_basis_points`,
  `prospects_declared`, `warnings_json`, `responsible`, `source`,
  `submitted_by`, `source_report_id`
)
SELECT
  '2026-09-23', 8000, 2189000, 3000000, 100000, 532000, 10, 183,
  7297, 7296, 0,
  '["No se detallaron prospectos regulatorios ni su próxima acción."]',
  'Lilibeth Terranova', 'REPORTE_LILIBETH_23092026.docx',
  'lilibeth@mariocoka.com', 0
WHERE NOT EXISTS (
  SELECT 1 FROM `regulatory_snapshots`
  WHERE `report_date` = '2026-09-23'
    AND `billed_accumulated_cents` = 2189000
    AND `licenses_accumulated` = 183
);
