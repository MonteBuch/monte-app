# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**Montessori Kinderhaus App "Monte"** - A React-based kindergarten management application for German-speaking Montessori daycare facilities. The app manages groups, children, news, food plans, and absence reporting with role-based access (parent/team/admin).

**Goal**: Production-ready app available as Web-App AND Native Mobile App (iOS/Android).

## Development Commands

```bash
npm run dev          # Start development server on port 5173
npm run build        # Build for production
npm run preview      # Preview production build
npm run cap:sync     # Build + sync to Android
npm run cap:open     # Open Android Studio
npm run cap:run      # Run on Android device/emulator
```

## TO-DO Liste

### 1. UAT (User Acceptance Testing) für Web/PWA Version
**Status:** Geplant für nächste Session

Vor dem Go-Live mit echten Nutzern muss ein umfassender UAT durchgeführt werden:
- Alle Features systematisch durchtesten
- Verschiedene Rollen testen (Eltern, Team, Admin)
- Mobile Browser testen (iOS Safari, Android Chrome)
- Edge Cases und Fehlerszenarien
- Performance unter Last

### 2. Resend Email-Verifikation abschließen
- DNS ist korrekt, Status bei Resend prüfen
- Test-Email senden nach Verifikation

### 3. Supabase Realtime aktivieren
- Dashboard → Database → Replication für relevante Tabellen

### 4. Connection-Timeout Issue (OFFEN - Beobachtung)
**Status:** Teilweise gelöst, weiter beobachten

Das Problem: Supabase-Requests hängen manchmal ohne Response (weder Erfolg noch Fehler).

**Was bereits implementiert wurde:**
- `connectionMonitor.js` - Proaktive Health-Checks alle 30 Sekunden
- `cache: 'no-store'` im Supabase fetch - Verhindert stale Connections
- Auto-Reload nach 10 Minuten Tab-Inaktivität
- Timeout-Wrapper für alle kritischen Requests (10 Sekunden)
- Banner-Anzeige bei Verbindungsproblemen

**Beobachtungen:**
- Problem tritt sporadisch auf, besonders nach Tab im Hintergrund
- Normale Nutzung funktioniert stabil (45+ Minuten ohne Probleme)
- Möglicherweise Netzwerk/Firewall/NAT-bezogen

**Offene Fragen:**
- Tritt es auch bei <5 Minuten Inaktivität auf?
- Auto-Timeout nach 10 Minuten als Feature? (wie viele Apps)
- Replikationstrigger identifizieren

### 5. Leaked Password Protection aktivieren (manuell)
- Supabase Dashboard → Authentication → Providers → Email
- "Leaked password protection" aktivieren

---

## Current State (as of 2025-12-26)

### Migration Status: 100% Complete

**Fully migrated to Supabase:**
- Auth (Supabase Auth with profiles table, fcm_token for push)
- Groups (groups table)
- Children (children table)
- News (news table)
- Group Lists/Polls (group_lists table)
- Absences (absences table)
- Meal Plans (meal_plans + meal_options tables)
- Notification Preferences (notification_preferences table)
- Facilities (facilities table with display_name, logo_url)
- Invite Links (invite_links table - replaces registration codes)

### Database Schema (Supabase)

```
facilities (1 row)
├── id, name, display_name, logo_url, address, phone, email, opening_hours, info_text
├── profiles (linked to auth.users)
│   ├── id, email, full_name, role, facility_id, primary_group, fcm_token
│   ├── children (user_id → profiles.id)
│   └── notification_preferences (user_id → profiles.id)
├── groups (facility_id → facilities.id)
│   ├── group_lists (group_id → groups.id)
│   └── children (group_id → groups.id)
├── news (facility_id, group_id optional, group_ids array)
├── absences (facility_id, child_id, group_id)
├── meal_plans (facility_id, week_key, day_key)
├── meal_options (facility_id, meal_type)
└── invite_links (facility_id, token, role, max_uses, used_count, expires_at)
```

### Storage Buckets
- `news-attachments` - Anhänge für News-Beiträge
- `facility-logos` - Logos für Einrichtungen (public)

## Architecture

