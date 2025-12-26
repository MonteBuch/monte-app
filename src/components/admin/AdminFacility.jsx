// src/components/admin/AdminFacility.jsx
import React, { useEffect, useState } from "react";
import { MapPin, Phone, Mail, Clock, Info, Loader2 } from "lucide-react";
import { supabase } from "../../api/supabaseClient";
import { FACILITY_ID } from "../../lib/constants";
import SaveButton from "../ui/SaveButton";

export default function AdminFacility() {
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    opening_hours: "",
    info_text: "",
  });

  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(true);

  /* -------------------------------------------------------------
     Daten aus Supabase laden
     ------------------------------------------------------------- */
  useEffect(() => {
    async function loadFacility() {
      try {
        const { data, error } = await supabase
          .from("facilities")
          .select("*")
          .eq("id", FACILITY_ID)
          .single();

        if (error) throw error;

        const loaded = {
          name: data?.name || "",
          address: data?.address || "",
          phone: data?.phone || "",
          email: data?.email || "",
          opening_hours: data?.opening_hours || "",
          info_text: data?.info_text || "",
        };

        setForm(loaded);
        setInitial(loaded);
      } catch (err) {
        console.error("Facility laden fehlgeschlagen:", err);
      } finally {
        setLoading(false);
      }
    }
    loadFacility();
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
     Speichern in Supabase
     ------------------------------------------------------------- */
  const save = async () => {
    try {
      const updated = {
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        opening_hours: form.opening_hours.trim(),
        info_text: form.info_text.trim(),
      };

      const { error } = await supabase
        .from("facilities")
        .update(updated)
        .eq("id", FACILITY_ID);

      if (error) throw error;

      // Neue Initialwerte setzen
      setInitial({ ...form, ...updated });
    } catch (err) {
      console.error("Facility speichern fehlgeschlagen:", err);
      alert("Fehler beim Speichern: " + err.message);
    }
  };

  /* -------------------------------------------------------------
     UI
     ------------------------------------------------------------- */
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-amber-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">Einrichtungsinformationen</h2>

      <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-sm p-5 space-y-5">

        {/* Name */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase flex items-center gap-1">
            <Info size={14} />
            Name der Einrichtung
          </label>
          <input
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full p-3 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-xl text-sm dark:text-stone-100"
            placeholder="z. B. Montessori Kinderhaus Berlin-Buch"
          />
        </div>

        {/* Adresse */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase flex items-center gap-1">
            <MapPin size={14} />
            Adresse
          </label>
          <textarea
            rows={2}
            value={form.address}
            onChange={(e) => handleChange("address", e.target.value)}
            className="w-full p-3 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-xl text-sm dark:text-stone-100 resize-none"
            placeholder="Straße, Hausnummer, PLZ, Ort"
          />
        </div>

        {/* Telefon */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase flex items-center gap-1">
            <Phone size={14} />
            Telefonnummer
          </label>
          <input
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            className="w-full p-3 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-xl text-sm dark:text-stone-100"
            placeholder="030 / 1234567"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase flex items-center gap-1">
            <Mail size={14} />
            E-Mailadresse
          </label>
          <input
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="w-full p-3 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-xl text-sm dark:text-stone-100"
            placeholder="kontakt@kita.de"
          />
        </div>

        {/* Öffnungszeiten */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase flex items-center gap-1">
            <Clock size={14} />
            Öffnungszeiten
          </label>
          <input
            value={form.opening_hours}
            onChange={(e) => handleChange("opening_hours", e.target.value)}
            className="w-full p-3 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-xl text-sm dark:text-stone-100"
            placeholder="Mo–Fr 07:00–17:00"
          />
        </div>

        {/* Info-Text */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase flex items-center gap-1">
            <Info size={14} />
            Hinweistext für Eltern
          </label>
          <textarea
            rows={4}
            value={form.info_text}
            onChange={(e) => handleChange("info_text", e.target.value)}
            className="w-full p-3 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-xl text-sm dark:text-stone-100 resize-none"
            placeholder="Wichtige Hinweise, z. B. zur Abwesenheitsmeldung"
          />
        </div>
      </div>

      {/* SAVE BUTTON */}
      <SaveButton isDirty={changed} onClick={save} label="Änderungen speichern" />
    </div>
  );
}