DELETE FROM `plan_events`
WHERE `source_type` = 'TEMPLATE'
   OR (`source_type` = 'SYSTEM' AND `event_type` IN ('LEARNING', 'ASSESSMENT', 'RETEST', 'PROJECT_OUTPUT', 'REVIEW'));
