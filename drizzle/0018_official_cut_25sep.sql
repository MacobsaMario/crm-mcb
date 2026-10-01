-- Corte oficial confirmado por Dirección General para el 25 de septiembre de 2026.
-- Corrige la fecha del informe Comercial (el documento corresponde al 25/09)
-- y registra el corte de Facturación sin duplicarlo en futuros despliegues.

UPDATE `daily_report_uploads`
SET `report_date` = '2026-09-25',
    `commitment_date` = '2026-09-25'
WHERE `id` = 68
  AND `area` = 'Comercial'
  AND `responsible` = 'Carolina Herrera'
  AND `report_date` = '2026-09-27';
--> statement-breakpoint

UPDATE `commercial_snapshots`
SET `report_date` = '2026-09-25'
WHERE `source_report_id` = 68
  AND `responsible` = 'Carolina Herrera'
  AND `report_date` = '2026-09-27';
--> statement-breakpoint

UPDATE `department_updates`
SET `report_date` = '2026-09-25'
WHERE `source_report_id` = 68
  AND `area` = 'Comercial'
  AND `responsible` = 'Carolina Herrera'
  AND `report_date` = '2026-09-27';
--> statement-breakpoint

INSERT INTO `billing_snapshots` (
  `report_date`,
  `dai_accumulated_cents`,
  `regulatory_accumulated_cents`,
  `extras_accumulated_cents`,
  `invoiced_today_cents`,
  `invoices_today`,
  `ready_to_invoice`,
  `completed_pending`,
  `blocked`,
  `responsible`,
  `source`,
  `note`,
  `submitted_by`,
  `source_report_id`
)
SELECT
  '2026-09-25',
  26147684,
  2255000,
  992454,
  708140,
  29,
  NULL,
  NULL,
  NULL,
  'Rebeca Sánchez',
  'Corte oficial de Facturación confirmado por Mario Coka · 25/09/2026',
  'Total combinado USD 293.951,38; avance 81,65%; pendiente para la meta USD 66.048,62. Adicionales aumentan USD 602,00 frente al corte anterior y requieren conciliación.',
  'k2v5nc8k7s@privaterelay.appleid.com',
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM `billing_snapshots`
  WHERE `report_date` = '2026-09-25'
    AND `responsible` = 'Rebeca Sánchez'
);