### Tech Stack
- **Frontend**: React 18 with Vite, TailwindCSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions)
- **Mobile**: Capacitor (Android ready, iOS needs Mac)
- **Rich Text**: TipTap editor for news creation
- **Drag & Drop**: @hello-pangea/dnd for list reordering
- **Icons**: lucide-react
- **PWA**: vite-plugin-pwa + Workbox
- **Push**: Firebase Cloud Messaging (FCM) via Capacitor

### Component Structure
```
src/
├── App.jsx                    # Main app with FacilityProvider wrapper
├── api/
│   ├── supabaseClient.js      # Supabase client
│   ├── groupApi.js
│   ├── userApi.js
│   ├── listApi.js
│   ├── emailApi.js            # Email notifications via Edge Function
│   └── pushApi.js             # Push notifications via Edge Function (NEW)
├── context/
│   ├── GroupsContext.jsx      # Shared groups state with Realtime
│   └── FacilityContext.jsx    # Facility data (name, logo) with Realtime
├── components/
│   ├── auth/                  # Login, Registration, ForceReset
│   ├── news/                  # News feed and TipTap editor
│   ├── group/                 # Group area with lists/polls
│   ├── food/                  # Meal planning (week view)
│   ├── absence/               # Absence reporting (role-based views)
│   ├── profile/               # User settings, children management
│   ├── admin/                 # Admin tools including SystemTools
│   └── ui/                    # Reusable components (Toast, LoadingSpinner, InstallPrompt)
├── lib/
│   ├── constants.jsx          # FACILITY_ID
│   ├── biometricAuth.js       # Native biometric auth (NEW)
│   └── pushNotifications.js   # FCM registration (NEW)
└── utils/
    └── groupUtils.js          # Group colors, icons, styling
```

### User Roles & Permissions
| Feature | Parent | Team | Admin |
|---------|--------|------|-------|
| View News | Own groups | All | All |
| Create News | - | Yes | Yes |
| View Absences | Own children | All | All |
| Create Absences | Own children | - | - |
| Manage Absences | - | Yes | Yes |
| Edit Food Plan | - | Yes | Yes |
| Manage Lists | Vote/Accept | Full | Full |
| User Management | - | - | Yes |
| System Tools | - | - | Yes |

### Notification Preferences by Role
| Kategorie | Eltern | Team | Admin |
|-----------|--------|------|-------|
| news | Neue Mitteilung | - | Neue Mitteilung |
| lists | Neue Listen/Abstimmungen | Aktivität auf Listen | - |
| food | Neuer Speiseplan | - | - |
| absences | - | Neue Meldungen | Neue Meldungen |
| birthdays | - | Geburtstage in Gruppe | - |

## Production Roadmap

### Phase 1: Code Cleanup & Hardening (COMPLETED)
- [x] Remove unused legacy code
- [x] Add error boundaries
- [x] Toast notification system
- [x] Loading states (LoadingSpinner, SkeletonList)

### Phase 2: Security Improvements (COMPLETED)
- [x] One-time invite links (replaces registration codes)
- [x] Email verification
- [x] Password policies (8+ chars, uppercase, lowercase, number)
- [x] Password strength meter
- [x] Fixed RLS policies

### Phase 3: Realtime & Notifications (PARTIALLY COMPLETE)
- [x] Supabase Realtime subscriptions (News, Groups, GroupLists, Facilities)
- [x] Performance optimizations (parallel loading, shared contexts)
- [x] Email notification Edge Function (send-news-email)
- [x] Resend DNS-Records konfiguriert (SPF + DKIM)
- [x] **Resend Domain-Verifikation** - Erfolgreich verifiziert
- [ ] **Email-Versand debuggen** - Problem: Emails werden nicht versendet, Debug-Logging aktiv
- [ ] Realtime in Supabase Dashboard aktivieren (Database → Replication)

### Phase 4: PWA / Offline Support (COMPLETED)
- [x] Service Worker (vite-plugin-pwa + Workbox)
- [x] Cache strategies (NetworkFirst für API, CacheFirst für Assets)
- [x] Install prompt (Add to Home Screen)
- [x] Web App Manifest mit Icons

### Phase 4.5: System-Tools (COMPLETED)
- [x] Datenexport (Benutzer + Email-Listen als CSV)
- [x] App-Name (Branding) mit display_name
- [x] Logo-Upload mit Cropper
- [x] System-Reset mit Sicherheitsabfrage

