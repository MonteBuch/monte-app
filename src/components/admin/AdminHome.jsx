// src/components/admin/AdminHome.jsx
import React from "react";
import {
  ShieldCheck,
  UsersRound,
  UserSquare,
  Cog,
  FolderOpen,
} from "lucide-react";
import ProfileSection from "../profile/ProfileSection";

export default function AdminHome({ onNavigate }) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-stone-800">
        Admin-Bereich
      </h2>

      {/* Benutzerverwaltung */}
      <ProfileSection
        icon={<UsersRound size={20} />}
        title="Benutzerverwaltung"
        subtitle="Eltern, Team & Admins verwalten"
        onClick={() => onNavigate("users")}
      />

      {/* Registrierungscodes */}
      <ProfileSection
        icon={<ShieldCheck size={20} />}
        title="Codes & Sicherheit"
        subtitle="Registrierungscodes bearbeiten"
        onClick={() => onNavigate("codes")}
      />

      {/* Einrichtungsinfos */}
      <ProfileSection
        icon={<Cog size={20} />}
        title="Einrichtungsinformationen"
        subtitle="Adresse, Kontakt, Öffnungszeiten"
        onClick={() => onNavigate("facility")}
      />

      {/* Gruppenverwaltung */}
      <ProfileSection
        icon={<UserSquare size={20} />}
        title="Gruppenverwaltung"
        subtitle="Gruppen & Strukturen verwalten"
        onClick={() => onNavigate("groups")}
      />

      {/* System-Tools – für zukünftige Erweiterungen */}
      <ProfileSection
        icon={<FolderOpen size={20} />}
        title="System-Tools"
        subtitle="Daten, Backups, Reset (bald)"
        onClick={() => alert('Wird in späterer Phase implementiert.')}
      />
    </div>
  );
}