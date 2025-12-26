-- =====================================================
-- Migration: last_seen_news_likes für Team/Admin
-- Ermöglicht Tracking wann User zuletzt Likes gesehen hat
-- =====================================================

-- 1. Spalte zu profiles hinzufügen
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_seen_news_likes TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.profiles.last_seen_news_likes IS 'Zeitpunkt wann Team/Admin zuletzt die Pinnwand-Likes angesehen hat';

-- 2. created_at zu news_likes hinzufügen (falls noch nicht vorhanden)
ALTER TABLE public.news_likes
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN public.news_likes.created_at IS 'Zeitpunkt wann der Like erstellt wurde';