### Phase 5: Native Mobile App (IN PROGRESS)
- [x] Capacitor Core installiert
- [x] Android Projekt erstellt (`android/` Ordner)
- [x] Biometrische Authentifizierung (Fingerabdruck)
- [x] Firebase Cloud Messaging (FCM) konfiguriert
- [x] Push Notifications Plugin (@capacitor/push-notifications)
- [x] FCM Token Registration in profiles.fcm_token
- [x] Edge Function: send-push-notification (FCM V1 API)
- [x] Push-Trigger für alle Kategorien implementiert:
  - news: Bei News-Erstellung → Eltern
  - lists: Bei Listen-Erstellung → Eltern der Gruppe
  - absences: Bei Abwesenheitsmeldung → Team der Gruppe
  - food: Bei Speiseplan-Speicherung → Alle Eltern
- [ ] iOS Projekt (benötigt Mac)
- [ ] **Play Store Submission** - Wartet auf Klärung mit Kita/Träger (DSGVO, Verantwortlichkeiten)

### Phase 6: Production Infrastructure (PARTIALLY COMPLETE)
- [ ] Supabase production project (separate from dev)
- [x] **Web-App Deployment auf Vercel** - https://app.montessori-kinderhaus-buch.de
- [x] Custom Domain konfiguriert (Strato CNAME → Vercel)
- [x] Supabase Redirect-URL für Production eingetragen
- [x] Facilities RLS Policy gefixt (öffentlich lesbar für Login-Seite)
- [ ] Monitoring/Error tracking (Sentry)
- [ ] Deployment documentation

### Recent Updates (2025-12-26)

**Dark Mode Komplett-Fix:**
- [x] Dark Mode für alle 43+ Komponenten implementiert
- [x] Profile, Admin, Group, Food, Absence, Calendar, Chat, News Komponenten
- [x] ThemeContext für bedingte Header-Farben (helle Pastellfarben nur im Light Mode)
- [x] Gruppenheader mit korrekter Text-Lesbarkeit in beiden Modi

**Video-Support für Pinnwand:**
- [x] Video-Upload mit korrektem contentType
- [x] 5 Minuten Timeout für große Videos
- [x] Video-Player in NewsFeed

**Email-Template:**
- [x] "Montessori Kinderhaus Buch" Header
- [x] "Du"-Form im Text
- [x] Auto-Cleanup Migration für alte News (>6 Monate)

### Updates (2025-12-24)

**Connection & PWA Stabilität:**
- [x] Connection Monitor mit proaktiven Health-Checks (30s Intervall)
- [x] Timeout-Wrapper für alle kritischen Supabase-Requests (10s)
- [x] Auto-Reload nach 10+ Minuten Tab-Inaktivität
- [x] `cache: 'no-store'` für frische TCP-Verbindungen
- [x] PWA Update-Banner (registerType: 'prompt')
- [x] UpdatePrompt Komponente für manuelle Updates
- [x] Verbesserte Cache-Strategie (StaleWhileRevalidate für Assets)

**Security & Performance Optimierungen:**
- [x] 5 Funktionen mit `SET search_path = ''` (Security DEFINER)
- [x] Alle RLS-Policies optimiert: `auth.uid()` → `(select auth.uid())`
- [x] Multiple permissive Policies konsolidiert
- [x] Absences-Tabelle: 10 Policies → 4 konsolidiert

### Updates (2025-12-20)

**Gruppen-Listen Verbesserungen:**
- [x] Leere Mitbringlisten mit Platzhalter erlaubt
- [x] Abstimmungen: Anonymität-Option bei Erstellung
- [x] Abstimmungen: Teilnahme-Statistik (X von Y abgestimmt)
- [x] Abstimmungen: Sichtbarkeit der Statistik für Eltern konfigurierbar
- [x] Abstimmungen: Voter-Namen für Team/Admin bei nicht-anonymen Polls
- [x] Drag & Drop für Listen-Reihenfolge (nur Team/Admin)
- [x] "Neue Liste anlegen" Button nach oben verschoben
- [x] Modal-basierte Listenerstellung mit verbesserter UX
- [x] Dienstlisten (duty) mit wiederkehrenden Datum-Einträgen

