-- 024_cleanup_old_news.sql
-- Automatisches Löschen alter Pinnwandeinträge nach 6 Monaten

-- 1. Sicherstellen dass news_likes CASCADE hat
-- (Falls Tabelle existiert, Constraint hinzufügen/aktualisieren)
DO $$
BEGIN
  -- Prüfen ob news_likes existiert und ggf. CASCADE hinzufügen
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'news_likes') THEN
    -- Alte Constraint entfernen falls vorhanden
    ALTER TABLE public.news_likes
      DROP CONSTRAINT IF EXISTS news_likes_news_id_fkey;

    -- Neue Constraint mit CASCADE hinzufügen
    ALTER TABLE public.news_likes
      ADD CONSTRAINT news_likes_news_id_fkey
      FOREIGN KEY (news_id) REFERENCES public.news(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Cleanup-Funktion für alte News erstellen
CREATE OR REPLACE FUNCTION cleanup_old_news()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count INTEGER;
  retention_months INTEGER := 6; -- News älter als 6 Monate löschen
BEGIN
  -- Alte News löschen (news_likes und news_hidden werden via CASCADE mitgelöscht)
  WITH deleted AS (
    DELETE FROM public.news
    WHERE date < NOW() - (retention_months || ' months')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  -- Logging
  IF deleted_count > 0 THEN
    RAISE NOTICE 'cleanup_old_news: % Einträge gelöscht (älter als % Monate)', deleted_count, retention_months;
  END IF;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_news() IS 'Löscht Pinnwandeinträge älter als 6 Monate';

-- 3. pg_cron Job erstellen (läuft jeden Sonntag um 3:00 Uhr)
-- Prüfen ob pg_cron verfügbar ist
DO $$
BEGIN
  -- Job erstellen (falls pg_cron Extension aktiv)
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Alten Job entfernen falls vorhanden
    PERFORM cron.unschedule('cleanup-old-news');

    -- Neuen Job anlegen: Jeden Sonntag um 3:00 UTC
    PERFORM cron.schedule(
      'cleanup-old-news',
      '0 3 * * 0', -- Sonntag 3:00 UTC
      'SELECT cleanup_old_news()'
    );

    RAISE NOTICE 'pg_cron Job "cleanup-old-news" angelegt (Sonntags 3:00 UTC)';
  ELSE
    RAISE NOTICE 'pg_cron nicht verfügbar - manueller Cleanup erforderlich';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron Setup fehlgeschlagen: %', SQLERRM;
END $$;

-- 4. Manueller Aufruf möglich via: SELECT cleanup_old_news();
