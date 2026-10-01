UPDATE `department_updates`
SET `source_report_id` = (
  SELECT `daily_report_uploads`.`id`
  FROM `daily_report_uploads`
  WHERE `daily_report_uploads`.`area` = `department_updates`.`area`
    AND `daily_report_uploads`.`responsible` = `department_updates`.`responsible`
    AND `daily_report_uploads`.`report_date` = `department_updates`.`report_date`
  ORDER BY `daily_report_uploads`.`id` DESC
  LIMIT 1
)
WHERE `source_report_id` IS NULL
  AND substr(`title`, 1, 25) = 'Informe diario cargado · '
  AND EXISTS (
    SELECT 1
    FROM `daily_report_uploads`
    WHERE `daily_report_uploads`.`area` = `department_updates`.`area`
      AND `daily_report_uploads`.`responsible` = `department_updates`.`responsible`
      AND `daily_report_uploads`.`report_date` = `department_updates`.`report_date`
  );
--> statement-breakpoint
UPDATE `department_updates`
SET `status` = 'Procesado automáticamente', `source_report_id` = 66
WHERE `area` = 'Financiero'
  AND `responsible` = 'Bryan Quinde'
  AND `report_date` = '2026-09-25'
  AND substr(`title`, 1, 25) = 'Informe diario cargado · ';
--> statement-breakpoint
INSERT INTO `department_updates` (
  `area`, `title`, `detail`, `metric`, `status`, `responsible`,
  `report_date`, `submitted_by`, `source_report_id`, `created_at`
)
SELECT
  `area`,
  'Informe diario cargado · ' || `original_name`,
  'Metas oficiales septiembre 2026: DAI USD 310.000 · Regulatorio USD 30.000 · Extras USD 20.000 · Total USD 360.000.' || char(10) || char(10) || `extracted_text`,
  '1 informe · ' || CAST((`size_bytes` + 512) / 1024 AS INTEGER) || ' KB',
  'Procesado automáticamente',
  `responsible`,
  `report_date`,
  `submitted_by`,
  `id`,
  `created_at`
FROM `daily_report_uploads`
WHERE `id` = 67
  AND NOT EXISTS (
    SELECT 1 FROM `department_updates` WHERE `source_report_id` = 67
  );
--> statement-breakpoint
INSERT INTO `report_processing_runs` (
  `report_id`, `parser_version`, `status`, `error`, `result_json`,
  `attempted_by`, `is_reprocess`, `created_at`
)
SELECT
  `id`,
  CASE WHEN `parser_version` = '' THEN 'owner-verified-v1' ELSE `parser_version` END,
  'processed',
  '',
  '{"decision":{"status":"processed","source":"conciliacion_verificada","screens_synced":true}}',
  'mario@mariocoka.com',
  1,
  COALESCE(`processed_at`, CURRENT_TIMESTAMP)
FROM `daily_report_uploads`
WHERE `id` IN (66, 67)
  AND NOT EXISTS (
    SELECT 1 FROM `report_processing_runs`
    WHERE `report_processing_runs`.`report_id` = `daily_report_uploads`.`id`
      AND `report_processing_runs`.`status` = 'processed'
  );
