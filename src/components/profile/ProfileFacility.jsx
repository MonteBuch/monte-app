// src/components/profile/ProfileFacility.jsx
import React, { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Phone, Mail, Clock, Info, Loader2 } from "lucide-react";
import { supabase } from "../../api/supabaseClient";
import { FACILITY_ID } from "../../lib/constants";

export default function ProfileFacility({ onBack }) {
  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFacility() {
      try {
        const { data, error } = await supabase
          .from("facilities")
          .select("*")
          .eq("id", FACILITY_ID)
          .single();

        if (error) throw error;
        setFacility(data || {});
      } catch (err) {
        console.error("Facility laden fehlgeschlagen:", err);
        setFacility({});
      } finally {
        setLoading(false);
      }
    }
    loadFacility();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-amber-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header mit Zurück */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-stone-600 dark:text-stone-300 hover:text-stone-800 dark:hover:text-stone-100 active:scale-95"
      >
        <ArrowLeft size={20} />
        <span className="font-semibold text-sm">Zurück</span>
      </button>

      {/* Titel */}
      <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">
        Einrichtungsinformationen
      </h2>

      <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-5 space-y-5">

        {/* Name */}
        {facility.name && (
          <div className="flex items-start gap-3">
            <Info size={20} className="text-stone-500 dark:text-stone-400 mt-1" />
            <div>
              <p className="text-xs uppercase text-stone-500 dark:text-stone-400 font-semibold">
                Name der Einrichtung
              </p>
              <p className="text-sm text-stone-800 dark:text-stone-100 mt-1">{facility.name}</p>
            </div>
          </div>
        )}

        {/* Adresse */}
        {facility.address && (
          <div className="flex items-start gap-3">
            <MapPin size={20} className="text-stone-500 dark:text-stone-400 mt-1" />
            <div>
              <p className="text-xs uppercase text-stone-500 dark:text-stone-400 font-semibold">
                Adresse
              </p>
              <p className="text-sm text-stone-800 dark:text-stone-100 mt-1 whitespace-pre-wrap">
                {facility.address}
              </p>
            </div>
          </div>
        )}

        {/* Telefon */}
        {facility.phone && (
          <div className="flex items-start gap-3">
            <Phone size={20} className="text-stone-500 dark:text-stone-400 mt-1" />
            <div>
              <p className="text-xs uppercase text-stone-500 dark:text-stone-400 font-semibold">
                Telefonnummer
              </p>
              <p className="text-sm text-stone-800 dark:text-stone-100 mt-1">
                {facility.phone}
              </p>
            </div>
          </div>
        )}

        {/* Email */}
        {facility.email && (
          <div className="flex items-start gap-3">
            <Mail size={20} className="text-stone-500 dark:text-stone-400 mt-1" />
            <div>
              <p className="text-xs uppercase text-stone-500 dark:text-stone-400 font-semibold">
                E-Mailadresse
              </p>
              <p className="text-sm text-stone-800 dark:text-stone-100 mt-1 break-all">
                {facility.email}
              </p>
            </div>
          </div>
        )}

        {/* Öffnungszeiten */}
        {facility.opening_hours && (
          <div className="flex items-start gap-3">
            <Clock size={20} className="text-stone-500 dark:text-stone-400 mt-1" />
            <div>
              <p className="text-xs uppercase text-stone-500 dark:text-stone-400 font-semibold">
                Öffnungszeiten
              </p>
              <p className="text-sm text-stone-800 dark:text-stone-100 mt-1">
                {facility.opening_hours}
              </p>
            </div>
          </div>
        )}

        {/* Hinweistext */}
        {facility.info_text && (
          <div className="flex items-start gap-3">
            <Info size={20} className="text-stone-500 dark:text-stone-400 mt-1" />
            <div>
              <p className="text-xs uppercase text-stone-500 dark:text-stone-400 font-semibold">
                Hinweise
              </p>
              <p className="text-sm text-stone-800 dark:text-stone-100 mt-1 whitespace-pre-wrap">
                {facility.info_text}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}