**Speiseplan Verbesserungen:**
- [x] Automatischer Wochenwechsel am Samstag (zeigt nächste Woche)
- [x] pg_cron Job für wöchentlichen Cleanup (Samstag 6:00 UTC)
- [x] 24-Stunden-Schutz: Kürzlich bearbeitete Pläne werden nicht gelöscht
- [x] Alte Einträge (>4 Wochen) werden automatisch bereinigt

**Datenbank-Erweiterungen:**
- [x] `group_lists.config` JSONB für Poll/Duty-Konfiguration
- [x] `group_lists.position` für Sortierung
- [x] `cleanup_old_meal_plans()` Funktion
- [x] `cleanup_expired_duty_items()` Funktion
- [x] pg_cron Extension aktiviert

**PWA vs. Native App Features:**
| Feature | PWA/Web | Native (Android) |
|---------|---------|------------------|
| Biometrik (Fingerabdruck) | - | Capacitor Plugin |
| Push Notifications | - | FCM via Capacitor |
| Offline-Caching | Workbox | Workbox |
| Install to Home Screen | Browser Prompt | Play Store |

### V2 Features (2025-12-26) ✅ ERLEDIGT

**Feature 1: Rückmeldung Abwesenheitsmeldung** ✅
- [x] Optionales Textfeld für alle Abwesenheitsmeldungen
- [x] Team/Admin kann auf Meldungen reagieren (staff_response, staff_response_by)
- [x] Eltern sehen Antwort in ihrer Meldung
- [x] Badge für unbestätigte Antworten (response_acknowledged)
- [x] Benachrichtigungsoption "absence_response" für Eltern

**Feature 2: Kinderakten** ✅
- [x] Neuer Menüpunkt "Kinderakten" im Admin-Bereich
- [x] Alle Kinder nach Gruppen sortiert
- [x] Modal mit: Name, Gruppe, Geburtstag, Notizen, Abholberechtigte
- [x] Team: nur Lesen, Admin: Lesen + Schreiben
- [x] authorized_pickups Feld in children Tabelle
- [x] Grüner "Abholberechtigte"-Badge wenn hinterlegt

**Feature 3: Terminübersicht** ✅
- [x] facility_events Tabelle für Jahresplanung
- [x] CalendarView für Eltern/Team als Tab
- [x] AdminCalendar für Admin im Admin-Menü
- [x] Kategorien: closed, team, parent_event, celebration, info, other
- [x] Kalendarische Darstellung mit Farbkodierung und Legende

**Feature 4: Gruppenchat** ✅
- [x] Realtime Chat nur für Eltern
- [x] Pro Gruppe ein Chat (basierend auf Kindern)
- [x] Opt-in/opt-out pro Gruppe
- [x] Antworten (Reply), Likes, Zeitstempel
- [x] Team/Admin haben KEINEN Zugriff
- [x] Badge für ungelesene Nachrichten
- [x] Benachrichtigungsoption "chat" für Eltern

**Feature 5: Tab-Management** ✅
- [x] "Mehr"-Menü als 5. Tab (Burger-Icon)
- [x] Slide-out Seitenmenü
- [x] user_tab_preferences Tabelle
- [x] Drag & Drop zum Anpassen der Tab-Reihenfolge
- [x] Speichern auf Benutzerebene
- [x] Badges auch im Mehr-Menü sichtbar

**Feature 6: Willkommensscreen** ✅
- [x] Welcome-Popup für neue User nach Registrierung
- [x] Durchschaltbare Slides mit Tipps
- [x] Rollenspezifische Inhalte (Eltern/Team/Admin)
- [x] has_seen_welcome Flag in profiles
- [x] Kann später erneut angezeigt werden (in Anpassungen)

**Feature 7: News → Pinnwand** ✅
- [x] Umbenennung von "News" zu "Pinnwand"
- [x] Modernisiertes Card-Design
- [x] Bildergalerie mit Grid-Layout
- [x] Lightbox für Vollbild-Ansicht
- [x] "Weiterlesen" für lange Texte
- [x] Like-Funktion für alle User (news_likes Tabelle)
- [x] Video-Support mit korrektem contentType

