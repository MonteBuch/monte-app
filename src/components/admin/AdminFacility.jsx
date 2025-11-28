// src/components/admin/AdminFacility.jsx
import React, { useEffect, useState } from "react";
import { MapPin, Phone, Mail, Clock, Info } from "lucide-react";
import { StorageService } from "../../lib/storage";
import SaveButton from "../ui/SaveButton";

export default function AdminFacility() {
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    opening: "",
    infoText: "",
  });

  const [initial, setInitial] = useState(null);

  /* -------------------------------------------------------------
     Daten aus dem Storage laden
     ------------------------------------------------------------- */
  useEffect(() => {
    const facility = StorageService.getFacilitySettings();

    const loaded = {
      name: facility?.name || "",
      address: facility?.address || "",
      phone: facility?.phone || "",
      email: facility?.email || "",
      opening: facility?.opening || "",
      infoText: facility?.infoText || "",
    };

    setForm(loaded);
    setInitial(loaded);
  }, []);

  const changed = JSON.stringify(form) !== JSON.stringify(initial);

  /* -------------------------------------------------------------
     Feldänderungen
     ------------------------------------------------------------- */
  const handleChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  /* -------------------------------------------------------------
     Speichern – wichtig: facility-Objekt vollständig schreiben
     ------------------------------------------------------------- */
  const save = async () => {
    const oldData = StorageService.getFacilitySettings() || {};

    const updated = {
      ...oldData,

      // Diese Felder machen die Einrichtungsinfo aus
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      opening: form.opening.trim(),
      infoText: form.infoText.trim(),
    };

    StorageService.saveFacilitySettings(updated);

    // Neue Initialwerte setzen
    setInitial(updated);
  };

  /* -------------------------------------------------------------
     UI
     ------------------------------------------------------------- */
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-stone-800">Einrichtungsinformationen</h2>

      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-5 space-y-5">

        {/* Name */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-500 uppercase flex items-center gap-1">
            <Info size={14} />
            Name der Einrichtung
          </label>
          <input
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-sm"
            placeholder="z. B. Montessori Kinderhaus Berlin-Buch"
          />
        </div>

        {/* Adresse */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-500 uppercase flex items-center gap-1">
            <MapPin size={14} />
            Adresse
          </label>
          <textarea
            rows={2}
            value={form.address}
            onChange={(e) => handleChange("address", e.target.value)}
            className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-sm resize-none"
            placeholder="Straße, Hausnummer, PLZ, Ort"
          />
        </div>

        {/* Telefon */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-500 uppercase flex items-center gap-1">
            <Phone size={14} />
            Telefonnummer
          </label>
          <input
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-sm"
            placeholder="030 / 1234567"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-500 uppercase flex items-center gap-1">
            <Mail size={14} />
            E-Mailadresse
          </label>
          <input
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-sm"
            placeholder="kontakt@kita.de"
          />
        </div>

        {/* Öffnungszeiten */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-500 uppercase flex items-center gap-1">
            <Clock size={14} />
            Öffnungszeiten
          </label>
          <input
            value={form.opening}
            onChange={(e) => handleChange("opening", e.target.value)}
            className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-sm"
            placeholder="Mo–Fr 07:00–17:00"
          />
        </div>

        {/* Info-Text */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-500 uppercase flex items-center gap-1">
            <Info size={14} />
            Hinweistext für Eltern
          </label>
          <textarea
            rows={4}
            value={form.infoText}
            onChange={(e) => handleChange("infoText", e.target.value)}
            className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-sm resize-none"
            placeholder="Wichtige Hinweise, z. B. zur Abwesenheitsmeldung"
          />
        </div>
      </div>

      {/* SAVE BUTTON */}
      <SaveButton isDirty={changed} onClick={save} label="Änderungen speichern" />
    </div>
  );
}