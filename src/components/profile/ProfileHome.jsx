// src/components/profile/ProfileHome.jsx
import React, { useEffect, useState } from "react";
import {
  Users,
  Shield,
  Bell,
  Info,
  FolderOpen,
  Cake,
  LogOut,
  User as UserIcon,
  FileText,
  Palette,
} from "lucide-react";
import ProfileSection from "./ProfileSection";
import { supabase } from "../../api/supabaseClient";
import { fetchGroups } from "../../api/groupApi";
import { getTodayBirthdaysForUser } from "../../lib/notificationTriggers";
import { getGroupStyles, getGroupById } from "../../utils/groupUtils";

export default function ProfileHome({ user, onNavigate, onLogout }) {
  const isAdmin = user.role === "admin";
  const isTeam = user.role === "team";
  const isParent = user.role === "parent";

  const [birthdaysToday, setBirthdaysToday] = useState([]);
  const [showBirthdayBox, setShowBirthdayBox] = useState(false);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    // Gruppen laden für Geburtstags-Anzeige
    fetchGroups().then(setGroups).catch(console.error);
  }, []);

  useEffect(() => {
    if (!isTeam) {
      setBirthdaysToday([]);
      setShowBirthdayBox(false);
      return;
    }

    async function loadBirthdays() {
      try {
        const todays = await getTodayBirthdaysForUser(user);
        setBirthdaysToday(todays);

        // Benachrichtigungs-Einstellung prüfen
        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("preference")
          .eq("user_id", user.id)
          .eq("category", "birthdays")
          .single();

        const enabled = !prefs || prefs.preference !== "off";
        setShowBirthdayBox(enabled && todays.length > 0);
      } catch (err) {
        console.error("Geburtstage laden fehlgeschlagen:", err);
      }
    }
    loadBirthdays();
  }, [isTeam, user]);

  const openAdminTab = () => {
    window.dispatchEvent(new CustomEvent("openAdminViaSettings"));
  };

  const groupById = (id) => groups.find((g) => g.id === id);

  // Rollen-Label für Header
  const roleLabel = isAdmin ? "Leitung" : isTeam ? "Team" : "Eltern";

  // Kinder-Info für Eltern
  const childrenInfo = isParent && user.children?.length > 0
    ? `${user.children.length} ${user.children.length === 1 ? "Kind" : "Kinder"}`
    : null;

  // Gruppen der Kinder (für Eltern)
  const childGroups = isParent && user.children?.length > 0
    ? [...new Set(user.children.map((c) => c.group).filter(Boolean))]
    : [];

  // Initialen für Avatar
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="space-y-5">
      {/* === IDENTITY HEADER - UI Review Update === */}
      <div
        className="p-5 rounded-3xl shadow-sm border border-stone-200"
        style={{ backgroundColor: "#f8f9fa" }}
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-stone-400 text-white flex items-center justify-center text-xl font-bold shadow">
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-stone-800 truncate">
              {user.name || "Benutzer"}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {/* Rollen-Badge (nur für Team und Admin) */}
              {(isTeam || isAdmin) && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-800 text-white">
                  {roleLabel}
                </span>
              )}

              {/* Kinder-Info (nur Eltern) - FETT */}
              {childrenInfo && (
                <span className="text-xs text-stone-700 font-bold">{childrenInfo}</span>
              )}
            </div>

            {/* Gruppen-Chips (nur Eltern mit Kindern) */}
            {childGroups.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {childGroups.map((groupId) => {
                  const g = groupById(groupId);
                  const styles = g ? getGroupStyles(g) : null;
                  if (!styles) return null;
                  return (
                    <span
                      key={groupId}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles.chipClass} text-white`}
                    >
                      <styles.Icon size={10} />
                      {styles.name}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Stammgruppe (nur Team) */}
            {isTeam && user.primaryGroup && (
              <div className="flex flex-wrap gap-1 mt-2">
                {(() => {
                  const g = groupById(user.primaryGroup);
                  const styles = g ? getGroupStyles(g) : null;
                  if (!styles) return null;
                  return (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles.chipClass} text-white`}
                    >
                      <styles.Icon size={10} />
                      {styles.name}
                    </span>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* === END IDENTITY HEADER === */}

      {/* Team: Kinderakten (nur Ansicht) */}
      {isTeam && (
        <ProfileSection
          icon={<FileText size={20} />}
          title="Kinderakten"
          subtitle="Stammdaten aller Kinder (Ansicht)"
          onClick={() => onNavigate("children-records")}
        />
      )}

      {/* Eltern: Kinderverwaltung */}
      {isParent && (
        <ProfileSection
          icon={<Users size={20} />}
          title="Meine Kinder"
          onClick={() => onNavigate("children")}
        />
      )}

      {/* Team: Stammgruppe */}
      {isTeam && (
        <ProfileSection
          icon={<Users size={20} />}
          title="Stammgruppe"
          onClick={() => onNavigate("children")}
        />
      )}

      {/* Benachrichtigungen */}
      <ProfileSection
        icon={<Bell size={20} />}
        title="Benachrichtigungen"
        onClick={() => onNavigate("notifications")}
      />

      {/* Einrichtungsinfos */}
      <ProfileSection
        icon={<Info size={20} />}
        title="Einrichtungsinfo & Kontakt"
        onClick={() => onNavigate("facility")}
      />

      {/* Anpassungen (Theme, Willkommens-Tour) */}
      <ProfileSection
        icon={<Palette size={20} />}
        title="Anpassungen"
        subtitle="Design & Einführung"
        onClick={() => onNavigate("customize")}
      />

      {/* Sicherheit */}
      <ProfileSection
        icon={<Shield size={20} />}
        title="Sicherheit"
        onClick={() => onNavigate("security")}
      />

      {/* Admin-Funktionen → echten Admin-Tab öffnen */}
      {isAdmin && (
        <ProfileSection
          icon={<FolderOpen size={20} />}
          title="Admin-Funktionen"
          onClick={openAdminTab}
        />
      )}

      {/* Geburtstage heute (nur Team, nur wenn aktiviert und vorhanden) */}
      {isTeam && showBirthdayBox && (
        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Cake size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800">
                Geburtstage heute
              </p>
              <p className="text-[11px] text-stone-500">
                Kinder aus deiner Stammgruppe
              </p>
            </div>
          </div>

          <ul className="mt-2 space-y-1">
            {birthdaysToday.map((b, idx) => {
              const g = groupById(b.groupId);
              const styles = g ? getGroupStyles(g) : null;
              return (
                <li
                  key={`${b.childName}-${idx}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-stone-700">{b.childName}</span>
                  {styles && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles.chipClass}`}
                    >
                      <styles.Icon size={10} />
                      <span>{styles.name}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Logout-Button */}
      {onLogout && (
        <button
          onClick={onLogout}
          className="w-full bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 flex items-center justify-center gap-2 shadow"
        >
          <LogOut size={18} />
          Abmelden
        </button>
      )}
    </div>
  );
}