**Feature 8: Dark/Light Mode** ✅
- [x] theme_preference in profiles (light/dark/system)
- [x] ThemeContext für App-weite Theme-Verwaltung
- [x] Dark Mode CSS-Klassen (Tailwind) - alle Komponenten
- [x] "Anpassungen" Menüpunkt im Profil
- [x] Option zum erneuten Anzeigen des Willkommensscreens
- [x] Gruppenheader: Im Dark Mode dunkler Hintergrund statt heller Pastellfarben

**Feature 9: Gruppenbuch** 📋 ROADMAP
- Wartet auf Input von Kitaleitung

---

### NEUE THEMEN (aus UAT Feedback)

**Registrierung** ✅ ERLEDIGT
- [x] "Vollständiger Name" → "Anzeigename" umbenennen (mit Placeholder)
- [x] "Konto erstellen" Button: Nur Popup mit Hinweis "Einladungslink erforderlich"
- [x] Rollenauswahl-Sektion entfernt (Rolle wird nur durch Einladungslink bestimmt)

**Notification Screen Redesign**
- [ ] Neues Design: On/Off Checkboxen für Email und App (getrennt)
- [ ] "Beides" Option entfernen (Checkboxen können beide gewählt werden)
- [ ] Badge-Einstellung pro Bereich hinzufügen (Tab-Badge an/aus)
- [ ] Überlegen: Unterschiedliche Sets für Web vs. Native App?

**UI/UX Verbesserungen**
1. [ ] Email-Adresse im Profil ändern ermöglichen
2. [ ] "Einrichtungsinfos und Kontakt" aus Profil entfernen → "i" Icon im Header (rechts oben)
   - Bei Team/Admin: unter dem Rollen-Chip
   - Bei Eltern: an Stelle des Chips
3. [ ] Logout Button aus Profil entfernen → Icon im Header (rechts vom "i")
4. [ ] Auto-Timeout nach 10 Min? (bereits teilweise implementiert mit Connection Monitor)
5. [ ] Einladungs-Email aus Email-Verzeichnis generieren und senden (schönes Template mit "Monte Intro.jpg")
6. [ ] Passwort-Reset Email mit schönem Template (wie Registrierungs-Email)
7. [ ] Tab "Gruppe" → "Listen" umbenennen, Gruppenheader → "Listenbereich" (auch in Willkommensscreens)
8. [ ] Gruppenchat: Scrollbalken entfernen, standardmäßig aktiviert?, Medien?

---

**Neue Datenbank-Tabellen (V2):**
- `facility_events` - Jahresplanung/Termine
- `group_chat_messages` - Chat-Nachrichten
- `group_chat_participants` - Chat-Teilnahme
- `group_chat_likes` - Likes auf Chat-Nachrichten
- `user_tab_preferences` - Tab-Anordnung
- `news_likes` - Likes auf Pinnwand-Beiträge
- `news_hidden` - Ausgeblendete News pro User

**Neue Spalten (V2):**
- `profiles.has_seen_welcome` - Welcome-Screen gesehen
- `profiles.theme_preference` - Dark/Light Mode
- `absences.staff_response` - Team-Antwort auf Meldung
- `absences.staff_response_by` - Wer hat geantwortet
- `absences.staff_response_at` - Wann geantwortet
- `absences.response_acknowledged` - Eltern haben bestätigt
- `children.authorized_pickups` - Abholberechtigte

---

## FUTURE ROADMAP

### Gruppenbuch (Geplant)
**Status:** Wartet auf Input von Kitaleitung

Ein Feature zur Dokumentation des Gruppenalltags:
- Tägliche Einträge durch Team
- Fotos und Texte
- Nur für Team/Admin sichtbar (oder Eltern-Version?)
- Archivierung und Export

**Zu klären:**
- Wer soll Zugriff haben?
- Welche Inhalte werden dokumentiert?
- Datenschutz-Aspekte

---

## NÄCHSTE OFFENE SCHRITTE

### 0. NEUE THEMEN aus UAT Feedback (PRIORITÄT)
Basierend auf "V2 Features der Monte.pdf" - siehe "NEUE THEMEN" Sektion oben.

**Registrierung:** ✅ ERLEDIGT (2025-12-27)

