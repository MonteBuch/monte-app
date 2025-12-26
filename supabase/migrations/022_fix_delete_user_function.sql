-- =====================================================
-- FIX: delete_user_completely Funktion
-- Ermöglicht Admins das vollständige Löschen von Usern
-- =====================================================

-- Alte Funktion droppen falls vorhanden
DROP FUNCTION IF EXISTS public.delete_user_completely(uuid);

-- Neue Funktion erstellen
CREATE OR REPLACE FUNCTION public.delete_user_completely(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_role text;
    v_caller_id uuid;
BEGIN
    -- Aktuellen User und dessen Rolle ermitteln
    v_caller_id := (SELECT auth.uid());

    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

    -- Nur Admins dürfen User löschen
    IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Nur Admins können Benutzer löschen.'
        );
    END IF;

    -- Selbst-Löschung verhindern
    IF p_user_id = v_caller_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Du kannst dich nicht selbst löschen.'
        );
    END IF;

    -- 1. Chat-Teilnahmen löschen
    DELETE FROM public.group_chat_participants WHERE user_id = p_user_id;

    -- 2. Chat-Likes löschen
    DELETE FROM public.group_chat_likes WHERE user_id = p_user_id;

    -- 3. Chat-Nachrichten löschen
    DELETE FROM public.group_chat_messages WHERE user_id = p_user_id;

    -- 4. News-Likes löschen
    DELETE FROM public.news_likes WHERE user_id = p_user_id;

    -- 5. Tab-Präferenzen löschen
    DELETE FROM public.user_tab_preferences WHERE user_id = p_user_id;

    -- 6. Notification Preferences löschen
    DELETE FROM public.notification_preferences WHERE user_id = p_user_id;

    -- 7. News Hidden löschen
    DELETE FROM public.news_hidden WHERE user_id = p_user_id;

    -- 8. Kinder löschen
    DELETE FROM public.children WHERE user_id = p_user_id;

    -- 9. Profil löschen
    DELETE FROM public.profiles WHERE id = p_user_id;

    -- 10. Auth User löschen (benötigt service_role, geht über admin API)
    -- Das muss über die Supabase Admin API gemacht werden
    -- Hier löschen wir nur die Daten in public schema

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Benutzer wurde gelöscht.'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Berechtigung für authentifizierte Benutzer
GRANT EXECUTE ON FUNCTION public.delete_user_completely(uuid) TO authenticated;
