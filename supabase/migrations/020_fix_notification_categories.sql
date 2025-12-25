-- 020_fix_notification_categories.sql
-- Füge fehlende Kategorien zum CHECK Constraint hinzu

-- Entferne den alten CHECK Constraint
ALTER TABLE public.notification_preferences
DROP CONSTRAINT IF EXISTS valid_category;

-- Füge neuen CHECK Constraint mit allen Kategorien hinzu
ALTER TABLE public.notification_preferences
ADD CONSTRAINT valid_category CHECK (
  category IN ('news', 'lists', 'food', 'absences', 'birthdays', 'absence_response', 'chat')
);