**Notification Screen Redesign:** ❌ OFFEN
- On/Off Checkboxen für Email und App
- Badge-Einstellung pro Bereich

**UI/UX Verbesserungen:** ❌ OFFEN
1. Email-Adresse ändern im Profil
2. Info-Icon im Header (statt Menüpunkt im Profil)
3. Logout-Icon im Header
4. Einladungs-Email aus Email-Verzeichnis
5. Passwort-Reset Email Template
6. Tab "Gruppe" → "Listen" umbenennen
7. Gruppenchat: Scrollbalken, Medien?

### 1. Email-Versand debuggen (OFFEN)

**Status:** Resend Domain ist verifiziert, aber Emails werden nicht versendet.

**Bekannte Fakten:**
- Resend Domain-Verifikation: ✅ Erfolgreich
- Edge Function `send-news-email` ist deployed
- `FROM_EMAIL` Secret ist gesetzt

**Zu prüfen:**
1. Browser-Console öffnen (F12) beim News-Erstellen
2. Prüfen ob Empfänger gefunden werden
3. Edge Function Response auf Fehler prüfen
4. Supabase Edge Function Logs prüfen

### 2. Supabase Realtime aktivieren

Im Supabase Dashboard unter Database → Replication:
- `news` aktivieren
- `groups` aktivieren
- `group_lists` aktivieren
- `facilities` aktivieren
- `group_chat_messages` aktivieren (für Chat Realtime!)

### 3. Play Store Submission (WARTET)

**Status:** Wartet auf Gespräch mit Kita/Träger

**Zu klären:**
- DSGVO / Datenschutz (AVV mit Supabase)
- Wer ist App-Betreiber?
- Wer verwaltet Play Store Account?
- Privacy Policy URL

**Technisch bereit:**
- Google Developer Account erstellt
- Android Projekt konfiguriert
- Release-Build kann erstellt werden

---

## Edge Functions

### send-news-email
- Sendet Email-Benachrichtigungen für News
- Nutzt Resend API
- Secrets: `RESEND_API_KEY`, `FROM_EMAIL` (beide gesetzt)
- `verify_jwt: false` für Tests (temporär)

### send-push-notification
- Sendet Push-Benachrichtigungen via FCM V1 API
- Unterstützt Kategorien: news, lists, absences, food
- Respektiert notification_preferences
- Secrets: `FIREBASE_SERVICE_ACCOUNT` (JSON)
- `verify_jwt: false` für Tests

---

## Capacitor / Android

### Konfiguration
- `capacitor.config.json` - App-ID: `de.montessori.kinderhaus.monte`
- `android/` - Android Studio Projekt
- Firebase: `android/app/google-services.json` (manuell hinzugefügt)

### Wichtige Dateien
- `src/lib/biometricAuth.js` - Biometrische Authentifizierung
- `src/lib/pushNotifications.js` - FCM Token Registration
- `src/api/pushApi.js` - Push API Funktionen

### Android Studio
1. `npm run cap:open` oder Android Studio manuell öffnen
2. Projekt: `C:\Users\abcep\Desktop\Monte\android`
3. Run auf Emulator oder physischem Gerät

---

## Notes for Future Sessions

### Quick Start
1. Lies diese CLAUDE.md für Kontext
2. `npm run dev` zum Starten
3. Prüfe "NÄCHSTE OFFENE SCHRITTE" oben

### Production URLs
- **Web-App:** https://app.montessori-kinderhaus-buch.de
- **Vercel Dashboard:** https://vercel.com (monte-app-seven)
- **Supabase:** https://supabase.com/dashboard (izpjmvgtrwxjmucebfyy)
- **Resend:** https://resend.com/domains (montessori-kinderhaus-buch.de)

### GitHub Repository
- **URL:** https://github.com/MonteBuch/monte-app
- **Account:** MonteBuch (mkbblisten@gmail.com)
- Auto-Deploy bei Push zu main via Vercel

### Supabase MCP verfügbar
```javascript
// Migration anwenden
mcp__supabase__apply_migration({ name: "migration_name", query: "SQL" });

// SQL ausführen
mcp__supabase__execute_sql({ query: "SELECT * FROM facilities" });

// Edge Function deployen
mcp__supabase__deploy_edge_function({ name: "function-name", files: [...] });
```

