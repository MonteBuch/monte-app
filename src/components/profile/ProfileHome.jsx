// src/components/profile/ProfileHome.jsx
import React, { useEffect, useState } from "react";
import { Users, Shield, Bell, Info, FolderOpen, Cake } from "lucide-react";
import ProfileSection from "./ProfileSection";
import { StorageService } from "../../lib/storage";
import { GROUPS } from "../../lib/constants";
import { getTodayBirthdaysForUser } from "../../lib/notificationTriggers";

export default function ProfileHome({ user, onNavigate }) {
  const isAdmin = user.role === "admin";
  const isTeam = user.role === "team";
  const isParent = user.role === "parent";

  const [birthdaysToday, setBirthdaysToday] = useState([]);
  const [showBirthdayBox, setShowBirthdayBox] = useState(false);

  useEffect(() => {
    if (!isTeam) {
      setBirthdaysToday([]);
      setShowBirthdayBox(false);
      return;
    }
    const todays = getTodayBirthdaysForUser(user);
    setBirthdaysToday(todays);

    const allPrefs = StorageService.get("notification_prefs") || {};
    const prefs = allPrefs[user.username] || {};
    const enabled = prefs.birthdays !== "off";
    setShowBirthdayBox(enabled && todays.length > 0);
  }, [isTeam, user]);

  const openAdminTab = () => {
    window.dispatchEvent(new CustomEvent("openAdminViaSettings"));
  };

  const groupById = (id) => GROUPS.find((g) => g.id === id);

  return (
    <div className="space-y-5">
      {/* Eltern: Kinderverwaltung */}
      {isParent && (
        <ProfileSection
          icon={<Users size={20} />}
          title="Meine Kinder"
          onClick={() => onNavigate("children")}
        />
      )}

      {/* Team: nur Stammgruppe */}
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
              return (
                <li
                  key={`${b.childName}-${idx}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-stone-700">{b.childName}</span>
                  {g && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white ${g.color}`}
                    >
                      {g.icon}
                      <span>{g.name}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}