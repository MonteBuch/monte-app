-- =====================================================
-- FIX: UPDATE Policy für profiles hinzufügen
-- Ermöglicht Benutzern, ihr eigenes Profil zu aktualisieren
-- (z.B. has_seen_welcome, theme_preference, etc.)
-- =====================================================

-- Erst alte Policy droppen falls vorhanden
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Neue UPDATE Policy erstellen
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admins können alle Profile updaten (für User-Verwaltung)
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
CREATE POLICY "Admin can update all profiles" ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = (SELECT auth.uid())
            AND profiles.role = 'admin'
        )
    );