### Constants
- `FACILITY_ID` in `src/lib/constants.jsx` - Hardcoded für Single-Tenant
- Firebase Project: `monte-app`

---

## Future: Multi-Tenancy Konzept

Falls der Träger die App für mehrere Einrichtungen nutzen möchte, ist folgende Architektur geplant:

### Übersicht

```
                    ┌─────────────────────────┐
                    │   Superuser Dashboard   │
                    │  (admin.monte-app.de)   │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│    Kita A     │     │    Kita B     │     │    Kita C     │
│ kita-a.app.de │     │ kita-b.app.de │     │ kita-c.app.de │
└───────────────┘     └───────────────┘     └───────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Supabase (shared)   │
                    └───────────────────────┘
```

### Ansatz: Shared Database mit RLS-Isolation

- Eine Supabase-Instanz für alle Einrichtungen
- `facility_id` existiert bereits in allen relevanten Tabellen
- Row-Level Security (RLS) isoliert Daten pro Einrichtung
- Kostengünstig und einfach zu warten

### Neues Rollen-Konzept

| Rolle | Scope | Berechtigungen |
|-------|-------|----------------|
| **superuser** | Global | Facilities erstellen/löschen, Admins zuweisen |
| **admin** | Eine Facility | Alles innerhalb der Facility |
| **team** | Eine Facility | News, Listen, Absences verwalten |
| **parent** | Eine Facility | Eigene Kinder verwalten |

### Tenant-Identifikation via Subdomain

```
kita-buch.monte-app.de      → facility_id für "Buch"
kita-mitte.monte-app.de     → facility_id für "Mitte"
admin.monte-app.de          → Superuser Dashboard
```

App erkennt Subdomain beim Laden und setzt `facility_id` dynamisch.

### Erforderliche Änderungen

**Datenbank:**
```sql
-- Superuser-Flag
ALTER TABLE profiles ADD COLUMN is_superuser BOOLEAN DEFAULT false;

-- Slug für Subdomain-Routing
ALTER TABLE facilities ADD COLUMN slug TEXT UNIQUE;
```

**RLS-Policies:** Erweitern um Superuser-Zugriff

**Frontend:**
- Subdomain-Detection statt hardcoded `FACILITY_ID`
- Superuser-Dashboard (neue Komponente oder separate App)

**Infrastructure:**
- Vercel: Wildcard-Domain `*.monte-app.de`
- Resend: Eine Domain oder pro Facility eigene
- Firebase: Ein Projekt, FCM-Topics pro Facility

### Aufwand-Einschätzung

| Komponente | Aufwand |
|------------|---------|
| DB-Schema erweitern | Klein |
| RLS-Policies anpassen | Mittel |
| Subdomain-Routing | Mittel |
| Superuser-Dashboard | Mittel-Groß |
| Wildcard-DNS/Vercel | Klein |

### Voraussetzung

Klärung mit Träger über:
- Kostenmodell pro Einrichtung
- Wer verwaltet Superuser-Zugang
- Datenschutz-Vereinbarungen pro Einrichtung

## Validation Strategy

**ALWAYS** work iteratively and validate your work after finishing each task by
following these steps in order:

### Quick Validation Steps (run for each task)

1. **Linting**: `npm run lint` - Check for syntax and style issues
2. **Type checking**: `npm run typecheck` - Ensure TypeScript correctness
3. **Specific tests**: Run only relevant Playwright tests for changed
   functionality. If you implemented new functionality, write tests for it and
   run them.

### Complete Validation (run only after all tasks are complete)

4. **Build**: `npm run build` - Full production build verification
5. **Complete test suite**: `npm run test` - All Playwright end-to-end tests

### Testing Guidelines

- **ALWAYS** write tests for new functionality - this is required for validation
- Write realistic e2e tests from a user perspective focusing on actual
  interactions
- **NEVER** write trivial tests that only assert component visibility
- Focus on meaningful user workflows and business logic
- If existing tests fail that are not part of the current task, **STOP** and ask
  for guidance
- Do NOT auto-fix unrelated test failures
- If tests fail without a clear reason, use playwright mcp to debug the test in
  a real browser
