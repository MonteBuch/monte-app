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

---

## Current State (as of 2025-12-20)

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
- [ ] **Resend Domain-Verifikation** - DNS korrekt, wartet auf Resend-Verifikation (Status: Pending)
- [ ] **Email-Versand testen** - Nach Domain-Verifikation
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

### Recent Updates (2025-12-20)

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

---

## NÄCHSTE OFFENE SCHRITTE

### 0. UAT für Web/PWA Version (PRIORITÄT)
Siehe TO-DO Liste oben. Systematischer Test aller Features vor Go-Live.

### 1. Resend Domain-Verifikation (WARTET)

**Status:** DNS korrekt konfiguriert, wartet auf Resend-Verifikation (Status bei Resend: "Pending")

**DNS-Records bei Strato (korrekt eingetragen):**
```
TXT  resend._domainkey  (DKIM-Schlüssel von Resend)
TXT  (leer/root)        v=spf1 include:amazonses.com ~all
```

**MX-Record:** Nicht erforderlich für Verifikation (nur für Bounce-Handling)

**Nach Verifikation:**
- `FROM_EMAIL` Secret ist bereits gesetzt in Supabase Edge Function
- Test-Email senden um Funktion zu prüfen

### 2. Supabase Realtime aktivieren

Im Supabase Dashboard unter Database → Replication:
- `news` aktivieren
- `groups` aktivieren
- `group_lists` aktivieren
- `facilities` aktivieren

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
